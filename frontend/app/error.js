'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-6xl font-bold text-red-500 mb-4">Oops</h1>
        <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3">Something went wrong</h2>
        <p className="text-gray-500 mb-8">
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary py-2.5 px-6 text-sm">
            Try Again
          </button>
          <Link href="/" className="btn-outline py-2.5 px-6 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
