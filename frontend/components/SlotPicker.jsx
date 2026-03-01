'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function datesToRange(checkIn, checkOut) {
  if (!checkIn) return []
  const start = new Date(checkIn + 'T00:00:00')
  const end = checkOut ? new Date(checkOut + 'T00:00:00') : start
  const dates = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear()
    const m = d.getMonth()
    const day = d.getDate()
    dates.push(formatDate(y, m, day))
  }
  return dates
}

export default function SlotPicker({ roomId, isDayOnly, onSlotsChange }) {
  const [bookedSlots, setBookedSlots] = useState([])
  const [checkInDate, setCheckInDate] = useState(null)
  const [checkOutDate, setCheckOutDate] = useState(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}/availability/`)
        setBookedSlots(data.booked_slots || [])
      } catch (err) {
        console.error('Failed to load availability:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAvailability()
  }, [roomId])

  const bookedSet = useMemo(() => {
    const set = new Set()
    for (const s of bookedSlots) {
      set.add(`${s.date}:${s.slot}`)
    }
    return set
  }, [bookedSlots])

  const isBooked = (dateStr, slot) => bookedSet.has(`${dateStr}:${slot}`)

  // Compute selected slots from check-in/check-out range
  const selectedSlots = useMemo(() => {
    const rangeDates = datesToRange(checkInDate, checkOutDate)
    const slots = []
    for (const dateStr of rangeDates) {
      if (!isBooked(dateStr, 'day')) {
        slots.push({ date: dateStr, slot: 'day' })
      }
      if (!isDayOnly && !isBooked(dateStr, 'night')) {
        slots.push({ date: dateStr, slot: 'night' })
      }
    }
    return slots
  }, [checkInDate, checkOutDate, bookedSet, isDayOnly])

  // Notify parent when selection changes
  useEffect(() => {
    onSlotsChange?.(selectedSlots)
  }, [selectedSlots])

  const rangeDatesSet = useMemo(() => {
    return new Set(datesToRange(checkInDate, checkOutDate))
  }, [checkInDate, checkOutDate])

  const handleDateClick = useCallback((dateStr) => {
    if (!checkInDate || checkOutDate) {
      // First click or third click (reset): set new check-in
      setCheckInDate(dateStr)
      setCheckOutDate(null)
    } else {
      // Second click
      if (dateStr > checkInDate) {
        setCheckOutDate(dateStr)
      } else {
        // Clicked same or earlier date — reset to new check-in
        setCheckInDate(dateStr)
        setCheckOutDate(null)
      }
    }
  }, [checkInDate, checkOutDate])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      const dateStr = formatDate(viewYear, viewMonth, d)
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      days.push({ day: d, dateStr, isPast })
    }
    return days
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Select Dates</label>

      {/* Instructions */}
      <p className="text-xs text-gray-500">
        {!checkInDate
          ? 'Click a date to set check-in'
          : !checkOutDate
            ? 'Click a later date to set check-out'
            : 'Click any date to start a new selection'}
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ocean-500 inline-block" /> Check-in
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Check-out
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ocean-100 inline-block border border-ocean-300" /> In range
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Booked
        </span>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAY_ABBR.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="border-b border-r border-gray-100 h-16" />
            }

            const { day, dateStr, isPast } = cell
            const dayBooked = isBooked(dateStr, 'day')
            const nightBooked = isBooked(dateStr, 'night')
            const isCheckIn = dateStr === checkInDate
            const isCheckOut = dateStr === checkOutDate
            const inRange = rangeDatesSet.has(dateStr)
            const isInSelected = selectedSlots.some(s => s.date === dateStr)

            // Background styling for date cell
            let cellBg = ''
            if (isPast) {
              cellBg = 'bg-gray-50 opacity-50'
            } else if (isCheckIn) {
              cellBg = 'bg-ocean-100 ring-2 ring-inset ring-ocean-500'
            } else if (isCheckOut) {
              cellBg = 'bg-emerald-100 ring-2 ring-inset ring-emerald-500'
            } else if (inRange) {
              cellBg = 'bg-ocean-50'
            }

            return (
              <div
                key={dateStr}
                className={`border-b border-r border-gray-100 p-0.5 ${cellBg}`}
              >
                {/* Date number — click to select */}
                <button
                  type="button"
                  onClick={() => !isPast && handleDateClick(dateStr)}
                  disabled={isPast}
                  className={`w-full text-center text-xs font-medium mb-0.5 rounded transition-colors ${
                    isPast
                      ? 'text-gray-400 cursor-not-allowed'
                      : isCheckIn
                        ? 'text-ocean-700 font-bold'
                        : isCheckOut
                          ? 'text-emerald-700 font-bold'
                          : inRange
                            ? 'text-ocean-600 font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {day}
                </button>

                {/* D | N slot indicators (read-only) */}
                <div className={`flex gap-0.5 ${isDayOnly ? 'justify-center' : ''}`}>
                  {/* Day slot */}
                  <div
                    title={dayBooked ? 'Booked' : isInSelected ? 'Selected' : 'Day (8AM–5PM)'}
                    className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center ${
                      dayBooked
                        ? 'bg-red-400 text-white'
                        : isInSelected
                          ? 'bg-ocean-500 text-white'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Sun size={10} />
                  </div>

                  {/* Night slot */}
                  {!isDayOnly && (
                    <div
                      title={nightBooked ? 'Booked' : isInSelected ? 'Selected' : 'Night (5PM–8AM)'}
                      className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center ${
                        nightBooked
                          ? 'bg-red-400 text-white'
                          : isInSelected
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Moon size={10} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selection summary */}
      {checkInDate && (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Check-in:</span> {checkInDate}
          {checkOutDate && (
            <>
              {' '}<span className="font-medium text-gray-700">Check-out:</span> {checkOutDate}
            </>
          )}
          {' '}— {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
          <button
            type="button"
            onClick={() => { setCheckInDate(null); setCheckOutDate(null) }}
            className="ml-2 text-red-500 hover:text-red-700 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
