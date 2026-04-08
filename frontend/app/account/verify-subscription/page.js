'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

function VerifySubscriptionContent() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing confirmation token.')
      return
    }
    api
      .post('/content/newsletter/confirm/', { token })
      .then((res) => {
        setStatus('success')
        setMessage(res.data.detail || 'Subscription confirmed!')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.detail || 'Could not confirm subscription.')
      })
  }, [token])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 pt-24">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto text-ocean-500 animate-spin mb-4" size={48} />
            <h1 className="font-serif text-2xl font-bold text-ocean-900 mb-2">Confirming...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h1 className="font-serif text-2xl font-bold text-ocean-900 mb-2">You're all set!</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link href="/" className="btn-primary inline-block">Return Home</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h1 className="font-serif text-2xl font-bold text-ocean-900 mb-2">Confirmation failed</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link href="/" className="btn-primary inline-block">Return Home</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifySubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center px-4 pt-24">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Loader2 className="mx-auto text-ocean-500 animate-spin mb-4" size={48} />
          <h1 className="font-serif text-2xl font-bold text-ocean-900 mb-2">Confirming...</h1>
        </div>
      </div>
    }>
      <VerifySubscriptionContent />
    </Suspense>
  )
}
