'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import RoomOccupancySection from '@/components/admin/RoomOccupancySection'

export default function OccupancyPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/occupancy'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    api.get('/analytics/dashboard/')
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => { setData({}); setLoading(false) })
  }, [isReady, isAuthenticated, user, router])

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Room Occupancy</h1>
      </div>

      {loading ? (
        <div className="card p-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2" />
          ))}
        </div>
      ) : (
        <RoomOccupancySection data={data} />
      )}
    </div>
  )
}
