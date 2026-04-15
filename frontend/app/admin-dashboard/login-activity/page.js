'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowLeft, Shield, Users } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function LoginActivityPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ success: '', days: '30' })
  const [tab, setTab] = useState('staff')

  const staffAttempts = useMemo(() => attempts.filter(a => a.user_is_staff), [attempts])
  const customerAttempts = useMemo(() => attempts.filter(a => !a.user_is_staff), [attempts])
  const displayedAttempts = tab === 'staff' ? staffAttempts : customerAttempts

  useEffect(() => {
    if (user && !user.is_superadmin) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchAttempts()
  }, [user, router])

  const fetchAttempts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.success) params.set('success', filters.success)
      if (filters.days) params.set('days', filters.days)
      const { data } = await api.get(`/auth/login-activity/?${params}`)
      setAttempts(data)
    } catch { toast.error('Failed to load activity.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!user?.is_superadmin) return
    fetchAttempts()
  }, [filters])

  const handleApproveDevice = async (attempt) => {
    try {
      await api.post('/auth/devices/from-attempt/', { attempt_id: attempt.id })
      toast.success('Device approved!')
      fetchAttempts()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve device.')
    }
  }

  if (!user?.is_superadmin) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Login Activity</h1>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('staff')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'staff' ? 'bg-white shadow text-ocean-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Shield size={16} /> Staff & Admin <span className="text-xs bg-ocean-100 text-ocean-700 px-1.5 py-0.5 rounded-full ml-1">{staffAttempts.length}</span>
          </button>
          <button onClick={() => setTab('customers')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'customers' ? 'bg-white shadow text-ocean-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users size={16} /> Customers <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full ml-1">{customerAttempts.length}</span>
          </button>
        </div>
        <div className="flex-1" />
        <select value={filters.success} onChange={e => setFilters(f => ({ ...f, success: e.target.value }))}
          className="input-field w-auto">
          <option value="">All</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
        <select value={filters.days} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))}
          className="input-field w-auto">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="">All time</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fingerprint</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedAttempts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(a.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-800">{a.username}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {a.success ? 'OK' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{a.failure_reason || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 font-mono">{a.fingerprint ? a.fingerprint.slice(0, 12) + '...' : '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{a.ip_address || '—'}</td>
                    <td className="px-6 py-3 text-right">
                      {a.failure_reason === 'unregistered_device' && (
                        <button onClick={() => handleApproveDevice(a)}
                          className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto">
                          <ShieldCheck size={12} /> Approve Device
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedAttempts.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No login attempts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
