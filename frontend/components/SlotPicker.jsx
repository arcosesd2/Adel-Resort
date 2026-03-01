'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function SlotPicker({ roomId, isDayOnly, onSlotsChange }) {
  const [bookedSlots, setBookedSlots] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
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

  // Build set of booked slot keys for fast lookup
  const bookedSet = useMemo(() => {
    const set = new Set()
    for (const s of bookedSlots) {
      set.add(`${s.date}:${s.slot}`)
    }
    return set
  }, [bookedSlots])

  const isBooked = (dateStr, slot) => bookedSet.has(`${dateStr}:${slot}`)
  const isSelected = (dateStr, slot) => selectedSlots.some(s => s.date === dateStr && s.slot === slot)

  const toggleSlot = (dateStr, slot) => {
    if (isBooked(dateStr, slot)) return
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.date === dateStr && s.slot === slot)
      let next
      if (exists) {
        next = prev.filter(s => !(s.date === dateStr && s.slot === slot))
      } else {
        next = [...prev, { date: dateStr, slot }]
      }
      onSlotsChange?.(next)
      return next
    })
  }

  const toggleFullDay = (dateStr) => {
    const slots = isDayOnly ? ['day'] : ['day', 'night']
    const availableSlots = slots.filter(s => !isBooked(dateStr, s))
    if (availableSlots.length === 0) return

    const allSelected = availableSlots.every(s => isSelected(dateStr, s))
    setSelectedSlots(prev => {
      let next
      if (allSelected) {
        // Deselect all slots for this date
        next = prev.filter(s => s.date !== dateStr)
      } else {
        // Select all available slots for this date
        const without = prev.filter(s => s.date !== dateStr)
        next = [...without, ...availableSlots.map(s => ({ date: dateStr, slot: s }))]
      }
      onSlotsChange?.(next)
      return next
    })
  }

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
    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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
      <label className="block text-sm font-medium text-gray-700">Select Slots</label>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ocean-500 inline-block" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" /> Available
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
            const daySelected = isSelected(dateStr, 'day')
            const nightSelected = isSelected(dateStr, 'night')

            return (
              <div
                key={dateStr}
                className={`border-b border-r border-gray-100 p-0.5 ${isPast ? 'bg-gray-50 opacity-50' : ''}`}
              >
                {/* Date number — click to toggle full day */}
                <button
                  type="button"
                  onClick={() => !isPast && toggleFullDay(dateStr)}
                  disabled={isPast}
                  className={`w-full text-center text-xs font-medium mb-0.5 rounded hover:bg-gray-100 transition-colors ${
                    (daySelected || nightSelected) ? 'text-ocean-700 font-bold' : 'text-gray-600'
                  }`}
                >
                  {day}
                </button>

                {/* D | N slot buttons */}
                <div className={`flex gap-0.5 ${isDayOnly ? 'justify-center' : ''}`}>
                  {/* Day slot */}
                  <button
                    type="button"
                    onClick={() => !isPast && toggleSlot(dateStr, 'day')}
                    disabled={isPast || dayBooked}
                    title={dayBooked ? 'Booked' : daySelected ? 'Click to deselect' : 'Day (8AM–5PM)'}
                    className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                      dayBooked
                        ? 'bg-red-400 text-white cursor-not-allowed'
                        : daySelected
                          ? 'bg-ocean-500 text-white shadow-sm'
                          : isPast
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                    }`}
                  >
                    <Sun size={10} />
                  </button>

                  {/* Night slot */}
                  {!isDayOnly && (
                    <button
                      type="button"
                      onClick={() => !isPast && toggleSlot(dateStr, 'night')}
                      disabled={isPast || nightBooked}
                      title={nightBooked ? 'Booked' : nightSelected ? 'Click to deselect' : 'Night (5PM–8AM)'}
                      className={`flex-1 h-7 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                        nightBooked
                          ? 'bg-red-400 text-white cursor-not-allowed'
                          : nightSelected
                            ? 'bg-slate-700 text-white shadow-sm'
                            : isPast
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer'
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

      {/* Selection summary */}
      {selectedSlots.length > 0 && (
        <div className="text-xs text-gray-500">
          {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
          <button
            type="button"
            onClick={() => { setSelectedSlots([]); onSlotsChange?.([]) }}
            className="ml-2 text-red-500 hover:text-red-700 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
