'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function SiteSettingsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.is_superadmin) {
      router.push('/admin-dashboard')
      return
    }
    api.get('/content/settings/')
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [user])

  const handleToggle = async (field) => {
    const newValue = !settings[field]
    setSaving(true)
    try {
      const { data } = await api.patch('/content/settings/update/', { [field]: newValue })
      setSettings(data)
      toast.success('Settings updated')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/admin-dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-ocean-600" size={28} />
          <h1 className="font-serif text-3xl font-bold text-gray-900">Site Settings</h1>
        </div>

        <div className="card p-6 space-y-6">
          <p className="text-gray-500 text-sm">Control which sections are visible on the public homepage.</p>

          {/* Show Stats Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Stats Section</h3>
              <p className="text-sm text-gray-500">Show "Why Guests Love Us" counter stats on the homepage</p>
            </div>
            <button
              onClick={() => handleToggle('show_stats')}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings?.show_stats ? 'bg-ocean-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.show_stats ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>

          {/* Show Testimonials Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="font-semibold text-gray-900">Testimonials Section</h3>
              <p className="text-sm text-gray-500">Show guest reviews section on the homepage</p>
            </div>
            <button
              onClick={() => handleToggle('show_testimonials')}
              disabled={saving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings?.show_testimonials ? 'bg-ocean-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings?.show_testimonials ? 'translate-x-6' : ''
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
