'use client'

import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'

export default function AuthValidator() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe()
    }
  }, [])

  return null
}
