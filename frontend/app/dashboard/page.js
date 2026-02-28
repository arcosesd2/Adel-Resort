'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Hotel, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const statusConfig = {
  pending: { label: 'Pending Payment', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-gray-100 text-gray-600' },
}

function BookingCard({ booking, onCancel }) {
  const cfg = statusConfig[booking.status] || statusConfig.pending
  const Icon = cfg.icon
  const awaitingConfirmation = booking.status === 'pending' && booking.payment_submitted

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{booking.room_detail?.name}</h3>
          <p className="text-gray-500 text-sm capitalize">{booking.room_detail?.room_type_display}</p>
        </div>
        {awaitingConfirmation ? (
          <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
            <Clock size={12} />
            Awaiting Confirmation
          </span>
        ) : (
          <span className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${cfg.color}`}>
            <Icon size={12} />
            {cfg.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={15} className="text-ocean-500" />
          <div>
            <div className="font-medium text-gray-700">Check-in</div>
            {format(parseISO(booking.check_in), 'MMM d, yyyy')}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={15} className="text-ocean-500" />
          <div>
            <div className="font-medium text-gray-700">Check-out</div>
            {format(parseISO(booking.check_out), 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <div>
          <span className="text-xl font-bold text-ocean-700">₱{booking.total_price}</span>
          <span className="text-gray-400 text-sm"> · {booking.tour_type === 'night' ? 'Night Tour' : 'Day Tour'}</span>
        </div>

        <div className="flex gap-2">
          {booking.status === 'pending' && !booking.payment_submitted && (
            <Link
              href={`/checkout?booking=${booking.id}`}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Pay Now
            </Link>
          )}
          {booking.status === 'pending' && (
            <button
              onClick={() => onCancel(booking.id)}
              className="py-1.5 px-4 text-sm border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <Link
            href={`/booking/${booking.id}`}
            className="py-1.5 px-4 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard')
      return
    }
    fetchBookings()
  }, [isAuthenticated])

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/')
      setBookings(data.results || data)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    try {
      await api.delete(`/bookings/${id}/`)
      toast.success('Booking cancelled')
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel booking')
    }
  }

  const filtered = activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab)

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-gray-900">My Bookings</h1>
          {user && (
            <p className="text-gray-500 mt-1">Welcome back, {user.first_name}!</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-ocean-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.key === 'all' && bookings.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'all' ? 'bg-ocean-500' : 'bg-gray-100'
                }`}>
                  {bookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Hotel size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No bookings found</h3>
            <p className="text-gray-400 mb-6">Start planning your next escape!</p>
            <Link href="/rooms" className="btn-primary px-8 py-3 inline-flex items-center gap-2">
              Browse Rooms
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(booking => (
              <BookingCard key={booking.id} booking={booking} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
