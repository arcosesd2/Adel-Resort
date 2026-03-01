'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const CHECK_INTERVAL = 30 * 1000 // check every 30 seconds

export default function InactivityGuard() {
  const { isAuthenticated, logout, touchActivity, lastActivity } = useAuthStore()
  const router = useRouter()

  const handleActivity = useCallback(() => {
    if (isAuthenticated) touchActivity()
  }, [isAuthenticated, touchActivity])

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handleActivity))
  }, [isAuthenticated, handleActivity])

  // Check for inactivity periodically
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      const elapsed = Date.now() - useAuthStore.getState().lastActivity
      if (elapsed >= INACTIVITY_TIMEOUT) {
        await logout()
        toast.error('You have been logged out due to inactivity')
        router.push('/auth/login')
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [isAuthenticated, logout, router])

  return null
}
