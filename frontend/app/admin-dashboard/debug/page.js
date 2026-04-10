'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, CheckCircle, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const CATEGORIES = [
  { key: 'bookings', label: 'Bookings & Voucher Usages', desc: 'All room bookings and voucher usage records' },
  { key: 'payments', label: 'Payment Transactions', desc: 'All payments and GCash proof screenshots' },
  { key: 'reviews', label: 'Reviews', desc: 'All customer reviews' },
  { key: 'chat', label: 'Chat Conversations & Messages', desc: 'All chat conversations and messages' },
  { key: 'notifications', label: 'Notifications', desc: 'All user notifications' },
  { key: 'activity_logs', label: 'Activity Logs', desc: 'All admin activity log entries' },
  { key: 'login_attempts', label: 'Login Attempts', desc: 'All login attempt records' },
  { key: 'registered_devices', label: 'Registered Devices', desc: 'All device fingerprint records' },
  { key: 'analytics', label: 'Analytics Data', desc: 'All page views and unique visitor records' },
  { key: 'favorites', label: 'Favorite Rooms', desc: 'All user favorite room records' },
]

export default function DebugResetPage() {
  const { user, isAuthenticated, isReady } = useAuthStore()
  const router = useRouter()
  const [selected, setSelected] = useState([])
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (isReady && (!isAuthenticated || !user?.is_superadmin)) {
      router.replace('/admin-dashboard')
    }
  }, [isReady, isAuthenticated, user, router])

  if (!isReady || !isAuthenticated || !user?.is_superadmin) return null

  const toggleAll = () => {
    if (selected.length === CATEGORIES.length) {
      setSelected([])
    } else {
      setSelected(CATEGORIES.map(c => c.key))
    }
  }

  const toggleCategory = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const handleReset = async () => {
    setConfirmOpen(false)
    setLoading(true)
    setResults(null)
    try {
      const { data } = await api.post('/analytics/debug-reset/', {
        pin,
        categories: selected,
      })
      setResults(data.results)
      toast.success('Debug reset completed')
      setSelected([])
      setPin('')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to perform debug reset'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-2">Debug & Reset</h1>
      <p className="text-gray-500 mb-8">Delete test data by category. This action is irreversible.</p>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Select Data to Delete</h2>
          <button
            onClick={toggleAll}
            className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
          >
            {selected.length === CATEGORIES.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-3">
          {CATEGORIES.map(({ key, label, desc }) => (
            <label
              key={key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(key) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={() => toggleCategory(key)}
                className="mt-1 accent-red-600"
              />
              <div>
                <div className="font-medium text-gray-800">{label}</div>
                <div className="text-sm text-gray-500">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-500" />
          PIN Verification
        </h2>
        <p className="text-sm text-gray-500 mb-3">Enter the debug PIN to authorize this action.</p>
        <div className="relative max-w-xs">
          <input
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter 7-digit PIN"
            maxLength={7}
            className="input-field pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        onClick={() => {
          if (selected.length === 0) {
            toast.error('Select at least one category')
            return
          }
          if (!pin) {
            toast.error('Enter the PIN')
            return
          }
          setConfirmOpen(true)
        }}
        disabled={loading || selected.length === 0 || !pin}
        className="btn-primary flex items-center gap-2 disabled:opacity-50 mb-6"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
        {loading ? 'Deleting...' : 'Delete Selected Data'}
      </button>

      {results && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Deletion Results
          </h2>
          <div className="space-y-1">
            {Object.entries(results).map(([key, count]) => (
              <div key={key} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-800">{count} deleted</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={28} />
              <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              You are about to permanently delete the following data:
            </p>
            <ul className="text-sm text-gray-700 mb-4 space-y-1">
              {selected.map(key => {
                const cat = CATEGORIES.find(c => c.key === key)
                return <li key={key} className="font-medium">&bull; {cat?.label}</li>
              })}
            </ul>
            <p className="text-red-600 text-sm font-medium mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn-outline flex-1 py-2">Cancel</button>
              <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex-1 transition-colors">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}