import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { OwnerContext, type OwnerState } from './useOwner'

const STORAGE_KEY = 'mini-ats:acting-as'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Decides whose jobs/candidates the app works with.
// Customers: always themselves. Admins: the customer picked in the header,
// remembered across reloads.
export function OwnerProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [customers, setCustomers] = useState<Profile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(readStored)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) console.error('Could not load customers:', error.message)
        else setCustomers(data)
      })
  }, [isAdmin, reloadKey])

  // Fall back to the first customer if nothing (valid) is selected.
  const selected = customers.find((c) => c.id === selectedId) ?? customers[0] ?? null
  const ownerId = isAdmin ? (selected?.id ?? null) : (profile?.id ?? null)

  const value: OwnerState = {
    ownerId,
    customers,
    setOwnerId: (id) => {
      setSelectedId(id)
      try {
        localStorage.setItem(STORAGE_KEY, id)
      } catch {
        // Storage blocked: the choice just won't survive a reload.
      }
    },
    refreshCustomers: () => setReloadKey((k) => k + 1),
  }

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
}
