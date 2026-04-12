'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function fmtDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Read-only occupancy calendar for admin Room Overview.
 * Shows occupied count per date with color coding:
 *   - 0 bookings: neutral/gray
 *   - < 50%: green
 *   - 50-79%: amber
 *   - 80-99%: orange
 *   - 100% (full): red
 */
export default function OccupancyCalendar({ roomId, bookingMode, isDayOnly }) {
  const isSlotMode = bookingMode === 'slot'
  const [bookedSlots, setBookedSlots] = useState([])
  const [maxRooms, setMaxRooms] = useState(1)
  const [loading, setLoading] = useState(true)

  const now = new Date()
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

  // Count bookings per date (and per slot for slot mode)
  const dateCounts = useMemo(() => {
    const counts = {} // { "2026-04-13": count } or { "2026-04-13:day": count, "2026-04-13:night": count }
    for (const s of bookedSlots) {
      if (isSlotMode && !isDayOnly) {
        // For slot mode, track day and night separately
        const dayKey = `${s.date}:day`
        const nightKey = `${s.date}:night`
        if (s.slot === 'day') {
          counts[dayKey] = (counts[dayKey] || 0) + 1
        } else if (s.slot === 'night') {
          counts[nightKey] = (counts[nightKey] || 0) + 1
        }
      }
      // Always track total per date
      counts[s.date] = (counts[s.date] || 0) + 1
    }
    return counts
  }, [bookedSlots, isSlotMode, isDayOnly])

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) } else setViewMonth(m => m + 1) }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = fmtDate(viewYear, viewMonth, d)
      const isPast = new Date(viewYear, viewMonth, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate())
      days.push({ day: d, dateStr, isPast })
    }
    return days
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek])

  // For slot mode rooms (day/night), max bookings per date = maxRooms * slots_per_day
  const slotsPerDay = (isSlotMode && !isDayOnly) ? 2 : 1

  function getOccupancyInfo(dateStr) {
    if (isSlotMode && !isDayOnly) {
      const dayCount = dateCounts[`${dateStr}:day`] || 0
      const nightCount = dateCounts[`${dateStr}:night`] || 0
      const totalCount = dayCount + nightCount
      const maxPerDate = maxRooms * 2
      const pct = maxPerDate > 0 ? (totalCount / maxPerDate) * 100 : 0
      const isFull = dayCount >= maxRooms && nightCount >= maxRooms
      return { dayCount, nightCount, totalCount, maxPerDate, pct, isFull }
    }
    const count = dateCounts[dateStr] || 0
    const pct = maxRooms > 0 ? (count / maxRooms) * 100 : 0
    const isFull = count >= maxRooms
    return { totalCount: count, maxPerDate: maxRooms, pct, isFull }
  }

  function cellColor(pct, isFull, isPast) {
    if (isPast) return { bg: 'bg-gray-50', text: 'text-gray-400' }
    if (isFull) return { bg: 'bg-red-100', text: 'text-red-800' }
    if (pct >= 80) return { bg: 'bg-orange-100', text: 'text-orange-800' }
    if (pct >= 50) return { bg: 'bg-amber-100', text: 'text-amber-800' }
    if (pct > 0) return { bg: 'bg-green-50', text: 'text-green-800' }
    return { bg: 'bg-white', text: 'text-gray-600' }
  }

  function badgeColor(count, max) {
    if (count >= max) return 'bg-red-500 text-white'
    if (count / max >= 0.8) return 'bg-orange-500 text-white'
    if (count / max >= 0.5) return 'bg-amber-500 text-white'
    if (count > 0) return 'bg-green-500 text-white'
    return 'bg-gray-200 text-gray-500'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500 inline-block" /> &lt; 50%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 50–79%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500 inline-block" /> 80–99%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Full
        </span>
        <span className="text-gray-400 ml-1">
          (max {maxRooms} unit{maxRooms !== 1 ? 's' : ''}{isSlotMode && !isDayOnly ? ' x Day/Night' : ''})
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
            if (!cell) return <div key={`e-${idx}`} className="border-b border-r border-gray-100 h-16" />

            const { day, dateStr, isPast } = cell
            const info = getOccupancyInfo(dateStr)
            const colors = cellColor(info.pct, info.isFull, isPast)

            return (
              <div
                key={dateStr}
                className={`border-b border-r border-gray-100 p-1 ${colors.bg} ${isPast ? 'opacity-60' : ''}`}
              >
                <div className={`text-xs font-medium ${colors.text}`}>
                  {day}
                </div>

                {isSlotMode && !isDayOnly ? (
                  // Slot mode: show day/night counts separately
                  <div className="flex gap-0.5 mt-0.5">
                    <div className={`flex-1 text-center rounded text-[9px] font-bold py-0.5 ${badgeColor(info.dayCount, maxRooms)}`} title={`Day: ${info.dayCount}/${maxRooms}`}>
                      {info.dayCount}/{maxRooms}
                    </div>
                    <div className={`flex-1 text-center rounded text-[9px] font-bold py-0.5 ${badgeColor(info.nightCount, maxRooms)}`} title={`Night: ${info.nightCount}/${maxRooms}`}>
                      {info.nightCount}/{maxRooms}
                    </div>
                  </div>
                ) : (
                  // Overnight/24hr/day-only: single count
                  <div className={`text-center rounded text-[10px] font-bold py-0.5 mt-1 ${badgeColor(info.totalCount, maxRooms)}`} title={`${info.totalCount}/${maxRooms} booked`}>
                    {info.totalCount}/{maxRooms}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Slot mode sub-legend */}
      {isSlotMode && !isDayOnly && (
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>Left = Day slot</span>
          <span>Right = Night slot</span>
        </div>
      )}
    </div>
  )
}
