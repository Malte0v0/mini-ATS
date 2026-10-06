import { useEffect, useState } from 'react'

// Temporary page for chunk 0: proves the app can reach Supabase.
export default function HomePage() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((res) => setStatus(res.ok ? 'Connected to Supabase' : `Error: HTTP ${res.status}`))
      .catch((err) => setStatus(`Error: ${err.message}`))
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">mini-ATS</h1>
      <p className="mt-2 text-gray-600">{status}</p>
    </main>
  )
}
