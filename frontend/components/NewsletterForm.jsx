'use client'

import { useState } from 'react'
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
      toast.success('Thanks for subscribing! Check your inbox.')
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
    <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
        className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-sand-400 focus:border-transparent w-full md:w-64 text-sm disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-secondary py-2.5 px-6 text-sm whitespace-nowrap disabled:opacity-60"
      >
        {loading ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  )
}
