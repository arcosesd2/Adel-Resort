'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, AlertTriangle, Loader2, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'
import SplitLayout from '@/components/auth/SplitLayout'
import Field from '@/components/forms/Field'

const LOGIN_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=85'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
  const { login, isAuthenticated, isReady, user } = useAuthStore()

  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [deviceAuth, setDeviceAuth] = useState(null)

  useEffect(() => {
    if (!isReady) return
    if (isAuthenticated) {
      const dest = user?.is_staff && redirect === '/dashboard' ? '/admin-dashboard' : redirect
      router.replace(dest)
    }
  }, [isReady, isAuthenticated, user, redirect, router])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login(form.username, form.password)
      toast.success('Welcome back.')
      const dest = data.user?.is_staff && redirect === '/dashboard' ? '/admin-dashboard' : redirect
      router.replace(dest)
    } catch (err) {
      const code = err.response?.data?.code
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Login failed'
      if (code === 'device_authorization_required') {
        setDeviceAuth('authorize')
      } else if (code === 'device_not_authorized') {
        setDeviceAuth('blocked')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAuthorizeDevice = async () => {
    setLoading(true)
    try {
      const fingerprint = await getDeviceFingerprint()
      const deviceInfo = getDeviceInfo()
      const { data } = await api.post('/auth/authorize-device/', {
        username: form.username,
        password: form.password,
        device_fingerprint: fingerprint,
        device_info: deviceInfo,
      })
      setAuthTokens(data)
      toast.success('Device authorized.')
      const dest = data.user?.is_staff && redirect === '/dashboard' ? '/admin-dashboard' : redirect
      router.replace(dest)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authorization failed.')
    } finally {
      setLoading(false)
    }
  }

  const setAuthTokens = (data) => {
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
    useAuthStore.setState({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
  }

  if (deviceAuth === 'blocked') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-red-600 dark:text-red-400" size={26} strokeWidth={1.75} />
        </div>
        <h1 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-3 tracking-tight">Device not authorized</h1>
        <p className="text-navy-500 dark:text-ivory-200 text-sm mb-6 leading-relaxed">
          This account is locked to another device. Contact your admin to approve this device or reset device authorization.
        </p>
        <button
          onClick={() => setDeviceAuth(null)}
          className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors focus-ring text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  if (deviceAuth === 'authorize') {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-brass-50 dark:bg-brass-800/40 border border-brass-200 dark:border-brass-700 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="text-brass-600 dark:text-brass-300" size={26} strokeWidth={1.75} />
        </div>
        <h1 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-3 tracking-tight">Authorize this device</h1>
        <p className="text-navy-500 dark:text-ivory-200 text-sm mb-6 leading-relaxed">
          This is your first staff sign-in here. Authorize this device for future logins? Once authorized, your account is locked to it.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleAuthorizeDevice}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-50 focus-ring text-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} strokeWidth={1.75} />}
            Authorize this device
          </button>
          <button
            onClick={() => setDeviceAuth(null)}
            className="text-navy-500 dark:text-navy-300 hover:text-navy-900 dark:hover:text-ivory-100 text-sm w-full transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="eyebrow mb-3">Member access</p>
      <h1 className="font-serif text-3xl md:text-4xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">
        Welcome back.
      </h1>
      <p className="text-navy-500 dark:text-ivory-200 text-sm mb-8">
        Sign in to manage your bookings, favorites, and preferences.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Enter your username"
          required
          autoComplete="username"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-brass-600 dark:text-brass-300 hover:underline focus-ring rounded"
          >
            Forgot your password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-ring text-sm tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-10 pt-6 border-t border-ivory-300 dark:border-navy-700">
        <p className="text-sm text-navy-500 dark:text-ivory-200">
          New here?{' '}
          <Link
            href={redirect !== '/dashboard' ? `/auth/register?redirect=${encodeURIComponent(redirect)}` : '/auth/register'}
            className="inline-flex items-center gap-1 font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors"
          >
            Create an account
            <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <SplitLayout
      imageSrc={LOGIN_IMAGE}
      imageAlt="Adel Beach Resort coastline at sunset"
      eyebrow="Member sign-in"
      caption="Take the long way back to the shore."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brass-500" size={28} />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </SplitLayout>
  )
}
