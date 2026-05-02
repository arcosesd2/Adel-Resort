'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import SplitLayout from '@/components/auth/SplitLayout'
import Field from '@/components/forms/Field'

const FORGOT_IMAGE = 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1600&q=85'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password/', { email })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SplitLayout
      imageSrc={FORGOT_IMAGE}
      imageAlt="Calm shoreline"
      eyebrow="Account recovery"
      caption="Locked out? It happens. Here's the way back."
    >
      {!sent ? (
        <>
          <p className="eyebrow mb-3">Reset password</p>
          <h1 className="font-serif text-3xl md:text-4xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">
            Forgot password?
          </h1>
          <p className="text-navy-500 dark:text-ivory-200 text-sm mb-8">
            Enter the email on your account and we'll send a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-60 focus-ring text-sm tracking-wide"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              Send reset link
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="w-14 h-14 bg-brass-50 dark:bg-brass-800/40 border border-brass-200 dark:border-brass-700 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="text-brass-600 dark:text-brass-300" size={28} strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-3 tracking-tight">Check your email</h1>
          <p className="text-navy-500 dark:text-ivory-200 text-sm mb-6 leading-relaxed max-w-sm mx-auto">
            If an account with that email exists, we've sent a password reset link. Check your inbox — and the spam folder, just in case.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-brass-600 dark:text-brass-300 text-sm font-semibold hover:underline focus-ring rounded"
          >
            Try another email
          </button>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-ivory-300 dark:border-navy-700">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to sign in
        </Link>
      </div>
    </SplitLayout>
  )
}
