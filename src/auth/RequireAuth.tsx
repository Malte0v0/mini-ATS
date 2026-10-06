import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './useAuth'

// Wrap a route with this to send logged-out users to /login.
// This is UX only: RLS is what actually protects the data.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p className="p-8 text-gray-500">Loading...</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}
