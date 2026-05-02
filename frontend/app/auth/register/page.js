'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowUpRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import SplitLayout from '@/components/auth/SplitLayout'
import Field from '@/components/forms/Field'
import PasswordStrength from '@/components/forms/PasswordStrength'

const REGISTER_IMAGE = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=85'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'
  const { register } = useAuthStore()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    password2: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const passwordsMismatch = form.password2.length > 0 && form.password !== form.password2

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created. Welcome.')
      router.replace(redirect)
      router.refresh()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const messages = Object.values(data).flat()
        messages.forEach((msg) => toast.error(Array.isArray(msg) ? msg[0] : msg))
      } else {
        toast.error(err.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <p className="eyebrow mb-3">New guest</p>
      <h1 className="font-serif text-3xl md:text-4xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">
        Create your account.
      </h1>
      <p className="text-navy-500 dark:text-ivory-200 text-sm mb-8">
        It takes a minute. Then bookings, favorites, and updates live in one place.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Juan"
            required
            autoComplete="given-name"
          />
          <Field
            label="Last name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Dela Cruz"
            required
            autoComplete="family-name"
          />
        </div>

        <Field
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Choose a username"
          required
          autoComplete="username"
        />

        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@email.com"
          required
          autoComplete="email"
        />

        <Field
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="09XX XXX XXXX"
          autoComplete="tel"
          hint="Optional — we'll use this for booking reminders only."
        />

        <div>
          <Field
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 10 characters"
            required
            minLength={10}
            autoComplete="new-password"
          />
          <PasswordStrength password={form.password} />
        </div>

        <Field
          label="Confirm password"
          name="password2"
          type="password"
          value={form.password2}
          onChange={handleChange}
          placeholder="Repeat password"
          required
          autoComplete="new-password"
          error={passwordsMismatch ? 'Passwords do not match' : undefined}
          success={!passwordsMismatch && form.password2.length > 0 && form.password === form.password2 ? true : undefined}
        />

        <button
          type="submit"
          disabled={loading || passwordsMismatch}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-ring text-sm tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="mt-10 pt-6 border-t border-ivory-300 dark:border-navy-700">
        <p className="text-sm text-navy-500 dark:text-ivory-200">
          Already have one?{' '}
          <Link
            href={redirect !== '/dashboard' ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login'}
            className="inline-flex items-center gap-1 font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors"
          >
            Sign in instead
            <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        </p>
      </div>
    </>
  )
}

export default function RegisterPage() {
  return (
    <SplitLayout
      imageSrc={REGISTER_IMAGE}
      imageAlt="Cottages by the shore"
      eyebrow="New guest"
      caption="A little setup. Then a long stay."
      reverse
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brass-500" size={28} />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </SplitLayout>
  )
}
