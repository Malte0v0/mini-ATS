import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { STAGES, type Candidate, type CandidateStage, type Job } from '../lib/types'

type Props = {
  candidate: Candidate | null // null = create a new candidate
  jobs: Job[]
  ownerId: string
  defaultJobId?: string
  onClose: () => void
  onSaved: () => void
}

const MAX_CV_BYTES = 5 * 1024 * 1024

// Side panel for creating, editing and deleting a candidate, incl. CV upload.
export default function CandidateDrawer({ candidate, jobs, ownerId, defaultJobId, onClose, onSaved }: Props) {
  const isNew = candidate === null

  const [fullName, setFullName] = useState(candidate?.full_name ?? '')
  const [email, setEmail] = useState(candidate?.email ?? '')
  const [phone, setPhone] = useState(candidate?.phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(candidate?.linkedin_url ?? '')
  const [jobId, setJobId] = useState(candidate?.job_id ?? defaultJobId ?? '')
  const [stage, setStage] = useState<CandidateStage>(candidate?.stage ?? 'applied')
  const [notes, setNotes] = useState(candidate?.notes ?? '')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Open jobs, plus the candidate's current job even if it has been closed.
  const selectableJobs = jobs.filter((j) => j.status === 'open' || j.id === candidate?.job_id)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (cvFile && cvFile.size > MAX_CV_BYTES) {
      setError('CV must be at most 5 MB')
      return
    }
    setBusy(true)
    setError(null)

    const fields = {
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      job_id: jobId,
      stage,
      notes: notes.trim() || null,
    }

    // 1. Save the candidate row (we need its id for the CV path).
    const { data: saved, error: saveError } = isNew
      ? await supabase.from('candidates').insert({ ...fields, owner_id: ownerId }).select().single()
      : await supabase.from('candidates').update(fields).eq('id', candidate.id).select().single()

    if (saveError) {
      setError(saveError.message)
      setBusy(false)
      return
    }

    // 2. Upload the CV, if one was picked. The path starts with the owner id,
    //    which is what the storage policies check.
    if (cvFile) {
      const path = `${saved.owner_id}/${saved.id}/cv.pdf`
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(path, cvFile, { upsert: true, contentType: 'application/pdf' })
      if (uploadError) {
        setError(`Candidate saved, but the CV upload failed: ${uploadError.message}`)
        setBusy(false)
        onSaved()
        return
      }
      if (saved.cv_path !== path) {
        await supabase.from('candidates').update({ cv_path: path }).eq('id', saved.id)
      }
    }

    setBusy(false)
    onSaved()
    onClose()
  }

  async function openCv() {
    if (!candidate?.cv_path) return
    // The bucket is private, so we ask for a link that works for 60 seconds.
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(candidate.cv_path, 60)
    if (error) setError(error.message)
    else window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleDelete() {
    if (!candidate || !confirm(`Delete ${candidate.full_name}? This cannot be undone.`)) return
    setBusy(true)
    if (candidate.cv_path) await supabase.storage.from('cvs').remove([candidate.cv_path])
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.id)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
    onClose()
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm'

  return (
    <div className="fixed inset-0 z-10 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isNew ? 'Add candidate' : candidate.full_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-700">Full name *</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Job *</span>
            <select required value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputClass}>
              <option value="" disabled>
                Choose a job
              </option>
              {selectableJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.status === 'closed' ? ' (closed)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Stage</span>
            <select value={stage} onChange={(e) => setStage(e.target.value as CandidateStage)} className={inputClass}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-gray-700">LinkedIn URL</span>
            <input
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Notes</span>
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">
              CV (PDF, max 5 MB){candidate?.cv_path ? ', uploading replaces the current one' : ''}
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          {candidate?.cv_path && (
            <button type="button" onClick={openCv} className="text-sm text-blue-700 hover:underline">
              Open current CV
            </button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={busy} className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? 'Saving...' : isNew ? 'Add candidate' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
            {!isNew && (
              <button type="button" onClick={handleDelete} disabled={busy} className="ml-auto text-sm text-red-600 hover:underline">
                Delete
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  )
}
