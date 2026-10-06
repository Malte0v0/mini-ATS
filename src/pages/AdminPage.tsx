import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { invokeFunction } from '../lib/functions'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../lib/types'
import { useOwner } from '../owner/useOwner'

export default function AdminPage() {
  const { profile: me } = useAuth()
  const { refreshCustomers } = useOwner()
  const [users, setUsers] = useState<Profile[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listMessage, setListMessage] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Which row has the "new password" field open, and its value.
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [rowBusy, setRowBusy] = useState(false)

  // Bump this to reload the user list (e.g. after creating an account).
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => {
    setReloadKey((k) => k + 1)
    refreshCustomers() // keep the "Acting as" picker in sync
  }

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

    const { error } = await invokeFunction('create-user', { email, full_name: fullName, password, role })

    if (error) {
      setFormError(error)
    } else {
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('customer')
      reload()
    }
    setSubmitting(false)
  }

  async function resetPassword(user: Profile) {
    setRowBusy(true)
    setListError(null)
    const { error } = await invokeFunction('manage-user', {
      action: 'reset_password',
      user_id: user.id,
      password: newPassword,
    })
    setRowBusy(false)
    if (error) {
      setListError(error)
      return
    }
    setResettingId(null)
    setNewPassword('')
    setListMessage(`New password set for ${user.email}. Share it with them securely.`)
  }

  async function deleteUser(user: Profile) {
    const warning =
      user.role === 'customer'
        ? `Delete ${user.email}? This also deletes ALL their jobs, candidates and CVs. This cannot be undone.`
        : `Delete admin ${user.email}? This cannot be undone.`
    if (!confirm(warning)) return

    setRowBusy(true)
    setListError(null)
    const { error } = await invokeFunction('manage-user', { action: 'delete', user_id: user.id })
    setRowBusy(false)
    if (error) {
      setListError(error)
      return
    }
    setListMessage(`${user.email} was deleted.`)
    reload()
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
        {listMessage && <p className="mt-2 text-sm text-green-700">{listMessage}</p>}
        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-2">Email</th>
                <th className="py-2">Name</th>
                <th className="py-2">Role</th>
                <th className="py-2">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t align-top">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.full_name ?? '-'}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-right">
                    {resettingId === u.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          resetPassword(u)
                        }}
                        className="flex justify-end gap-2"
                      >
                        <input
                          type="text"
                          required
                          minLength={8}
                          autoFocus
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-36 rounded border border-gray-300 px-2 py-1"
                        />
                        <button type="submit" disabled={rowBusy} className="text-gray-900 hover:underline disabled:opacity-50">
                          Save
                        </button>
                        <button type="button" onClick={() => setResettingId(null)} className="text-gray-500 hover:underline">
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex justify-end gap-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setResettingId(u.id)
                            setNewPassword('')
                            setListMessage(null)
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Reset password
                        </button>
                        {u.id !== me?.id && (
                          <button onClick={() => deleteUser(u)} disabled={rowBusy} className="text-red-600 hover:underline disabled:opacity-50">
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
