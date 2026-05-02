'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    try {
      await api.post('/content/newsletter/subscribe/', { email })
      toast.success('Thanks for subscribing. Check your inbox.')
      setEmail('')
    } catch (err) {
      const data = err?.response?.data
      const msg =
        (Array.isArray(data?.email) && data.email[0]) ||
        data?.detail ||
        'Subscription failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        className="flex-1 px-4 py-3 rounded-lg bg-ivory-50/10 border border-ivory-50/25 text-ivory-50 placeholder:text-ivory-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300 focus-visible:border-brass-300 transition-colors text-sm disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brass-500 text-navy-900 font-semibold text-sm hover:bg-brass-300 transition-colors disabled:opacity-60 focus-ring whitespace-nowrap"
      >
        {loading ? <Loader2 className="animate-spin" size={14} /> : null}
        {loading ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  )
}
