'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import useAuthStore from '@/store/authStore'
import { getAccessToken } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getVisitorId() {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('visitor_id', id)
  }
  return id
}

function isStaffVisitor() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('staff_visitor') === '1'
}

export default function PageViewTracker() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isReady = useAuthStore((s) => s.isReady)

  useEffect(() => {
    if (!isReady) return

    // Local staff-visitor flag — set by authStore on any staff/admin/superadmin
    // login or session restore. Persists across logouts so the same browser is
    // never counted again, even mid-flight when user state is null.
    if (isStaffVisitor()) return

    // Belt-and-suspenders: live state check (handles first login before logout
    // round-trip, when the flag was just written this same render).
    if (user?.is_staff || user?.is_admin || user?.is_superadmin) return

    // Skip tracking while a JWT exists but /auth/me/ hasn't finished — without
    // this we'd track as anonymous during the brief window between init() and
    // user state hydration on every page load.
    const hasToken = !!getAccessToken()
    if (hasToken && !user) return

    try {
      const visitor_id = getVisitorId()
      const token = getAccessToken()
      fetch(`${API_URL}/api/analytics/track/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ visitor_id, page_path: pathname }),
      }).catch(() => {})
    } catch {}
  }, [pathname, user, isReady])

  return null
}
