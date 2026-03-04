'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Users, DollarSign, ShoppingCart, Clock, CreditCard } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const statCards = [
  { key: 'total_page_views', label: 'Total Page Views', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'unique_visitors', label: 'Unique Visitors', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'net_income', label: 'Net Income', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', isCurrency: true },
  { key: 'total_sales', label: 'Total Sales', icon: ShoppingCart, color: 'text-ocean-600', bg: 'bg-ocean-50' },
  { key: 'pending_sales', label: 'Pending Sales', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'pending_payments', label: 'Pending Payments', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
]

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace('/dashboard')
      return
    }
    if (!user) return

    api.get('/analytics/dashboard/')
      .then((res) => setData(res.data))
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false))
  }, [user, router])

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-8">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map(({ key, label, icon: Icon, color, bg, isCurrency }) => (
          <div key={key} className="card p-6 flex items-center gap-4">
            <div className={`${bg} p-3 rounded-xl`}>
              <Icon className={`${color} w-6 h-6`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isCurrency
                  ? `₱${Number(data[key]).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                  : Number(data[key]).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Page Views Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-ocean-800">Page Views by Path</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Page Path</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.page_views.map((row) => (
                <tr key={row.page_path} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700 font-mono">{row.page_path}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">{row.views.toLocaleString()}</td>
                </tr>
              ))}
              {data.page_views.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-400">No page views recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
