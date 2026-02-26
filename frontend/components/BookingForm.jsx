'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays, format } from 'date-fns'
import { Users, CalendarDays, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import AvailabilityCalendar from './AvailabilityCalendar'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function BookingForm({ room }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
  const [guests, setGuests] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [loading, setLoading] = useState(false)

  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0
  const totalPrice = nights * parseFloat(room.price_per_night)

  const handleDatesChange = (ci, co) => {
    setCheckIn(ci)
    setCheckOut(co)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please login to book')
      router.push(`/auth/login?redirect=/rooms/${room.id}`)
      return
    }
    if (!checkIn || !checkOut) {
      toast.error('Please select dates')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/bookings/', {
        room: room.id,
        check_in: format(checkIn, 'yyyy-MM-dd'),
        check_out: format(checkOut, 'yyyy-MM-dd'),
        guests,
        special_requests: specialRequests,
      })
      toast.success('Booking created! Proceed to payment.')
      router.push(`/checkout?booking=${data.id}`)
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || 'Failed to create booking'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-semibold">Reserve Your Stay</h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-ocean-700">${room.price_per_night}</span>
          <span className="text-gray-400 text-sm"> / night</span>
        </div>
      </div>

      {/* Calendar */}
      <AvailabilityCalendar roomId={room.id} onDatesChange={handleDatesChange} />

      {/* Guests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Users size={15} className="inline mr-1" />
          Guests
        </label>
        <input
          type="number"
          min="1"
          max={room.capacity}
          value={guests}
          onChange={(e) => setGuests(parseInt(e.target.value))}
          className="input-field"
        />
        <p className="text-xs text-gray-400 mt-1">Max {room.capacity} guests</p>
      </div>

      {/* Special Requests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <MessageSquare size={15} className="inline mr-1" />
          Special Requests (optional)
        </label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          rows={3}
          placeholder="Any dietary restrictions, accessibility needs, etc."
          className="input-field"
        />
      </div>

      {/* Price summary */}
      {nights > 0 && (
        <div className="bg-ocean-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">${room.price_per_night} × {nights} night{nights > 1 ? 's' : ''}</span>
            <span className="font-medium">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-ocean-200 pt-2">
            <span>Total</span>
            <span className="text-ocean-700">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !checkIn || !checkOut}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Booking...' : isAuthenticated ? 'Book Now' : 'Login to Book'}
      </button>
    </form>
  )
}
