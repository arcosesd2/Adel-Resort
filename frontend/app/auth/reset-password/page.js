'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import SplitLayout from '@/components/auth/SplitLayout'
import Field from '@/components/forms/Field'
import PasswordStrength from '@/components/forms/PasswordStrength'

const RESET_IMAGE = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=85'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')

  const [form, setForm] = useState({ new_password: '', new_password2: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!uid || !token) {
    return (
      <div className="text-center">
        <h1 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-3 tracking-tight">Invalid reset link</h1>
        <p className="text-navy-500 dark:text-ivory-200 text-sm mb-6">This password reset link is invalid or has expired.</p>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center justify-center px-6 py-3 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors text-sm focus-ring"
        >
          Request new link
        </Link>
      </div>
    )
  }

  const passwordsMismatch = form.new_password2.length > 0 && form.new_password !== form.new_password2

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.new_password2) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password/', { uid, token, ...form })
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (err) {
      const errors = err.response?.data
      if (errors?.detail) toast.error(errors.detail)
      else if (errors?.new_password) toast.error(errors.new_password[0])
      else toast.error('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-brass-50 dark:bg-brass-800/40 border border-brass-200 dark:border-brass-700 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="text-brass-600 dark:text-brass-300" size={28} strokeWidth={1.75} />
        </div>
        <h1 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-3 tracking-tight">Password reset.</h1>
        <p className="text-navy-500 dark:text-ivory-200 text-sm mb-6 leading-relaxed">
          Your password has been reset. We're sending you back to sign in…
        </p>
        <Link
          href="/auth/login"
          className="text-brass-600 dark:text-brass-300 text-sm font-semibold hover:underline focus-ring rounded"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="w-12 h-12 bg-brass-50 dark:bg-brass-800/40 border border-brass-200 dark:border-brass-700 rounded-full flex items-center justify-center mb-5">
        <KeyRound className="text-brass-600 dark:text-brass-300" size={20} strokeWidth={1.75} />
      </div>
      <p className="eyebrow mb-3">New password</p>
      <h1 className="font-serif text-3xl md:text-4xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">
        Set a new password.
      </h1>
      <p className="text-navy-500 dark:text-ivory-200 text-sm mb-8">
        At least 10 characters. A mix of letters, numbers, and symbols is best.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Field
            label="New password"
            name="new_password"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            placeholder="Min. 10 characters"
            required
            minLength={10}
            autoComplete="new-password"
          />
          <PasswordStrength password={form.new_password} />
        </div>
        <Field
          label="Confirm password"
          name="new_password2"
          type="password"
          value={form.new_password2}
          onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
          placeholder="Repeat new password"
          required
          minLength={10}
          autoComplete="new-password"
          error={passwordsMismatch ? 'Passwords do not match' : undefined}
          success={!passwordsMismatch && form.new_password2.length > 0 && form.new_password === form.new_password2 ? true : undefined}
        />
        <button
          type="submit"
          disabled={loading || passwordsMismatch}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-ring text-sm tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Reset password
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <SplitLayout
      imageSrc={RESET_IMAGE}
      imageAlt="Quiet shoreline"
      eyebrow="Reset password"
      caption="A new key, and you're back."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brass-500" size={28} />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </SplitLayout>
  )
}
