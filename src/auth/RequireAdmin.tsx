import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './useAuth'

// Like RequireAuth, but only lets admins through. UX only: RLS protects the data.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) return <p className="p-8 text-gray-500">Loading...</p>
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}
