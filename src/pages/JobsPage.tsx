import { useEffect, useState } from 'react'
import JobForm, { type JobFormValues } from '../components/JobForm'
import NoCustomer from '../components/NoCustomer'
import { supabase } from '../lib/supabase'
import { useOwner } from '../owner/useOwner'
import type { Job } from '../lib/types'

// A job plus how many candidates it has. PostgREST can count related rows
// in the same request: select('*, candidates(count)').
type JobWithCount = Job & { candidates: { count: number }[] }

export default function JobsPage() {
  const { ownerId } = useOwner()
  const [jobs, setJobs] = useState<JobWithCount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  // For customers RLS already limits this to their own jobs; the owner filter
  // is what scopes an admin's view to the customer they're acting as.
  useEffect(() => {
    if (!ownerId) return
    supabase
      .from('jobs')
      .select('*, candidates(count)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setJobs(data)
      })
  }, [ownerId, reloadKey])

  async function createJob(values: JobFormValues) {
    if (!ownerId) return 'No customer selected'
    const { error } = await supabase.from('jobs').insert({
      owner_id: ownerId,
      title: values.title,
      description: values.description || null,
    })
    if (!error) reload()
    return error?.message ?? null
  }

  async function updateJob(id: string, values: Partial<Job>) {
    const { error } = await supabase.from('jobs').update(values).eq('id', id)
    if (error) setError(error.message)
    else reload()
    return error?.message ?? null
  }

  if (!ownerId) return <NoCustomer />

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">Jobs</h1>

      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">New job</h2>
        <JobForm submitLabel="Create job" onSubmit={createJob} />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3">
        {jobs.length === 0 && <p className="text-gray-500">No jobs yet.</p>}
        {jobs.map((job) => (
          <article key={job.id} className="rounded-lg bg-white p-4 shadow">
            {editingId === job.id ? (
              <JobForm
                initial={{ title: job.title, description: job.description ?? '' }}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={async (values) => {
                  const err = await updateJob(job.id, {
                    title: values.title,
                    description: values.description || null,
                  })
                  if (!err) setEditingId(null)
                  return err
                }}
              />
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{job.title}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {job.candidates[0]?.count ?? 0} candidates · created {new Date(job.created_at).toLocaleDateString()}
                  </p>
                  {job.description && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{job.description}</p>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setEditingId(job.id)} className="text-gray-600 hover:text-gray-900">
                    Edit
                  </button>
                  <button
                    onClick={() => updateJob(job.id, { status: job.status === 'open' ? 'closed' : 'open' })}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {job.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  )
}
