import { useState, type FormEvent } from 'react'

export type JobFormValues = { title: string; description: string }

type Props = {
  initial?: JobFormValues
  submitLabel: string
  onSubmit: (values: JobFormValues) => Promise<string | null> // returns an error message, or null on success
  onCancel?: () => void
}

// Used both for creating a new job and editing an existing one.
export default function JobForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const err = await onSubmit({ title: title.trim(), description: description.trim() })
    setError(err)
    setSubmitting(false)
    if (!err && !initial) {
      setTitle('')
      setDescription('')
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-700">Title</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Description</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="Responsibilities, requirements, ... (also used by the AI CV assessment)"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  )
}
