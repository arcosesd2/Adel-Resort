'use client'

import { useState, useEffect, useMemo } from 'react'
import { parseISO, addDays } from 'date-fns'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ROOM_TYPES = [
  { value: 'small_cottage', label: 'Small Cottage' },
  { value: 'dos_andanas_down', label: 'Dos Andanas Down' },
  { value: 'dos_andanas_up', label: 'Dos Andanas Up' },
  { value: 'large_cottage', label: 'Large Cottage' },
  { value: 'dos_andanas_room_sm', label: 'Dos Andanas Room (S)' },
  { value: 'dos_andanas_room_lg', label: 'Dos Andanas Room (L)' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Karaoke Room' },
  { value: 'kubo_with_toilet', label: 'Kubo w/ Toilet' },
  { value: 'kubo_without_toilet', label: 'Kubo w/o Toilet' },
  { value: 'function_hall', label: 'Function Hall' },
  { value: 'trapal_table', label: 'Trapal Table' },
]

const TYPE_COLORS = {
  small_cottage:        { bg: '#dbeafe', bar: '#3b82f6', text: '#1e40af' },
  dos_andanas_down:     { bg: '#ede9fe', bar: '#8b5cf6', text: '#5b21b6' },
  dos_andanas_up:       { bg: '#e0f2fe', bar: '#0ea5e9', text: '#0369a1' },
  large_cottage:        { bg: '#fef3c7', bar: '#f59e0b', text: '#92400e' },
  dos_andanas_room_sm:  { bg: '#ffedd5', bar: '#f97316', text: '#9a3412' },
  dos_andanas_room_lg:  { bg: '#f3e8ff', bar: '#a855f7', text: '#7e22ce' },
  lavender_house:       { bg: '#fce7f3', bar: '#ec4899', text: '#9d174d' },
  ac_karaoke:           { bg: '#d1fae5', bar: '#10b981', text: '#065f46' },
  kubo_with_toilet:     { bg: '#ccfbf1', bar: '#14b8a6', text: '#115e59' },
  kubo_without_toilet:  { bg: '#fee2e2', bar: '#ef4444', text: '#991b1b' },
  function_hall:        { bg: '#e0e7ff', bar: '#6366f1', text: '#3730a3' },
  trapal_table:         { bg: '#fef9c3', bar: '#eab308', text: '#854d0e' },
}

const DEFAULT_COLOR = { bg: '#f3f4f6', bar: '#6b7280', text: '#374151' }

function getTypeLabel(value) {
  return ROOM_TYPES.find(t => t.value === value)?.label || value
}

function getTypeColor(type) {
  return TYPE_COLORS[type] || DEFAULT_COLOR
}

export default function PublicCalendar() {
  const [roomsAvailability, setRoomsAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await api.get('/rooms/all-availability/')
        setRoomsAvailability(data)
      } catch (err) {
        console.error('Failed to fetch availability:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
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

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(viewYear, viewMonth, i + 1)
      const dayOfWeek = date.getDay()
      return {
        day: i + 1,
        dayOfWeek,
        abbr: DAY_ABBR[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday:
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate(),
      }
    })
  }, [viewYear, viewMonth, daysInMonth])

  const groupedRooms = useMemo(() => {
    const typeOrder = ROOM_TYPES.map(t => t.value)
    const groups = {}

    for (const room of roomsAvailability) {
      const type = room.room_type
      if (!groups[type]) groups[type] = []
      groups[type].push(room)
    }

    return typeOrder
      .filter(type => groups[type]?.length > 0)
      .map(type => ({
        type,
        label: getTypeLabel(type),
        color: getTypeColor(type),
        rooms: groups[type],
      }))
  }, [roomsAvailability])

  const activeTypes = useMemo(() => {
    const types = new Set(roomsAvailability.map(r => r.room_type))
    return ROOM_TYPES.filter(t => types.has(t.value))
  }, [roomsAvailability])

  function computeBars(room) {
    const monthStart = new Date(viewYear, viewMonth, 1)
    const monthEnd = new Date(viewYear, viewMonth, daysInMonth)
    const bars = []

    for (const range of room.booked_ranges) {
      const checkIn = parseISO(range.check_in)
      const checkOut = addDays(parseISO(range.check_out), -1) // last occupied night

      if (checkOut < monthStart || checkIn > monthEnd) continue

      const clampedStart = checkIn < monthStart ? monthStart : checkIn
      const clampedEnd = checkOut > monthEnd ? monthEnd : checkOut

      const startDay = clampedStart.getDate()
      const endDay = clampedEnd.getDate()

      const leftPct = ((startDay - 1) / daysInMonth) * 100
      const widthPct = Math.max(((endDay - startDay + 1) / daysInMonth) * 100, (1 / daysInMonth) * 100)

      const continuesBefore = checkIn < monthStart
      const continuesAfter = checkOut > monthEnd

      bars.push({
        leftPct,
        widthPct,
        continuesBefore,
        continuesAfter,
        key: `${range.check_in}-${range.check_out}`,
      })
    }
    return bars
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
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
      <div className="flex flex-wrap gap-3 mb-5">
        {activeTypes.map(t => {
          const color = getTypeColor(t.value)
          return (
            <div key={t.value} className="flex items-center gap-1.5 text-sm">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: color.bar }}
              />
              <span className="text-gray-600">{t.label}</span>
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[700px]">

          {/* Header row */}
          <div className="flex border-b border-gray-200">
            <div className="w-[180px] min-w-[180px] bg-gray-100 border-r border-gray-200 px-3 py-2 font-semibold text-sm text-gray-700 sticky left-0 z-20">
              Room
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
              {daysArray.map(d => (
                <div
                  key={d.day}
                  className={`py-1.5 text-center text-xs leading-tight border-r border-gray-100 last:border-r-0 ${
                    d.isToday
                      ? 'bg-ocean-100 font-bold text-ocean-700'
                      : d.isWeekend
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  <div className="font-medium">{d.abbr}</div>
                  <div>{d.day}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Room groups */}
          {groupedRooms.map(group => (
            <div key={group.type}>
              {/* Group header */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 font-semibold text-sm border-b border-gray-200"
                style={{ backgroundColor: group.color.bg, color: group.color.text }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: group.color.bar }}
                />
                {group.label}
              </div>

              {/* Room rows */}
              {group.rooms.map(room => {
                const bars = computeBars(room)
                const color = getTypeColor(room.room_type)
                return (
                  <div key={room.room_id} className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    {/* Room name — sticky */}
                    <div
                      className="w-[180px] min-w-[180px] bg-white border-r border-gray-200 px-3 py-2.5 text-sm text-gray-700 truncate sticky left-0 z-10"
                      title={room.room_name}
                    >
                      {room.room_name}
                    </div>

                    {/* Days area with booking bars */}
                    <div className="flex-1 relative">
                      {/* Day cell backgrounds */}
                      <div
                        className="grid h-full"
                        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                      >
                        {daysArray.map(d => (
                          <div
                            key={d.day}
                            className={`border-r border-gray-50 last:border-r-0 ${
                              d.isToday
                                ? 'bg-ocean-50'
                                : d.isWeekend
                                  ? 'bg-gray-50/70'
                                  : ''
                            }`}
                            style={{
                              minHeight: '36px',
                              ...(d.isToday ? { boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.25)' } : {}),
                            }}
                          />
                        ))}
                      </div>

                      {/* Booking bar overlays */}
                      {bars.map(bar => (
                        <div
                          key={bar.key}
                          className="absolute top-1/2 -translate-y-1/2 h-[20px] transition-opacity"
                          style={{
                            left: `${bar.leftPct}%`,
                            width: `${bar.widthPct}%`,
                            minWidth: '8px',
                            backgroundColor: color.bar,
                            opacity: 0.85,
                            borderRadius: `${bar.continuesBefore ? '0' : '4px'} ${bar.continuesAfter ? '0' : '4px'} ${bar.continuesAfter ? '0' : '4px'} ${bar.continuesBefore ? '0' : '4px'}`,
                          }}
                          title={`${room.room_name} — Booked`}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-4">
        Colored bars span the booked date range for each room
      </p>
    </div>
  )
}
