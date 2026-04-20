'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import useAuthStore from '@/store/authStore'

export default function AdminDashboardLayout({ children }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) {
      const redirect = pathname || '/admin-dashboard'
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
      return
    }
    if (!user?.is_staff) {
      router.replace('/dashboard')
      return
    }
  }, [isReady, isAuthenticated, user, router, pathname])

  if (!isReady || !isAuthenticated || !user?.is_staff) return null

  return children
}
