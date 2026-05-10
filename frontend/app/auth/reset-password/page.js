'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')

  const [form, setForm] = useState({ new_password: '', new_password2: '' })
  const [showPw, setShowPw] = useState({ new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!uid || !token) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Invalid Reset Link</h2>
        <p className="text-gray-500 mb-4">This password reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" className="btn-primary py-2.5 px-6 text-sm inline-block">
          Request New Link
        </Link>
      </div>
    )
  }

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
      if (errors?.detail) {
        toast.error(errors.detail)
      } else if (errors?.new_password) {
        toast.error(errors.new_password[0])
      } else {
        toast.error('Failed to reset password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="glass-card p-8">
        {!success ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="text-ocean-600" size={24} />
              </div>
              <h1 className="text-2xl font-serif font-bold text-ocean-800">Set New Password</h1>
              <p className="text-gray-500 text-sm mt-1">Choose a strong password (min. 8 characters).</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    value={form.new_password}
                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                    className="input-field pr-10"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, new: !showPw.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={form.new_password2}
                    onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
                    className="input-field pr-10"
                    placeholder="Confirm new password"
                    required
                    minLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Reset Password
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="text-emerald-500 mx-auto mb-3" size={48} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Password Reset!</h2>
            <p className="text-gray-500 text-sm mb-4">
              Your password has been reset. Redirecting to login...
            </p>
            <Link href="/auth/login" className="text-ocean-600 hover:text-ocean-700 text-sm font-medium">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-white flex items-center justify-center px-4 pt-20 pb-12">
      <Suspense fallback={
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
