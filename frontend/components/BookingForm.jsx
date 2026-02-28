'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Users, MessageSquare, Sun, Moon } from 'lucide-react'
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
  const [tourType, setTourType] = useState('day')
  const [specialRequests, setSpecialRequests] = useState('')
  const [loading, setLoading] = useState(false)

  const totalPrice = tourType === 'night' && room.night_price
    ? parseFloat(room.night_price)
    : parseFloat(room.day_price)

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
        tour_type: tourType,
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
          <span className="text-2xl font-bold text-ocean-700">₱{room.day_price}</span>
          {!room.is_day_only && room.night_price && (
            <span className="text-gray-400 text-sm"> / ₱{room.night_price}</span>
          )}
          <div className="text-gray-400 text-xs">{room.is_day_only ? 'day tour' : 'day / night'}</div>
        </div>
      </div>

      {/* Tour Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tour Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTourType('day')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
              tourType === 'day'
                ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Sun size={16} />
            Day Tour
            <span className="text-xs">(8AM–5PM)</span>
          </button>
          {!room.is_day_only && (
            <button
              type="button"
              onClick={() => setTourType('night')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                tourType === 'night'
                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Moon size={16} />
              Night Tour
              <span className="text-xs">(5PM–8AM)</span>
            </button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <AvailabilityCalendar roomId={room.id} onDatesChange={handleDatesChange} />

      {/* Persons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Users size={15} className="inline mr-1" />
          Persons
        </label>
        <input
          type="number"
          min="1"
          max={room.capacity}
          value={guests}
          onChange={(e) => setGuests(parseInt(e.target.value))}
          className="input-field"
        />
        <p className="text-xs text-gray-400 mt-1">Max {room.capacity} persons</p>
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
          placeholder="Any special requests or needs..."
          className="input-field"
        />
      </div>

      {/* Price summary */}
      {checkIn && checkOut && (
        <div className="bg-ocean-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {tourType === 'day' ? 'Day Tour' : 'Night Tour'} — {room.name}
            </span>
            <span className="font-medium">₱{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-ocean-200 pt-2">
            <span>Total</span>
            <span className="text-ocean-700">₱{totalPrice.toFixed(2)}</span>
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
