'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email) return
    toast.success('Thanks for subscribing!')
    setEmail('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:ring-2 focus:ring-sand-400 focus:border-transparent w-full md:w-64 text-sm"
      />
      <button type="submit" className="btn-secondary py-2.5 px-6 text-sm whitespace-nowrap">
        Subscribe
      </button>
    </form>
  )
}
