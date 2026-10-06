import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

// Lets any logged-in user change their own password, e.g. to replace the one
// an admin set for them. No Edge Function needed: Supabase Auth lets a user
// update their own login directly.
export default function AccountPage() {
  const { profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSuccess(false)
    if (password !== confirmPassword) {
      setError('The passwords do not match')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setPassword('')
    setConfirmPassword('')
    setSuccess(true)
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

  return (
    <main className="mx-auto max-w-md space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-gray-600">
          {profile?.full_name ? `${profile.full_name} · ` : ''}
          {profile?.email}
        </p>
      </div>

      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-gray-700">New password (min 8 characters)</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Repeat new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">Password changed.</p>}
          <button type="submit" disabled={submitting} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
            {submitting ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </section>
    </main>
  )
}
