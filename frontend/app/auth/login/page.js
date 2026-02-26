'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Waves } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const { login } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      document.cookie = `access_token=${data.access}; path=/; max-age=3600; SameSite=Lax`
      toast.success('Welcome back!')
      router.push(redirect)
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 font-serif font-bold text-2xl text-ocean-700 mb-2">
          <Waves className="w-7 h-7" />
          Adel Beach Resort
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-serif">Welcome Back</h1>
        <p className="text-gray-500 mt-2">Sign in to manage your bookings</p>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-ocean-600 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-ocean-50 px-4">
      <Suspense fallback={
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
