'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Users, MessageSquare, AlertTriangle, Clock, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    api.get('/content/settings/')
      .then(({ data }) => setWeekendWalkinOnly(!!data.weekend_walkin_only))
      .catch(() => {})
  }, [])

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

  const overnightCount = slots.filter((s) => s.slot === 'overnight' || s.slot === '24hr').length
  const dayCount = slots.filter((s) => s.slot === 'day').length
  const nightCount = slots.filter((s) => s.slot === 'night').length
  const totalPrice = isOvernight
    ? overnightCount * dayPrice
    : dayCount * dayPrice + nightCount * nightPrice

  const priceLabel = is24hr ? 'per 24 hours' : isOvernight ? 'per night' : room.is_day_only ? 'day tour' : 'per slot'

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
      toast.error('Please sign in to book')
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
      toast.success('Booking submitted. Reserved once admin approves.')
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

  const submitLabel = loading
    ? 'Creating booking…'
    : !isAuthenticated
    ? 'Sign in to reserve'
    : user?.is_staff
    ? 'Create on-site booking'
    : 'Reserve now'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-navy-900 border border-ivory-300 dark:border-navy-700 rounded-2xl shadow-editorial overflow-hidden"
    >
      {/* Header strip */}
      <div className="px-6 py-5 border-b border-ivory-300 dark:border-navy-700">
        <p className="eyebrow mb-2">Reserve your stay</p>
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 leading-tight tracking-tight">
            Choose your dates.
          </h3>
          <div className="text-right">
            <p className="font-serif text-2xl text-navy-900 dark:text-ivory-100 leading-none">
              ₱{Number(room.day_price).toLocaleString()}
            </p>
            <p className="text-[11px] text-navy-300 dark:text-navy-300 mt-1 uppercase tracking-wider">{priceLabel}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Schedule reminders */}
        {isOvernight && !is24hr && (
          <div className="text-xs text-navy-500 dark:text-ivory-200 flex items-center gap-2 bg-ivory-100 dark:bg-navy-800 border border-ivory-300 dark:border-navy-700 rounded px-3 py-2">
            <Clock size={13} strokeWidth={1.75} className="text-brass-600 dark:text-brass-300" />
            Check-in <strong className="text-navy-900 dark:text-ivory-100 mx-1">2:00 PM</strong> · check-out <strong className="text-navy-900 dark:text-ivory-100 mx-1">12:00 NN</strong>
          </div>
        )}
        {is24hr && (
          <div className="text-xs text-navy-500 dark:text-ivory-200 flex items-center gap-2 bg-ivory-100 dark:bg-navy-800 border border-ivory-300 dark:border-navy-700 rounded px-3 py-2">
            <Clock size={13} strokeWidth={1.75} className="text-brass-600 dark:text-brass-300" />
            Check-in &amp; check-out at the <strong className="text-navy-900 dark:text-ivory-100 mx-1">same time next day</strong> (24-hour stay)
          </div>
        )}

        {weekendWalkinOnly && room.is_weekend_walkin_restricted && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Cottages can only be booked via walk-in during the weekends.
            </p>
          </div>
        )}

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

        <div>
          <label className="label flex items-center gap-1.5">
            <Users size={13} strokeWidth={1.75} />
            Persons
          </label>
          <input
            type="number"
            min="1"
            max={room.capacity}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="input"
          />
          <p className="text-[11px] text-navy-300 dark:text-navy-300 mt-1.5">Max {room.capacity} persons</p>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <MessageSquare size={13} strokeWidth={1.75} />
            Special requests <span className="text-navy-300 dark:text-navy-300 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={3}
            placeholder="Anything we should know in advance…"
            className="input resize-none"
          />
        </div>

        {slots.length > 0 && (
          <div className="border border-ivory-300 dark:border-navy-700 rounded-xl p-5 bg-ivory-50 dark:bg-navy-800/40 space-y-2.5">
            <p className="eyebrow mb-1">Summary</p>
            {isOvernight && overnightCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-navy-500 dark:text-ivory-200">
                  {is24hr
                    ? `${overnightCount} day${overnightCount !== 1 ? 's' : ''} (24hr)`
                    : `${overnightCount} night${overnightCount !== 1 ? 's' : ''}`} × ₱{dayPrice.toFixed(2)}
                </span>
                <span className="font-medium text-navy-900 dark:text-ivory-100">₱{(overnightCount * dayPrice).toFixed(2)}</span>
              </div>
            )}
            {!isOvernight && dayCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-navy-500 dark:text-ivory-200">
                  {dayCount} day slot{dayCount !== 1 ? 's' : ''} × ₱{dayPrice.toFixed(2)}
                </span>
                <span className="font-medium text-navy-900 dark:text-ivory-100">₱{(dayCount * dayPrice).toFixed(2)}</span>
              </div>
            )}
            {!isOvernight && nightCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-navy-500 dark:text-ivory-200">
                  {nightCount} night slot{nightCount !== 1 ? 's' : ''} × ₱{nightPrice.toFixed(2)}
                </span>
                <span className="font-medium text-navy-900 dark:text-ivory-100">₱{(nightCount * nightPrice).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-ivory-300 dark:border-navy-700">
              <span className="text-sm font-semibold text-navy-700 dark:text-ivory-200">Total</span>
              <span className="font-serif text-2xl text-navy-900 dark:text-ivory-100">
                ₱{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {isAuthenticated && !user?.is_staff && slots.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <span>
              You'll have <strong>1 hour</strong> to complete payment. Unpaid reservations are automatically cancelled.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || slots.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 dark:bg-brass-500 text-ivory-50 dark:text-navy-900 font-semibold rounded-lg hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring text-sm tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          {submitLabel}
        </button>

        <p className="text-[11px] text-navy-300 dark:text-navy-300 text-center">
          By booking, you agree to our{' '}
          <a href="/refund-policy" target="_blank" className="text-brass-600 dark:text-brass-300 underline focus-ring rounded">
            Refund &amp; Cancellation Policy
          </a>
          .
        </p>
      </div>
    </form>
  )
}
