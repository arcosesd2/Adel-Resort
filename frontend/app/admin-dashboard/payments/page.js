'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import PaymentManagementSection from '@/components/admin/PaymentManagementSection'

export default function PaymentsPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/payments'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
  }, [isReady, isAuthenticated, user, router])

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Payment Transactions</h1>
      </div>
      <PaymentManagementSection />
    </div>
  )
}
