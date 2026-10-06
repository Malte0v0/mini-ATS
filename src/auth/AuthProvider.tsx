import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { AuthContext, type AuthState } from './useAuth'

// The result of a profile fetch, remembered together with the user it was for.
type LoadedProfile = { userId: string; profile: Profile | null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)

  // 1. Session: read the stored one on startup, then follow login/logout events.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Don't call other supabase methods in here (Supabase docs warn it can
      // deadlock). Just store the session; the effect below reacts to it.
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2. Profile: whenever the logged-in user changes, load their profiles row.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return

    // If the user changes before this request finishes, ignore its result.
    let cancelled = false
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        // RLS returns only your own row, so an error here means the user has
        // no profile row. Treat them as having no role.
        if (error) console.error('Could not load profile:', error.message)
        setLoaded({ userId, profile: data })
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Derived during render instead of stored: we're loading whenever someone is
  // logged in but we don't yet have a fetch result for THAT user. This has no
  // gap between "session set" and "fetch started" where loading is false.
  const profileLoading = !!userId && loaded?.userId !== userId
  const profile = userId && loaded?.userId === userId ? loaded.profile : null

  const value: AuthState = {
    session,
    profile,
    loading: sessionLoading || profileLoading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
