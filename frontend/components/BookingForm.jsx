'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import SlotPicker from './SlotPicker'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

function getDraft(roomId) {
  try {
    const raw = sessionStorage.getItem(`booking_draft_${roomId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraft(roomId, data) {
  try { sessionStorage.setItem(`booking_draft_${roomId}`, JSON.stringify(data)) } catch {}
}

function clearDraft(roomId) {
  try { sessionStorage.removeItem(`booking_draft_${roomId}`) } catch {}
}

export default function BookingForm({ room }) {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  const [slots, setSlots] = useState([])
  const [guests, setGuests] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [loading, setLoading] = useState(false)
  const rangeRef = useRef({ checkIn: null, checkOut: null })
  const [savedCheckIn, setSavedCheckIn] = useState(null)
  const [savedCheckOut, setSavedCheckOut] = useState(null)
  const [weekendWalkinOnly, setWeekendWalkinOnly] = useState(false)
  const [promoDates, setPromoDates] = useState({})

  useEffect(() => {
    api.get('/content/settings/')
      .then(({ data }) => setWeekendWalkinOnly(!!data.weekend_walkin_only))
      .catch(() => {})
    api.get(`/rooms/${room.id}/availability/`)
      .then(({ data }) => setPromoDates(data.promo_dates || {}))
      .catch(() => {})
  }, [room.id])

  const handleRangeChange = useCallback((checkIn, checkOut) => {
    rangeRef.current = { checkIn, checkOut }
  }, [])

  useEffect(() => {
    const draft = getDraft(room.id)
    if (draft) {
      if (draft.guests) setGuests(draft.guests)
      if (draft.specialRequests) setSpecialRequests(draft.specialRequests || '')
      if (draft.checkIn) setSavedCheckIn(draft.checkIn)
      if (draft.checkOut) setSavedCheckOut(draft.checkOut)
    }
  }, [room.id])

  const isOvernight = room.booking_mode === 'overnight' || room.booking_mode === '24hr'
  const is24hr = room.booking_mode === '24hr'

  const dayPrice = parseFloat(room.day_price)
  const nightPrice = parseFloat(room.night_price || room.day_price)

  const overnightCount = slots.filter(s => s.slot === 'overnight' || s.slot === '24hr').length
  const dayCount = slots.filter(s => s.slot === 'day').length
  const nightCount = slots.filter(s => s.slot === 'night').length
  const totalPrice = isOvernight
    ? overnightCount * dayPrice
    : dayCount * dayPrice + nightCount * nightPrice

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (slots.length === 0) {
      toast.error('Please select at least one slot')
      return
    }

    if (!isAuthenticated) {
      saveDraft(room.id, {
        guests,
        specialRequests,
        checkIn: rangeRef.current.checkIn,
        checkOut: rangeRef.current.checkOut,
      })
      toast.error('Please login to book')
      router.push(`/auth/login?redirect=/rooms/${room.id}`)
      return
    }

    if (user?.is_staff) {
      const params = new URLSearchParams({ room: room.id })
      if (slots.length > 0) params.set('slots', JSON.stringify(slots))
      if (guests > 1) params.set('guests', guests)
      if (specialRequests) params.set('special_requests', specialRequests)
      const range = rangeRef.current
      if (range?.checkIn) params.set('checkIn', JSON.stringify(range.checkIn))
      if (range?.checkOut) params.set('checkOut', JSON.stringify(range.checkOut))
      router.push(`/admin-dashboard?${params.toString()}`)
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
      toast.success('Booking submitted! Your room will be reserved once the admin approves it.')
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
          {!isOvernight && !room.is_day_only && room.night_price && (
            <span className="text-gray-400 text-sm"> / ₱{room.night_price}</span>
          )}
          <div className="text-gray-400 text-xs">
            {is24hr ? 'per 24 hours' : isOvernight ? 'per night' : room.is_day_only ? 'day tour' : 'per slot'}
          </div>
        </div>
      </div>

      {isOvernight && !is24hr && (
        <div className="bg-ocean-50 rounded-lg px-3 py-2 text-xs text-ocean-700">
          Check-in: <strong>2:00 PM</strong> &middot; Check-out: <strong>12:00 NN</strong>
        </div>
      )}
      {is24hr && (
        <div className="bg-ocean-50 rounded-lg px-3 py-2 text-xs text-ocean-700">
          Check-in &amp; check-out at <strong>same time</strong> the next day (24-hour stay)
        </div>
      )}

      {/* Weekend walk-in notice */}
      {weekendWalkinOnly && room.is_weekend_walkin_restricted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Cottages can only be booked via walk-in during the weekends.
          </p>
        </div>
      )}

      {/* Slot Picker */}
      <SlotPicker
        roomId={room.id}
        isDayOnly={room.is_day_only}
        bookingMode={room.booking_mode}
        onSlotsChange={setSlots}
        onRangeChange={handleRangeChange}
        defaultCheckIn={savedCheckIn}
        defaultCheckOut={savedCheckOut}
        weekendDisabled={weekendWalkinOnly && room.is_weekend_walkin_restricted}
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
      {slots.length > 0 && (() => {
        const slotDates = [...new Set(slots.map(s => s.date))]
        const bestPromo = slotDates.reduce((best, date) => {
          const promos = promoDates[date] || []
          for (const p of promos) {
            const disc = p.discount_type === 'percentage'
              ? totalPrice * (parseFloat(p.discount_value) / 100)
              : parseFloat(p.discount_value)
            if (!best || disc > best.discount) best = { ...p, discount: disc }
          }
          return best
        }, null)
        const discountedPrice = bestPromo ? Math.max(totalPrice - bestPromo.discount, 0) : totalPrice

        return (
        <div className="bg-ocean-50 rounded-xl p-4 space-y-2 text-sm">
          {isOvernight && overnightCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {is24hr
                  ? `${overnightCount} day${overnightCount !== 1 ? 's' : ''} (24hr) x ₱${dayPrice.toFixed(2)}`
                  : `${overnightCount} night${overnightCount !== 1 ? 's' : ''} x ₱${dayPrice.toFixed(2)}`}
              </span>
              <span className="font-medium">₱{(overnightCount * dayPrice).toFixed(2)}</span>
            </div>
          )}
          {!isOvernight && dayCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {dayCount} day slot{dayCount !== 1 ? 's' : ''} x ₱{dayPrice.toFixed(2)}
              </span>
              <span className="font-medium">₱{(dayCount * dayPrice).toFixed(2)}</span>
            </div>
          )}
          {!isOvernight && nightCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                {nightCount} night slot{nightCount !== 1 ? 's' : ''} x ₱{nightPrice.toFixed(2)}
              </span>
              <span className="font-medium">₱{(nightCount * nightPrice).toFixed(2)}</span>
            </div>
          )}
          {bestPromo && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center gap-1">
                {bestPromo.title}
                <span className="text-[10px] bg-fuchsia-100 text-fuchsia-700 px-1 rounded">Promo</span>
              </span>
              <span>-₱{bestPromo.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-ocean-200 pt-2">
            <span>Total</span>
            <span className="text-ocean-700">₱{discountedPrice.toFixed(2)}</span>
          </div>
        </div>
      )})()}

      <p className="text-xs text-gray-500 text-center">
        By booking, you agree to our{' '}
        <a href="/refund-policy" target="_blank" className="text-ocean-600 underline">Refund & Cancellation Policy</a>.
      </p>

      {isAuthenticated && !user?.is_staff && slots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>You&apos;ll have <strong>12 hours</strong> to complete payment after booking. Unpaid reservations are automatically cancelled.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || slots.length === 0}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Booking...' : !isAuthenticated ? 'Login to Book' : user?.is_staff ? 'Create Onsite Booking' : 'Book Now'}
      </button>
    </form>
  )
}
