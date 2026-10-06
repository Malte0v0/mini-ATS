import { createContext, useContext } from 'react'
import type { Profile } from '../lib/types'

export type OwnerState = {
  // Whose data the app is showing and creating: the customer's own id, or for
  // admins the customer they picked in "Acting as". null = admin with no customers yet.
  ownerId: string | null
  // Admin only: all customers, for the picker.
  customers: Profile[]
  setOwnerId: (id: string) => void
  refreshCustomers: () => void
}

export const OwnerContext = createContext<OwnerState | null>(null)

export function useOwner() {
  const ctx = useContext(OwnerContext)
  if (!ctx) throw new Error('useOwner must be used inside <OwnerProvider>')
  return ctx
}
