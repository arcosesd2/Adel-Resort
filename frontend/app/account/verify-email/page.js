'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import useAuthStore from '@/store/authStore'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const { fetchMe } = useAuthStore()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const uid = searchParams.get('uid')
    const token = searchParams.get('token')

    if (!uid || !token) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    api.post('/auth/verify-email/', { uid, token })
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified successfully!')
        fetchMe()
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.')
      })
  }, [searchParams, fetchMe])

  return (
    <div className="glass-card p-8 max-w-md mx-auto text-center">
      {status === 'loading' && (
        <div className="py-8">
          <Loader2 className="animate-spin text-ocean-500 mx-auto mb-3" size={40} />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      )}

      {status === 'success' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8">
          <CheckCircle className="text-emerald-500 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Email Verified!</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <Link href="/account" className="btn-primary py-2.5 px-6 text-sm inline-block">
            Back to Profile
          </Link>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8">
          <XCircle className="text-red-500 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <Link href="/account" className="btn-primary py-2.5 px-6 text-sm inline-block">
            Back to Profile
          </Link>
        </motion.div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="glass-card p-8 max-w-md mx-auto text-center">
        <Loader2 className="animate-spin text-ocean-500 mx-auto mb-3" size={40} />
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
