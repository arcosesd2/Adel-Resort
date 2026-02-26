'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { CheckCircle, CalendarDays, Users, ArrowLeft, Printer } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const statusConfig = {
  pending: { label: 'Pending Payment', color: 'text-yellow-600 bg-yellow-50', border: 'border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'text-green-600 bg-green-50', border: 'border-green-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50', border: 'border-red-200' },
  completed: { label: 'Completed', color: 'text-gray-600 bg-gray-50', border: 'border-gray-200' },
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    const fetchBooking = async () => {
      try {
        const { data } = await api.get(`/bookings/${params.id}/`)
        setBooking(data)
      } catch {
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [params.id, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  if (!booking) return null

  const cfg = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to My Bookings
        </Link>

        {booking.status === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0" size={28} />
            <div>
              <h2 className="font-semibold text-green-800">Booking Confirmed!</h2>
              <p className="text-green-600 text-sm">Your stay is confirmed. We look forward to welcoming you!</p>
            </div>
          </div>
        )}

        <div className="card p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">Booking #{booking.id}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Created {format(parseISO(booking.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full border ${cfg.color} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>

          <div className="border rounded-xl overflow-hidden mb-6">
            <div className="bg-ocean-50 px-5 py-3">
              <h3 className="font-semibold text-gray-800">{booking.room_detail?.name}</h3>
              <p className="text-gray-500 text-sm">{booking.room_detail?.room_type_display}</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CalendarDays size={16} className="text-ocean-500 mt-0.5" />
                <div>
                  <div className="text-gray-400">Check-in</div>
                  <div className="font-medium text-gray-800">
                    {format(parseISO(booking.check_in), 'EEEE, MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays size={16} className="text-ocean-500 mt-0.5" />
                <div>
                  <div className="text-gray-400">Check-out</div>
                  <div className="font-medium text-gray-800">
                    {format(parseISO(booking.check_out), 'EEEE, MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-ocean-500" />
                <div>
                  <div className="text-gray-400">Guests</div>
                  <div className="font-medium text-gray-800">{booking.guests}</div>
                </div>
              </div>
              <div>
                <div className="text-gray-400">Duration</div>
                <div className="font-medium text-gray-800">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          {booking.special_requests && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-1">Special Requests</h3>
              <p className="text-gray-600 text-sm bg-gray-50 rounded-lg p-3">{booking.special_requests}</p>
            </div>
          )}

          <div className="border-t pt-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Amount</span>
              <span className="text-2xl font-bold text-ocean-700">${booking.total_price}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {booking.status === 'pending' && (
              <Link href={`/checkout?booking=${booking.id}`} className="btn-primary flex-1 text-center">
                Complete Payment
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 py-3 px-5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
