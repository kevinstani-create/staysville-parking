import Link from 'next/link'

type Props = {
  searchParams?: { session_id?: string }
}

/**
 * Simple server component. No unused imports, no client code needed.
 */
export default function SuccessPage({ searchParams }: Props) {
  const sessionId = searchParams?.session_id

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900">Payment successful 🎉</h1>
          <p className="mt-3 text-gray-700">
            Thank you! Your parking booking has been received and the payment was completed.
          </p>

          {sessionId ? (
            <p className="mt-2 text-sm text-gray-500">
              Stripe session: <span className="font-mono">{sessionId}</span>
            </p>
          ) : null}

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
