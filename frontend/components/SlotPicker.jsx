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

/** Build overnight slots: one per date from checkIn to the day before checkOut. */
function buildOvernightRange(checkInDate, checkOutDate) {
  if (!checkInDate) return []
  const end = checkOutDate || checkInDate
  const slots = []
  let d = checkInDate
  for (let i = 0; i < 500; i++) {
    if (d >= end) break
    slots.push({ date: d, slot: 'overnight' })
    d = nextDate(d)
  }
  // If only check-in selected (no check-out yet), show 1 night
  if (slots.length === 0 && checkInDate && !checkOutDate) {
    slots.push({ date: checkInDate, slot: 'overnight' })
  }
  return slots
}

function labelSlot(s) {
  if (!s) return ''
  const d = new Date(s.date + 'T00:00:00')
  if (s.slot === 'overnight') {
    return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
  }
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} (${s.slot === 'day' ? 'Day' : 'Night'})`
}

function formatCheckOutDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

export default function SlotPicker({ roomId, isDayOnly, bookingMode, onSlotsChange, onRangeChange, defaultCheckIn, defaultCheckOut }) {
  const isOvernight = bookingMode === 'overnight'
  const [bookedSlots, setBookedSlots] = useState([])
  const [maxRooms, setMaxRooms] = useState(1)
  const [loading, setLoading] = useState(true)

  // Slot-mode state
  const [checkIn, setCheckIn] = useState(defaultCheckIn || null)   // { date, slot }
  const [checkOut, setCheckOut] = useState(defaultCheckOut || null)  // { date, slot }

  // Overnight-mode state
  const [overnightCheckIn, setOvernightCheckIn] = useState(
    defaultCheckIn?.date || (typeof defaultCheckIn === 'string' ? defaultCheckIn : null)
  )
  const [overnightCheckOut, setOvernightCheckOut] = useState(
    defaultCheckOut?.date || (typeof defaultCheckOut === 'string' ? defaultCheckOut : null)
  )

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
        setMaxRooms(data.max_rooms || 1)
      } catch (err) { console.error('Failed to load availability:', err) }
      finally { setLoading(false) }
    })()
  }, [roomId])

  /* ---- derived data ---- */
  const bookedCounts = useMemo(() => {
    const counts = {}
    for (const x of bookedSlots) {
      const key = slotKey(x.date, x.slot)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [bookedSlots])

  const isBooked  = useCallback((d, s) => (bookedCounts[slotKey(d, s)] || 0) >= maxRooms, [bookedCounts, maxRooms])

  const yesterdayStr = useMemo(() => {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return fmtDate(y.getFullYear(), y.getMonth(), y.getDate())
  }, [])

  const isSlotPast = useCallback((dateStr, slot) => {
    if (slot === 'overnight') {
      // Overnight check-in is at 2PM — past if date is before today, or today after 2PM is still OK
      if (dateStr < todayStr) return true
      // Allow same-day check-in until 2PM (14:00)
      if (dateStr === todayStr && curHour >= 14) return true
      return false
    }
    if (slot === 'day') {
      if (dateStr < todayStr) return true
      if (dateStr === todayStr && curHour >= 17) return true
    } else {
      if (dateStr < yesterdayStr) return true
      if (dateStr === yesterdayStr && curHour >= 8) return true
    }
    return false
  }, [todayStr, yesterdayStr, curHour])

  // ═══════ OVERNIGHT MODE ═══════
  const overnightSlots = useMemo(() => {
    if (!isOvernight) return []
    return buildOvernightRange(overnightCheckIn, overnightCheckOut)
  }, [isOvernight, overnightCheckIn, overnightCheckOut])

  const overnightSelectedDates = useMemo(() => {
    return new Set(overnightSlots.map(s => s.date))
  }, [overnightSlots])

  const overnightOverlaps = useMemo(() => {
    if (!isOvernight) return []
    return overnightSlots.filter(s => isBooked(s.date, 'overnight'))
  }, [isOvernight, overnightSlots, bookedCounts, maxRooms])

  const overnightHasOverlap = overnightOverlaps.length > 0

  const overnightFinalSlots = useMemo(() => {
    if (overnightHasOverlap) return []
    return overnightSlots
  }, [overnightSlots, overnightHasOverlap])

  const overnightNights = overnightFinalSlots.length

  const handleOvernightDateClick = useCallback((dateStr) => {
    if (isBooked(dateStr, 'overnight') || isSlotPast(dateStr, 'overnight')) return

    if (!overnightCheckIn || overnightCheckOut) {
      // First click or reset
      setOvernightCheckIn(dateStr)
      setOvernightCheckOut(null)
    } else {
      if (dateStr > overnightCheckIn) {
        setOvernightCheckOut(dateStr)
      } else if (dateStr === overnightCheckIn) {
        // Same date: reset
        setOvernightCheckIn(null)
        setOvernightCheckOut(null)
      } else {
        // Earlier date: new check-in
        setOvernightCheckIn(dateStr)
        setOvernightCheckOut(null)
      }
    }
  }, [overnightCheckIn, overnightCheckOut, isBooked, isSlotPast])

  // Emit overnight slots
  useEffect(() => {
    if (isOvernight) {
      onSlotsChange?.(overnightFinalSlots)
    }
  }, [isOvernight, overnightFinalSlots])

  useEffect(() => {
    if (isOvernight) {
      onRangeChange?.(
        overnightCheckIn ? { date: overnightCheckIn, slot: 'overnight' } : null,
        overnightCheckOut ? { date: overnightCheckOut, slot: 'overnight' } : null
      )
    }
  }, [isOvernight, overnightCheckIn, overnightCheckOut])

  // ═══════ SLOT MODE (existing logic) ═══════

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

  const rangeSlots = useMemo(() => {
    if (isOvernight) return []
    return buildRange(checkIn, checkOut, isDayOnly)
  }, [isOvernight, checkIn, checkOut, isDayOnly])
  const rangeSet   = useMemo(() => new Set(rangeSlots.map(s => slotKey(s.date, s.slot))), [rangeSlots])

  const overlaps = useMemo(() => rangeSlots.filter(s => isBooked(s.date, s.slot)), [rangeSlots, bookedCounts, maxRooms])
  const hasOverlap = overlaps.length > 0

  const selectedSlots = useMemo(() => {
    if (hasOverlap) return []
    return rangeSlots
  }, [rangeSlots, hasOverlap])

  const selectedSet = useMemo(() => new Set(selectedSlots.map(s => slotKey(s.date, s.slot))), [selectedSlots])

  useEffect(() => { if (!isOvernight) onSlotsChange?.(selectedSlots) }, [isOvernight, selectedSlots])
  useEffect(() => { if (!isOvernight) onRangeChange?.(checkIn, checkOut) }, [isOvernight, checkIn, checkOut])

  /* ---- helpers to set check-in / check-out ---- */
  const applySelection = useCallback((clicked) => {
    if (!checkIn || checkOut) {
      setCheckIn(clicked)
      setCheckOut(null)
    } else {
      if (cmpSlot(clicked, checkIn) > 0) {
        setCheckOut(clicked)
      } else {
        setCheckIn(clicked)
        setCheckOut(null)
      }
    }
  }, [checkIn, checkOut])

  const handleSlotClick = useCallback((dateStr, slot) => {
    if (isBooked(dateStr, slot) || isSlotPast(dateStr, slot)) return
    applySelection({ date: dateStr, slot })
  }, [isBooked, isSlotPast, applySelection])

  const handleDateClick = useCallback((dateStr) => {
    if (!checkIn || checkOut) {
      const slot = earliestSlot(dateStr)
      if (!slot) return
      setCheckIn({ date: dateStr, slot })
      setCheckOut(null)
    } else {
      const clicked = { date: dateStr, slot: latestSlot(dateStr) || 'day' }
      if (cmpSlot(clicked, checkIn) > 0) {
        setCheckOut(clicked)
      } else if (dateStr === checkIn.date) {
        const slot = earliestSlot(dateStr)
        if (!slot) return
        setCheckIn({ date: dateStr, slot })
        setCheckOut(null)
      } else {
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

  // ═══════ OVERNIGHT RENDER ═══════
  if (isOvernight) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Select Dates</label>
        <p className="text-xs text-gray-500">
          {!overnightCheckIn
            ? 'Click a date to set check-in (2:00 PM)'
            : !overnightCheckOut
              ? 'Click a later date to set check-out (12:00 NN)'
              : 'Click any date to start a new selection'}
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
            <span className="w-3 h-3 rounded bg-ocean-100 border border-ocean-300 inline-block" /> Nights
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
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAY_ABBR.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-12" />

              const { day, dateStr, fullyPast } = cell
              const isPast = fullyPast || isSlotPast(dateStr, 'overnight')
              const isBk = isBooked(dateStr, 'overnight')
              const disabled = isPast || isBk

              const isCI = dateStr === overnightCheckIn
              const isCO = dateStr === overnightCheckOut
              const inRange = overnightSelectedDates.has(dateStr)
              // Check-out date highlight (day after last slot)
              const isCheckOutDay = overnightCheckOut && dateStr === overnightCheckOut

              let cellBg = ''
              let textClass = 'text-gray-700 hover:bg-ocean-50 cursor-pointer'

              if (isPast) {
                cellBg = 'bg-gray-50'
                textClass = 'text-gray-300 cursor-not-allowed'
              } else if (isBk) {
                cellBg = 'bg-red-50'
                textClass = 'text-red-400 cursor-not-allowed'
              } else if (isCI) {
                cellBg = 'bg-ocean-500'
                textClass = 'text-white font-bold'
              } else if (isCheckOutDay) {
                cellBg = 'bg-emerald-500'
                textClass = 'text-white font-bold'
              } else if (inRange) {
                cellBg = overnightHasOverlap ? 'bg-red-100' : 'bg-ocean-100'
                textClass = overnightHasOverlap ? 'text-red-700 font-semibold' : 'text-ocean-700 font-semibold'
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => !disabled && handleOvernightDateClick(dateStr)}
                  disabled={disabled}
                  className={`border-b border-r border-gray-100 h-12 flex items-center justify-center text-sm transition-all ${cellBg} ${textClass}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Overlap warning */}
        {overnightHasOverlap && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">This range overlaps with an existing booking.</p>
              <p className="text-xs mt-1">
                Conflicting: {overnightOverlaps.map(s => s.date).join(', ')}
              </p>
              <p className="text-xs mt-1">Please choose a different range.</p>
            </div>
          </div>
        )}

        {/* Selection summary */}
        {overnightCheckIn && !overnightHasOverlap && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="font-medium text-gray-700">Check-in:</span>{' '}
              {labelSlot({ date: overnightCheckIn, slot: 'overnight' })} at 2:00 PM
              {overnightCheckOut && (
                <>
                  {' '}<span className="font-medium text-gray-700">Check-out:</span>{' '}
                  {formatCheckOutDate(overnightCheckOut ? overnightSlots[overnightSlots.length - 1]?.date : overnightCheckIn)} at 12:00 NN
                </>
              )}
              {' '}— {overnightNights || 1} night{(overnightNights || 1) !== 1 ? 's' : ''}
            </div>
            <button
              type="button"
              onClick={() => { setOvernightCheckIn(null); setOvernightCheckOut(null) }}
              className="text-red-500 hover:text-red-700 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    )
  }

  // ═══════ SLOT MODE RENDER (existing) ═══════
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
