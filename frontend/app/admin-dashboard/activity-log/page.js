'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter, Clock, User, Bookmark, CreditCard, Home, Star, Tag, Settings, Shield } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const CATEGORY_CONFIG = {
  auth: { label: 'Login', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
  booking: { label: 'Booking', icon: Bookmark, color: 'text-green-600', bg: 'bg-green-50' },
  payment: { label: 'Payment', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  room: { label: 'Room', icon: Home, color: 'text-purple-600', bg: 'bg-purple-50' },
  content: { label: 'Content', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  user: { label: 'User Mgmt', icon: User, color: 'text-orange-600', bg: 'bg-orange-50' },
  review: { label: 'Review', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  voucher: { label: 'Voucher', icon: Tag, color: 'text-pink-600', bg: 'bg-pink-50' },
  settings: { label: 'Settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
}

const DAYS_OPTIONS = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '', label: 'All time' },
]

export default function ActivityLogPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffUsers, setStaffUsers] = useState([])

  // Filters
  const [category, setCategory] = useState('')
  const [days, setDays] = useState('30')
  const [staffFilter, setStaffFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user && !user.is_superadmin) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchLogs()
    api.get('/auth/users/').then(({ data }) => {
      setStaffUsers(data.filter(u => u.is_staff || u.is_superadmin))
    }).catch(() => {})
  }, [user, router])

  useEffect(() => {
    if (!user?.is_superadmin) return
    fetchLogs()
  }, [category, days, staffFilter, search])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (days) params.set('days', days)
      if (staffFilter) params.set('user', staffFilter)
      if (search) params.set('search', search)
      params.set('limit', '200')
      const { data } = await api.get(`/auth/activity-log/?${params}`)
      setLogs(data)
    } catch {} finally { setLoading(false) }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin-dashboard')} className="text-ocean-600 hover:text-ocean-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-serif font-bold text-ocean-800">Staff Activity Log</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={16} /> Filters:
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="input-field text-sm py-1.5 w-auto">
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={days} onChange={e => setDays(e.target.value)}
            className="input-field text-sm py-1.5 w-auto">
            {DAYS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
            className="input-field text-sm py-1.5 w-auto">
            <option value="">All Staff</option>
            {staffUsers.map(u => (
              <option key={u.id} value={u.id}>{u.username} ({u.first_name})</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search actions..."
              className="input-field text-sm py-1.5 pl-9" />
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="card overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{logs.length} entries</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No activity found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const cat = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.settings
              const Icon = cat.icon
              return (
                <div key={log.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className={`${cat.bg} p-2 rounded-full flex-shrink-0 mt-0.5`}>
                    <Icon size={14} className={cat.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{log.details}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="font-medium text-gray-600">
                        {log.user_full_name || log.user_username}
                      </span>
                      <span>{formatTime(log.created_at)}</span>
                      {log.ip_address && <span>{log.ip_address}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color} flex-shrink-0`}>
                    {cat.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
