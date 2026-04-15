'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import useAuthStore from '@/store/authStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getVisitorId() {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('visitor_id', id)
  }
  return id
}

export default function PageViewTracker() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user?.is_superadmin) return

    try {
      const visitor_id = getVisitorId()
      fetch(`${API_URL}/api/analytics/track/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id, page_path: pathname }),
      }).catch(() => {})
    } catch {}
  }, [pathname, user])

  return null
}
