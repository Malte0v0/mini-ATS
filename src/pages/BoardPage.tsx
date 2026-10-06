import { useEffect, useState, type DragEvent } from 'react'
import CandidateDrawer from '../components/CandidateDrawer'
import NoCustomer from '../components/NoCustomer'
import { supabase } from '../lib/supabase'
import { STAGES, type Candidate, type CandidateStage, type Job } from '../lib/types'
import { useOwner } from '../owner/useOwner'

// null = drawer closed, 'new' = adding, otherwise the candidate being edited
type DrawerState = null | 'new' | Candidate

export default function BoardPage() {
  const { ownerId } = useOwner()
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [jobFilter, setJobFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null)

  // Load jobs and candidates for the current owner in parallel.
  useEffect(() => {
    if (!ownerId) return
    Promise.all([
      supabase.from('jobs').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      supabase.from('candidates').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
    ]).then(([jobsRes, candidatesRes]) => {
      const err = jobsRes.error ?? candidatesRes.error
      if (err) {
        setError(err.message)
        return
      }
      setError(null)
      setJobs(jobsRes.data ?? [])
      setCandidates(candidatesRes.data ?? [])
    })
  }, [ownerId, reloadKey])

  // Filters are applied in the browser: a customer's candidate list is small,
  // and this keeps filtering instant.
  const jobTitle = new Map(jobs.map((j) => [j.id, j.title]))
  // If the selected job no longer exists (e.g. after switching customer), show all.
  const activeJobFilter = jobFilter === 'all' || jobTitle.has(jobFilter) ? jobFilter : 'all'
  const query = search.trim().toLowerCase()
  const visible = candidates.filter(
    (c) =>
      (activeJobFilter === 'all' || c.job_id === activeJobFilter) &&
      (!query || c.full_name.toLowerCase().includes(query)),
  )

  async function moveCandidate(id: string, stage: CandidateStage) {
    const current = candidates.find((c) => c.id === id)
    if (!current || current.stage === stage) return

    // Optimistic update: move the card right away, undo if the save fails.
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)))
    const { error } = await supabase.from('candidates').update({ stage }).eq('id', id)
    if (error) {
      setError(`Could not move ${current.full_name}: ${error.message}`)
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage: current.stage } : c)))
    }
  }

  function handleDrop(e: DragEvent, stage: CandidateStage) {
    e.preventDefault()
    setDragOverStage(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id) moveCandidate(id, stage)
  }

  if (!ownerId) return <NoCustomer />

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Candidates</h1>
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={activeJobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="all">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
              {j.status === 'closed' ? ' (closed)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => setDrawer('new')}
          disabled={jobs.length === 0}
          title={jobs.length === 0 ? 'Create a job first' : undefined}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          + Add candidate
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {jobs.length === 0 && <p className="mb-3 text-sm text-gray-500">Create a job on the Jobs page before adding candidates.</p>}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[960px] grid-cols-6 gap-3">
          {STAGES.map((stage) => {
            const cards = visible.filter((c) => c.stage === stage.id)
            return (
              <section
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault() // required, otherwise the browser won't allow a drop here
                  setDragOverStage(stage.id)
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`min-h-[60vh] rounded-lg p-2 transition-colors ${
                  dragOverStage === stage.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-100'
                }`}
              >
                <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {stage.label}
                  <span className="rounded bg-white px-1.5 py-0.5 text-gray-600">{cards.length}</span>
                </h2>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <article
                      key={c.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                      onClick={() => setDrawer(c)}
                      className="cursor-pointer rounded border border-gray-200 bg-white p-2 text-sm shadow-sm hover:border-gray-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-tight">{c.full_name}</span>
                        {c.ai_score !== null && <ScoreBadge score={c.ai_score} />}
                      </div>
                      {activeJobFilter === 'all' && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">{jobTitle.get(c.job_id)}</p>
                      )}
                      <div className="mt-1 flex gap-2 text-xs">
                        {c.linkedin_url && (
                          <a
                            href={c.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-700 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {c.cv_path && <span className="text-gray-500">CV</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {drawer !== null && (
        <CandidateDrawer
          // key: remount (fresh form state) when switching between candidates
          key={drawer === 'new' ? 'new' : drawer.id}
          candidate={drawer === 'new' ? null : drawer}
          jobs={jobs}
          ownerId={ownerId}
          defaultJobId={activeJobFilter === 'all' ? undefined : activeJobFilter}
          onClose={() => setDrawer(null)}
          onSaved={reload}
        />
      )}
    </main>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? 'bg-green-100 text-green-800' : score >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>AI {score}/10</span>
}
