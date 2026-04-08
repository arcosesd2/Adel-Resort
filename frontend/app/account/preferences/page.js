'use client'

import { useEffect, useState } from 'react'
import { Loader2, Bell, Mail, Calendar, Tag, Clock, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const channels = [
  {
    key: 'receive_events',
    label: 'New events',
    description: 'Get notified when we add a new event at the resort.',
    icon: Calendar,
  },
  {
    key: 'receive_promotions',
    label: 'Promotions & discounts',
    description: 'Be the first to know about seasonal deals.',
    icon: Tag,
  },
  {
    key: 'receive_booking_updates',
    label: 'Booking updates',
    description: 'Confirmations, payment receipts, and cancellations for your bookings.',
    icon: Mail,
  },
  {
    key: 'receive_checkin_reminders',
    label: 'Check-in reminders',
    description: 'A friendly reminder the day before you arrive.',
    icon: Clock,
  },
  {
    key: 'receive_review_requests',
    label: 'Review requests',
    description: 'A short prompt to share feedback after your stay.',
    icon: Star,
  },
]

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/auth/notification-preferences/')
      .then(res => setPrefs(res.data))
      .catch(() => toast.error('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const togglePref = async (key) => {
    if (!prefs || saving) return
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    try {
      await api.patch('/auth/notification-preferences/', { [key]: next[key] })
    } catch {
      toast.error('Failed to save')
      setPrefs(prefs) // revert
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-ocean-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="text-ocean-600" size={20} />
        <h2 className="text-lg font-semibold text-ocean-800">Email Preferences</h2>
      </div>
      <p className="text-sm text-gray-500">
        Choose which kinds of emails you want to receive. You can change these any time.
      </p>

      <div className="space-y-2">
        {channels.map(({ key, label, description, icon: Icon }) => {
          const enabled = prefs?.[key] ?? true
          return (
            <div key={key} className="glass-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ocean-50 flex items-center justify-center text-ocean-600 shrink-0">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800">{label}</div>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => togglePref(key)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-ocean-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
