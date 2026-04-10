'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Waves, Monitor, ShieldCheck, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
  const { login, isAuthenticated, isReady, user } = useAuthStore()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deviceAuth, setDeviceAuth] = useState(null) // null | 'authorize' | 'blocked'

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
      toast.success('Welcome back!')
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
      toast.success('Device authorized! Welcome back!')
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
    document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    useAuthStore.setState({ user: data.user, isAuthenticated: true, isReady: true, lastActivity: Date.now() })
  }

  if (deviceAuth === 'blocked') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Device Not Authorized</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your account is locked to another device. Contact your admin to approve this device or reset your device authorization.
          </p>
          <button onClick={() => setDeviceAuth(null)} className="btn-primary text-sm px-4 py-2">
            Try Again
          </button>
        </div>
      </motion.div>
    )
  }

  if (deviceAuth === 'authorize') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-ocean-600" size={28} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Authorize This Device</h2>
          <p className="text-gray-500 text-sm mb-6">
            This is your first time logging in as staff. Would you like to authorize this device for future logins? Once authorized, you'll be locked to this device.
          </p>
          <div className="space-y-3">
            <button onClick={handleAuthorizeDevice} disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading ? 'Authorizing...' : <><ShieldCheck size={18} /> Authorize This Device</>}
            </button>
            <button onClick={() => setDeviceAuth(null)} className="text-gray-500 hover:text-gray-700 text-sm w-full block">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 font-serif font-bold text-2xl text-ocean-700 mb-2">
          <Waves className="w-7 h-7" />
          Adel Beach Resort
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-serif">Welcome Back</h1>
        <p className="text-gray-500 mt-2">Sign in to manage your bookings</p>
      </div>

      <div className="glass-card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} required placeholder="Enter your username" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" className="input-field pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link href="/auth/forgot-password" className="text-sm text-ocean-600 hover:text-ocean-700 font-medium">Forgot your password?</Link>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Don't have an account?{' '}
          <Link href={redirect !== '/dashboard' ? `/auth/register?redirect=${encodeURIComponent(redirect)}` : '/auth/register'} className="text-ocean-600 hover:underline font-medium">Register here</Link>
        </p>
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-br from-ocean-50 via-white to-sand-50 px-4 relative overflow-hidden">
      <div className="absolute top-20 left-[10%] w-64 h-64 bg-ocean-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-[10%] w-48 h-48 bg-sand-200/30 rounded-full blur-3xl pointer-events-none" />
      <Suspense fallback={<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
