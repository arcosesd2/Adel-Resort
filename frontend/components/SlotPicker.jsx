'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function fmtDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function nextDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return fmtDate(d.getFullYear(), d.getMonth(), d.getDate())
}

function slotKey(date, slot) { return `${date}:${slot}` }

function cmpSlot(a, b) {
  if (a.date < b.date) return -1
  if (a.date > b.date) return 1
  return (a.slot === 'day' ? 0 : 1) - (b.slot === 'day' ? 0 : 1)
}

/** Generate every slot from `from` to `to` inclusive. */
function buildRange(from, to, isDayOnly) {
  if (!from) return []
  const end = to || from
  const slots = []
  let d = from.date, s = from.slot
  for (let i = 0; i < 500; i++) {
    if (cmpSlot({ date: d, slot: s }, end) > 0) break
    slots.push({ date: d, slot: s })
    if (s === 'day' && !isDayOnly) s = 'night'
    else { d = nextDate(d); s = 'day' }
  }
  return slots
}

function labelSlot(s) {
  if (!s) return ''
  const d = new Date(s.date + 'T00:00:00')
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} (${s.slot === 'day' ? 'Day' : 'Night'})`
}

export default function SlotPicker({ roomId, isDayOnly, onSlotsChange }) {
  const [bookedSlots, setBookedSlots] = useState([])
  const [checkIn, setCheckIn] = useState(null)   // { date, slot }
  const [checkOut, setCheckOut] = useState(null)  // { date, slot }
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const curHour = now.getHours()
  const todayStr = fmtDate(now.getFullYear(), now.getMonth(), now.getDate())
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}/availability/`)
        setBookedSlots(data.booked_slots || [])
      } catch (err) { console.error('Failed to load availability:', err) }
      finally { setLoading(false) }
    })()
  }, [roomId])

  /* ---- derived data ---- */
  const bookedSet = useMemo(() => {
    const s = new Set()
    for (const x of bookedSlots) s.add(slotKey(x.date, x.slot))
    return s
  }, [bookedSlots])

  const isBooked  = useCallback((d, s) => bookedSet.has(slotKey(d, s)), [bookedSet])

  const isSlotPast = useCallback((dateStr, slot) => {
    if (dateStr < todayStr) return true
    if (dateStr === todayStr) {
      if (slot === 'day' && curHour >= 17) return true
      if (slot === 'night' && curHour >= 17) return true
    }
    return false
  }, [todayStr, curHour])

  /** For a date click: earliest available slot (check-in direction). */
  const earliestSlot = useCallback((dateStr) => {
    if (isDayOnly) return 'day'
    if (!isSlotPast(dateStr, 'day') && !isBooked(dateStr, 'day')) return 'day'
    if (!isSlotPast(dateStr, 'night') && !isBooked(dateStr, 'night')) return 'night'
    return null
  }, [isDayOnly, isSlotPast, isBooked])

  /** For a date click: latest available slot (check-out direction). */
  const latestSlot = useCallback((dateStr) => {
    if (isDayOnly) return 'day'
    if (!isSlotPast(dateStr, 'night') && !isBooked(dateStr, 'night')) return 'night'
    if (!isSlotPast(dateStr, 'day') && !isBooked(dateStr, 'day')) return 'day'
    return null
  }, [isDayOnly, isSlotPast, isBooked])

  const rangeSlots = useMemo(() => buildRange(checkIn, checkOut, isDayOnly), [checkIn, checkOut, isDayOnly])
  const rangeSet   = useMemo(() => new Set(rangeSlots.map(s => slotKey(s.date, s.slot))), [rangeSlots])

  const overlaps = useMemo(() => rangeSlots.filter(s => isBooked(s.date, s.slot)), [rangeSlots, bookedSet])
  const hasOverlap = overlaps.length > 0

  const selectedSlots = useMemo(() => {
    if (hasOverlap) return []
    return rangeSlots
  }, [rangeSlots, hasOverlap])

  const selectedSet = useMemo(() => new Set(selectedSlots.map(s => slotKey(s.date, s.slot))), [selectedSlots])

  useEffect(() => { onSlotsChange?.(selectedSlots) }, [selectedSlots])

  /* ---- helpers to set check-in / check-out ---- */
  const applySelection = useCallback((clicked) => {
    if (!checkIn || checkOut) {
      // First click or reset: set new check-in
      setCheckIn(clicked)
      setCheckOut(null)
    } else {
      // Second click
      if (cmpSlot(clicked, checkIn) > 0) {
        setCheckOut(clicked)
      } else {
        // Same or earlier → new check-in
        setCheckIn(clicked)
        setCheckOut(null)
      }
    }
  }, [checkIn, checkOut])

  /* Click on a specific D or N cell */
  const handleSlotClick = useCallback((dateStr, slot) => {
    if (isBooked(dateStr, slot) || isSlotPast(dateStr, slot)) return
    applySelection({ date: dateStr, slot })
  }, [isBooked, isSlotPast, applySelection])

  /* Click on the date number → auto-select both D+N */
  const handleDateClick = useCallback((dateStr) => {
    if (!checkIn || checkOut) {
      // Setting check-in: use earliest available slot
      const slot = earliestSlot(dateStr)
      if (!slot) return
      setCheckIn({ date: dateStr, slot })
      setCheckOut(null)
    } else {
      // Setting check-out: use latest available slot
      const clicked = { date: dateStr, slot: latestSlot(dateStr) || 'day' }
      if (cmpSlot(clicked, checkIn) > 0) {
        setCheckOut(clicked)
      } else if (dateStr === checkIn.date) {
        // Same date → reset
        const slot = earliestSlot(dateStr)
        if (!slot) return
        setCheckIn({ date: dateStr, slot })
        setCheckOut(null)
      } else {
        // Earlier date → new check-in
        const slot = earliestSlot(dateStr)
        if (!slot) return
        setCheckIn({ date: dateStr, slot })
        setCheckOut(null)
      }
    }
  }, [checkIn, checkOut, earliestSlot, latestSlot])

  /* ---- nav ---- */
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) } else setViewMonth(m => m + 1) }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      const dateStr = fmtDate(viewYear, viewMonth, d)
      const fullyPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate())
      days.push({ day: d, dateStr, fullyPast })
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

      <p className="text-xs text-gray-500">
        {!checkIn
          ? 'Click a date or a Day/Night slot to set check-in'
          : !checkOut
            ? 'Click a later date or slot to set check-out'
            : 'Click any date or slot to start a new selection'}
      </p>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ocean-500 inline-block" /> Check-in
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Check-out
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ocean-100 border border-ocean-300 inline-block" /> In range
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

      {/* Calendar */}
      <div className="border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAY_ABBR.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            if (!cell) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-16" />

            const { day, dateStr, fullyPast } = cell
            const dayPast   = fullyPast || isSlotPast(dateStr, 'day')
            const nightPast = fullyPast || isSlotPast(dateStr, 'night')
            const dayBk     = isBooked(dateStr, 'day')
            const nightBk   = isBooked(dateStr, 'night')
            const allDisabled = (dayPast || dayBk) && (nightPast || nightBk || isDayOnly)

            const isCheckInDate  = checkIn?.date === dateStr
            const isCheckOutDate = checkOut?.date === dateStr
            const inRange = rangeSet.has(slotKey(dateStr, 'day')) || rangeSet.has(slotKey(dateStr, 'night'))

            const dayIsCI  = checkIn?.date  === dateStr && checkIn?.slot  === 'day'
            const dayIsCO  = checkOut?.date === dateStr && checkOut?.slot === 'day'
            const nightIsCI  = checkIn?.date  === dateStr && checkIn?.slot  === 'night'
            const nightIsCO  = checkOut?.date === dateStr && checkOut?.slot === 'night'
            const daySel   = selectedSet.has(slotKey(dateStr, 'day'))
            const nightSel = selectedSet.has(slotKey(dateStr, 'night'))

            let cellBg = ''
            if (fullyPast) cellBg = 'bg-gray-50 opacity-50'
            else if (isCheckInDate || isCheckOutDate) cellBg = 'bg-ocean-50'
            else if (inRange) cellBg = 'bg-ocean-50/50'

            function slotClass(slot, isBk, isPast, isSel, isCI, isCO) {
              if (isBk)   return 'bg-red-400 text-white cursor-not-allowed'
              if (isPast)  return 'bg-gray-100 text-gray-400 cursor-not-allowed'
              if (isCI)   return 'bg-ocean-500 text-white shadow-sm ring-2 ring-ocean-600'
              if (isCO)   return 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-600'
              if (isSel)  return slot === 'day'
                ? 'bg-ocean-400 text-white shadow-sm'
                : 'bg-slate-600 text-white shadow-sm'
              if (rangeSet.has(slotKey(dateStr, slot)) && hasOverlap)
                return 'bg-red-100 text-red-700 ring-1 ring-red-300'
              return slot === 'day'
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'
            }

            return (
              <div key={dateStr} className={`border-b border-r border-gray-100 p-0.5 ${cellBg}`}>
                {/* Date number — click to auto-select D+N */}
                <button
                  type="button"
                  onClick={() => !allDisabled && handleDateClick(dateStr)}
                  disabled={allDisabled}
                  className={`w-full text-center text-xs font-medium mb-0.5 rounded transition-colors ${
                    allDisabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : isCheckInDate
                        ? 'text-ocean-700 font-bold'
                        : isCheckOutDate
                          ? 'text-emerald-700 font-bold'
                          : inRange
                            ? 'text-ocean-600 font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                  }`}
                >
                  {day}
                </button>

                {/* D / N buttons */}
                <div className={`flex gap-0.5 ${isDayOnly ? 'justify-center' : ''}`}>
                  <button
                    type="button"
                    onClick={() => handleSlotClick(dateStr, 'day')}
                    disabled={dayPast || dayBk}
                    title={dayBk ? 'Booked' : dayPast ? 'Past' : dayIsCI ? 'Check-in (Day)' : dayIsCO ? 'Check-out (Day)' : 'Day (8AM–5PM)'}
                    className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                      slotClass('day', dayBk, dayPast, daySel, dayIsCI, dayIsCO)
                    }`}
                  >
                    <Sun size={10} />
                  </button>

                  {!isDayOnly && (
                    <button
                      type="button"
                      onClick={() => handleSlotClick(dateStr, 'night')}
                      disabled={nightPast || nightBk}
                      title={nightBk ? 'Booked' : nightPast ? 'Past' : nightIsCI ? 'Check-in (Night)' : nightIsCO ? 'Check-out (Night)' : 'Night (5PM–8AM)'}
                      className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                        slotClass('night', nightBk, nightPast, nightSel, nightIsCI, nightIsCO)
                      }`}
                    >
                      <Moon size={10} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overlap warning */}
      {hasOverlap && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">This range overlaps with an existing booking.</p>
            <p className="text-xs mt-1">
              Conflicting: {overlaps.map(s => `${s.slot === 'day' ? 'Day' : 'Night'} on ${s.date}`).join(', ')}
            </p>
            <p className="text-xs mt-1">Please choose a different range.</p>
          </div>
        </div>
      )}

      {/* Selection summary */}
      {checkIn && !hasOverlap && (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Check-in:</span> {labelSlot(checkIn)}
          {checkOut && (
            <> {' '}<span className="font-medium text-gray-700">Check-out:</span> {labelSlot(checkOut)}</>
          )}
          {' '}— {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
          <button
            type="button"
            onClick={() => { setCheckIn(null); setCheckOut(null) }}
            className="ml-2 text-red-500 hover:text-red-700 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
