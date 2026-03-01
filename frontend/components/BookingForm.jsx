'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import SlotPicker from './SlotPicker'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function BookingForm({ room }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [slots, setSlots] = useState([])
  const [guests, setGuests] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [loading, setLoading] = useState(false)

  const dayPrice = parseFloat(room.day_price)
  const nightPrice = parseFloat(room.night_price || room.day_price)

  const dayCount = slots.filter(s => s.slot === 'day').length
  const nightCount = slots.filter(s => s.slot === 'night').length
  const totalPrice = dayCount * dayPrice + nightCount * nightPrice

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please login to book')
      router.push(`/auth/login?redirect=/rooms/${room.id}`)
      return
    }
    if (slots.length === 0) {
      toast.error('Please select at least one slot')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/bookings/', {
        room: room.id,
        guests,
        slots,
        special_requests: specialRequests,
      })
      toast.success('Booking created! Proceed to payment.')
      router.push(`/checkout?booking=${data.id}`)
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.slots?.[0]
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
          <div className="text-gray-400 text-xs">{room.is_day_only ? 'day tour' : 'per slot'}</div>
        </div>
      </div>

      {/* Slot Picker */}
      <SlotPicker
        roomId={room.id}
        isDayOnly={room.is_day_only}
        onSlotsChange={setSlots}
      />

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
      {slots.length > 0 && (
        <div className="bg-ocean-50 rounded-xl p-4 space-y-2 text-sm">
          {dayCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {dayCount} day slot{dayCount !== 1 ? 's' : ''} x ₱{dayPrice.toFixed(2)}
              </span>
              <span className="font-medium">₱{(dayCount * dayPrice).toFixed(2)}</span>
            </div>
          )}
          {nightCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {nightCount} night slot{nightCount !== 1 ? 's' : ''} x ₱{nightPrice.toFixed(2)}
              </span>
              <span className="font-medium">₱{(nightCount * nightPrice).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-ocean-200 pt-2">
            <span>Total</span>
            <span className="text-ocean-700">₱{totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || slots.length === 0}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Booking...' : isAuthenticated ? 'Book Now' : 'Login to Book'}
      </button>
    </form>
  )
}
