'use client'

import { useState } from 'react'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import api from '@/lib/api'

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
      // Always show success to not reveal if email exists
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-white flex items-center justify-center px-4 pt-20 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="text-ocean-600" size={24} />
                </div>
                <h1 className="text-2xl font-serif font-bold text-ocean-800">Forgot Password?</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Send Reset Link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="text-emerald-500 mx-auto mb-3" size={48} />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-4">
                If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox and spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-ocean-600 hover:text-ocean-700 text-sm font-medium"
              >
                Try another email
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-ocean-600 hover:text-ocean-700 font-medium flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
