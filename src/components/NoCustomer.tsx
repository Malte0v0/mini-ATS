import { Link } from 'react-router'

// Shown to an admin when there is no customer to act as yet.
export default function NoCustomer() {
  return (
    <main className="mx-auto max-w-xl p-8 text-center text-gray-600">
      <p>There are no customer accounts yet.</p>
      <Link to="/admin" className="mt-2 inline-block text-gray-900 underline">
        Create one in Admin
      </Link>
    </main>
  )
}
