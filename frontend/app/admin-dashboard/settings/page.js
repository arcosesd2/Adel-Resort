'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings, Star, StarOff } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

export default function SiteSettingsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [settings, setSettings] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) {
      router.push('/admin-dashboard')
      return
    }
    api.get('/content/settings/')
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error('Failed to load settings'))
    api.get('/rooms/admin/')
      .then(({ data }) => setRooms(data))
      .catch(() => toast.error('Failed to load rooms'))
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

  const handleFeaturedModeChange = async (mode) => {
    setSaving(true)
    try {
      const { data } = await api.patch('/content/settings/update/', { featured_mode: mode })
      setSettings(data)
      toast.success(`Featured mode set to ${mode === 'auto' ? 'Automatic' : 'Manual'}`)
    } catch {
      toast.error('Failed to update featured mode')
    } finally {
      setSaving(false)
    }
  }

  const toggleFeatured = async (room) => {
    try {
      const { data } = await api.patch(`/rooms/admin/${room.id}/`, { is_featured: !room.is_featured })
      setRooms(prev => prev.map(r => r.id === room.id ? data : r))
      toast.success(data.is_featured ? 'Room marked as featured' : 'Room unfeatured')
    } catch {
      toast.error('Failed to update room')
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/admin-dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-ocean-600" size={28} />
          <h1 className="font-serif text-3xl font-bold text-gray-900">Site Settings</h1>
        </div>

        <div className="card p-6 space-y-6 mb-8">
          <p className="text-gray-500 text-sm">Control which sections are visible on the public homepage.</p>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Stats Section</h3>
              <p className="text-sm text-gray-500">Show &quot;Why Guests Love Us&quot; counter stats on the homepage</p>
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

        {/* Featured Accommodations */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Featured Accommodations</h2>
            <p className="text-gray-500 text-sm">Control how rooms are selected for the homepage &quot;Featured Accommodations&quot; section.</p>
          </div>

          {/* Mode selector */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleFeaturedModeChange('auto')}
              disabled={saving}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                settings?.featured_mode === 'auto'
                  ? 'border-ocean-500 bg-ocean-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <h3 className={`font-semibold mb-1 ${settings?.featured_mode === 'auto' ? 'text-ocean-700' : 'text-gray-900'}`}>
                Automatic
              </h3>
              <p className="text-sm text-gray-500">
                Rooms are selected based on ratings, booking count, and popularity.
              </p>
            </button>
            <button
              onClick={() => handleFeaturedModeChange('manual')}
              disabled={saving}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                settings?.featured_mode === 'manual'
                  ? 'border-ocean-500 bg-ocean-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <h3 className={`font-semibold mb-1 ${settings?.featured_mode === 'manual' ? 'text-ocean-700' : 'text-gray-900'}`}>
                Manual
              </h3>
              <p className="text-sm text-gray-500">
                Hand-pick which rooms appear on the homepage.
              </p>
            </button>
          </div>

          {/* Manual mode: room list with featured toggle */}
          {settings?.featured_mode === 'manual' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Click the star to feature/unfeature a room. Featured rooms appear on the homepage.</p>
              <div className="divide-y divide-gray-100">
                {rooms.filter(r => r.is_active).map(room => (
                  <div key={room.id} className="flex items-center gap-4 py-3">
                    {room.primary_image ? (
                      <img
                        src={cloudinaryUrl(room.primary_image, { width: 100 })}
                        alt={room.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Star size={16} className="text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{room.name}</h4>
                      <p className="text-xs text-gray-500">{room.room_type_display} &middot; ₱{Number(room.day_price).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => toggleFeatured(room)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        room.is_featured
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={room.is_featured ? 'Unfeature' : 'Feature'}
                    >
                      {room.is_featured ? <Star size={18} className="fill-yellow-500" /> : <StarOff size={18} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settings?.featured_mode === 'auto' && (
            <div className="bg-ocean-50 border border-ocean-200 rounded-xl p-4 text-sm text-ocean-700">
              Top-rated rooms with the most bookings are automatically featured. No manual selection needed.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
