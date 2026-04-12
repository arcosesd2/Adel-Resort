'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const ROOM_TYPES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'dos_andanas', label: 'Dos Andanas' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Karaoke Room' },
  { value: 'kubo', label: 'Kubo' },
  { value: 'function_hall', label: 'Function Hall' },
  { value: 'trapal_table', label: 'Trapal Table' },
]

const TYPE_COLORS = {
  cottage:         { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  dos_andanas:     { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
  lavender_house:  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  ac_karaoke:      { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  kubo:            { bg: '#ccfbf1', border: '#5eead4', text: '#115e59' },
  function_hall:   { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' },
  trapal_table:    { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
}

const DEFAULT_COLOR = { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }

function fmtDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTypeLabel(value) {
  return ROOM_TYPES.find(t => t.value === value)?.label || value
}

function getTypeColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR
}

/** Color for availability badge based on how full the type is */
function availColor(booked, total) {
  if (total === 0) return 'bg-gray-200 text-gray-500'
  if (booked >= total) return 'bg-red-500 text-white'
  const pct = (booked / total) * 100
  if (pct >= 80) return 'bg-orange-500 text-white'
  if (pct >= 50) return 'bg-amber-500 text-white'
  if (pct > 0) return 'bg-emerald-500 text-white'
  return 'bg-gray-100 text-gray-500'
}

export default function PublicCalendar() {
  const [roomsAvailability, setRoomsAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/rooms/all-availability/')
        setRoomsAvailability(data)
      } catch (err) {
        console.error('Failed to fetch availability:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = fmtDate(viewYear, viewMonth, d)
      const date = new Date(viewYear, viewMonth, d)
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const dayOfWeek = date.getDay()
      days.push({ day: d, dateStr, isPast, isToday: dateStr === todayStr, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 })
    }
    return days
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek])

  /**
   * Aggregate rooms by type.
   * For each type: total units = sum of max_rooms across all rooms of that type.
   * Per date: booked count = number of booked slots on that date (across all rooms of that type).
   *
   * For slot-mode rooms with day/night, we track day and night separately.
   * For overnight/24hr rooms, one slot per date.
   */
  const typeGroups = useMemo(() => {
    const typeOrder = ROOM_TYPES.map(t => t.value)
    const groups = {}

    for (const room of roomsAvailability) {
      const type = room.room_type
      if (!groups[type]) {
        groups[type] = {
          type,
          label: getTypeLabel(type),
          color: getTypeColor(type),
          totalUnits: 0,
          hasSlotMode: false,
          hasDayOnly: true,
          // Per-date booked counts: { "2026-04-13": count } or { "2026-04-13:day": count, "2026-04-13:night": count }
          bookedByDate: {},
          bookedBySlot: {},
        }
      }

      const g = groups[type]
      g.totalUnits += room.max_rooms

      if (room.booking_mode === 'slot') {
        g.hasSlotMode = true
        if (!room.is_day_only) g.hasDayOnly = false
      } else {
        g.hasDayOnly = false
      }

      for (const s of (room.booked_slots || [])) {
        // Total per date
        g.bookedByDate[s.date] = (g.bookedByDate[s.date] || 0) + 1
        // Per slot type
        const slotKey = `${s.date}:${s.slot}`
        g.bookedBySlot[slotKey] = (g.bookedBySlot[slotKey] || 0) + 1
      }
    }

    return typeOrder
      .filter(type => groups[type])
      .map(type => groups[type])
  }, [roomsAvailability])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  if (typeGroups.length === 0) {
    return <p className="text-center text-gray-400 py-12">No rooms available.</p>
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-semibold font-serif">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" /> All Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Some Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 50%+ Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500 inline-block" /> 80%+ Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Fully Booked
        </span>
      </div>

      {/* One calendar card per room type */}
      {typeGroups.map(group => {
        const showSlots = group.hasSlotMode && !group.hasDayOnly

        return (
          <div key={group.type} className="card overflow-hidden">
            {/* Type header */}
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ backgroundColor: group.color.bg, borderColor: group.color.border }}
            >
              <h3 className="font-semibold text-base" style={{ color: group.color.text }}>
                {group.label}
              </h3>
              <span className="text-sm font-medium" style={{ color: group.color.text }}>
                {group.totalUnits} unit{group.totalUnits !== 1 ? 's' : ''} total
              </span>
            </div>

            {/* Calendar */}
            <div className="p-4">
              <div className="border rounded-xl overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-gray-50 border-b">
                  {DAY_ABBR.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1.5">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-[4.5rem]" />

                    const { day, dateStr, isPast, isToday, isWeekend } = cell

                    if (showSlots) {
                      // Slot mode: show day and night separately
                      const dayBooked = group.bookedBySlot[`${dateStr}:day`] || 0
                      const nightBooked = group.bookedBySlot[`${dateStr}:night`] || 0
                      const total = group.totalUnits

                      return (
                        <div
                          key={dateStr}
                          className={`border-b border-r border-gray-100 p-1 ${isPast ? 'opacity-50 bg-gray-50' : isToday ? 'bg-ocean-50' : isWeekend ? 'bg-gray-50/50' : 'bg-white'}`}
                        >
                          <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-ocean-700 font-bold' : isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                            {day}
                          </div>
                          <div className="flex gap-0.5">
                            <div
                              className={`flex-1 text-center rounded text-[9px] font-bold py-0.5 ${availColor(dayBooked, total)}`}
                              title={`Day: ${total - dayBooked} of ${total} available`}
                            >
                              {total - dayBooked}/{total}
                            </div>
                            <div
                              className={`flex-1 text-center rounded text-[9px] font-bold py-0.5 ${availColor(nightBooked, total)}`}
                              title={`Night: ${total - nightBooked} of ${total} available`}
                            >
                              {total - nightBooked}/{total}
                            </div>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            <span className="flex-1 text-center text-[8px] text-gray-400">Day</span>
                            <span className="flex-1 text-center text-[8px] text-gray-400">Night</span>
                          </div>
                        </div>
                      )
                    }

                    // Overnight / 24hr / day-only: single count per date
                    const booked = group.bookedByDate[dateStr] || 0
                    const total = group.totalUnits
                    const available = total - booked

                    return (
                      <div
                        key={dateStr}
                        className={`border-b border-r border-gray-100 p-1 ${isPast ? 'opacity-50 bg-gray-50' : isToday ? 'bg-ocean-50' : isWeekend ? 'bg-gray-50/50' : 'bg-white'}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? 'text-ocean-700 font-bold' : isPast ? 'text-gray-400' : 'text-gray-600'}`}>
                          {day}
                        </div>
                        <div
                          className={`text-center rounded text-[10px] font-bold py-0.5 ${availColor(booked, total)}`}
                          title={`${available} of ${total} available`}
                        >
                          {available}/{total}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sub-legend for slot mode */}
              {showSlots && (
                <p className="text-[10px] text-gray-400 mt-2">Numbers show available/total units per slot. Day = 8AM–5PM, Night = 5PM–8AM.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
