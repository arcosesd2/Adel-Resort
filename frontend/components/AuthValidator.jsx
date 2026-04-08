'use client'

import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'

/**
 * Bootstraps auth state on app mount. Reads the JWT from localStorage,
 * validates it against /auth/me/, and reconciles the store. Must run
 * exactly once at the top of the tree (in app/layout.js).
 */
export default function AuthValidator() {
  const init = useAuthStore((s) => s.init)
  const isReady = useAuthStore((s) => s.isReady)

  useEffect(() => {
    if (!isReady) {
      init()
    }
  }, [isReady, init])

  return null
}
