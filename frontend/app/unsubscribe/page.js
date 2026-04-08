'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

export default function UnsubscribePage() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing unsubscribe token.')
      return
    }
    api
      .post('/content/newsletter/unsubscribe/', { token })
      .then(() => {
        setStatus('success')
        setMessage("You've been unsubscribed. We're sorry to see you go.")
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.detail || 'Something went wrong.')
      })
  }, [token])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="font-serif text-2xl font-bold text-ocean-900 mb-4">
          {status === 'loading' && 'Unsubscribing...'}
          {status === 'success' && 'Unsubscribed'}
          {status === 'error' && 'Unable to unsubscribe'}
        </h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <Link href="/" className="btn-primary inline-block">
          Return Home
        </Link>
      </div>
    </div>
  )
}
