import { FunctionsHttpError } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../lib/types'
import { useOwner } from '../owner/useOwner'

export default function AdminPage() {
  const { refreshCustomers } = useOwner()
  const [users, setUsers] = useState<Profile[]>([])
  const [listError, setListError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Bump this to reload the user list (e.g. after creating an account).
  const [reloadKey, setReloadKey] = useState(0)

  // Admins see every profile thanks to the "read own or admin" RLS policy.
  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setListError(error.message)
        else setUsers(data)
      })
  }, [reloadKey])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    // invoke() sends the logged-in user's JWT automatically.
    const { error } = await supabase.functions.invoke('create-user', {
      body: { email, full_name: fullName, password, role },
    })

    if (error) {
      // For non-2xx responses, the function's JSON body is in error.context.
      const message =
        error instanceof FunctionsHttpError
          ? ((await error.context.json().catch(() => null))?.error ?? error.message)
          : error.message
      setFormError(message)
    } else {
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('customer')
      setReloadKey((k) => k + 1)
      refreshCustomers() // new customer shows up in "Acting as"
    }
    setSubmitting(false)
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Create account</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-gray-700">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Full name / company</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Password (min 8 characters)</span>
            <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="flex items-center gap-4 sm:col-span-2">
            <button type="submit" disabled={submitting} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create account'}
            </button>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
        </form>
      </section>

      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Accounts</h2>
        {listError && <p className="mt-2 text-sm text-red-600">{listError}</p>}
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.full_name ?? '-'}</td>
                <td className="py-2">{u.role}</td>
                <td className="py-2">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
