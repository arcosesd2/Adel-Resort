'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Monitor, ShieldCheck, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/fingerprint'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
  const { login, isAuthenticated, isReady, user } = useAuthStore()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null) // 'google' | 'facebook' | null
  const [deviceAuth, setDeviceAuth] = useState(null) // null | 'authorize' | 'blocked'

  // Handle Supabase Redirect (OAuth Callback)
  useEffect(() => {
    const handleAuthChange = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Supabase session error:', error)
        return
      }

      if (session?.user) {
        setLoading(true)
        try {
          // Bridge to Django
          const { data } = await api.post('/auth/social-login/', {
            email: session.user.email,
            first_name: session.user.user_metadata?.full_name?.split(' ')[0] || session.user.user_metadata?.first_name || '',
            last_name: session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || session.user.user_metadata?.last_name || '',
          })
          
          setAuthTokens(data)
          toast.success(`Welcome back, ${data.user.first_name}!`)
          const dest = data.user?.is_staff && redirect === '/dashboard' ? '/admin-dashboard' : redirect
          router.replace(dest)
          
          // Sign out of Supabase locally (we only needed the data to bridge to Django)
          await supabase.auth.signOut()
        } catch (err) {
          toast.error('Social login failed to sync with our system.')
          console.error('Django bridge error:', err)
        } finally {
          setLoading(false)
        }
      }
    }

    handleAuthChange()
  }, [router, redirect])

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

  const handleSocialLogin = async (provider) => {
    setSocialLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/auth/login',
      }
    })
    if (error) {
      toast.error(`Could not connect to ${provider}`)
      setSocialLoading(null)
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
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `access_token=${data.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
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
        <div className="flex flex-col items-center mb-2">
          <Image src="/logo.png" alt="Adel Beach Resort" width={100} height={100} className="object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-serif">Welcome Back</h1>
        <p className="text-gray-500 mt-2">Sign in to manage your bookings</p>
      </div>

      <div className="glass-card p-8">
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={loading || socialLoading}
            className="w-full py-2.5 px-4 border border-gray-300 rounded-xl flex items-center justify-center gap-3 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>
          
          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading || socialLoading}
            className="w-full py-2.5 px-4 bg-[#1877F2] text-white rounded-xl flex items-center justify-center gap-3 font-medium hover:bg-[#166fe5] transition-all disabled:opacity-50"
          >
            {socialLoading === 'facebook' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            Continue with Facebook
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white/70 text-gray-500">Or continue with email</span>
          </div>
        </div>

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
