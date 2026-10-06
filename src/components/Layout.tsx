import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { OwnerProvider } from '../owner/OwnerProvider'
import { useOwner } from '../owner/useOwner'

// Shell for all logged-in pages: top bar + the current page below it.
export default function Layout() {
  return (
    <OwnerProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Outlet />
      </div>
    </OwnerProvider>
  )
}

function Header() {
  const { profile, signOut } = useAuth()
  const { ownerId, customers, setOwnerId } = useOwner()
  const isAdmin = profile?.role === 'admin'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900'}`

  return (
    <header className="flex flex-wrap items-center gap-4 border-b bg-white px-4 py-3">
      <span className="font-semibold">mini-ATS</span>
      <NavLink to="/" end className={linkClass}>Candidates</NavLink>
      <NavLink to="/jobs" className={linkClass}>Jobs</NavLink>
      {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}

      {isAdmin && (
        <label className="flex items-center gap-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">
          Acting as
          <select
            value={ownerId ?? ''}
            onChange={(e) => setOwnerId(e.target.value)}
            className="rounded border border-amber-200 bg-white px-2 py-0.5"
          >
            {customers.length === 0 && <option value="">No customers yet</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || c.email}
              </option>
            ))}
          </select>
        </label>
      )}

      <NavLink to="/account" className={(state) => `ml-auto ${linkClass(state)}`} title="Account settings">
        {profile?.email}
      </NavLink>
      <button onClick={signOut} className="text-sm text-gray-600 hover:text-gray-900">
        Sign out
      </button>
    </header>
  )
}
