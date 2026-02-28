'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseISO, addDays } from 'date-fns'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_COL_WIDTH = 70 // px per day column

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  cottage:         { bg: '#dbeafe', bar: '#3b82f6', text: '#1e40af' },
  dos_andanas:     { bg: '#ede9fe', bar: '#8b5cf6', text: '#5b21b6' },
  lavender_house:  { bg: '#fce7f3', bar: '#ec4899', text: '#9d174d' },
  ac_karaoke:      { bg: '#d1fae5', bar: '#10b981', text: '#065f46' },
  kubo:            { bg: '#ccfbf1', bar: '#14b8a6', text: '#115e59' },
  function_hall:   { bg: '#e0e7ff', bar: '#6366f1', text: '#3730a3' },
  trapal_table:    { bg: '#fef9c3', bar: '#eab308', text: '#854d0e' },
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
  const scrollRef = useRef(null)

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

  // Auto-scroll to today when month changes or data loads
  useEffect(() => {
    if (loading || !scrollRef.current) return
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()
    if (isCurrentMonth) {
      const todayIndex = today.getDate() - 1
      scrollRef.current.scrollLeft = Math.max(0, todayIndex * DAY_COL_WIDTH - DAY_COL_WIDTH)
    } else {
      scrollRef.current.scrollLeft = 0
    }
  }, [loading, viewYear, viewMonth])

  const scrollByDays = useCallback((days) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: days * DAY_COL_WIDTH, behavior: 'smooth' })
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
  const gridTotalWidth = daysInMonth * DAY_COL_WIDTH

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
        tourType: range.tour_type || 'day',
        key: `${range.check_in}-${range.check_out}-${range.tour_type}`,
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
        <div className="border-l border-gray-300 pl-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-8 h-3 rounded-sm inline-block bg-ocean-500 text-[7px] text-white font-bold flex items-center justify-center">DAY</span>
            <span className="text-gray-600">Day Tour</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-8 h-3 rounded-sm inline-block bg-slate-800 text-[7px] text-white font-bold flex items-center justify-center">NGT</span>
            <span className="text-gray-600">Night Tour</span>
          </div>
        </div>
      </div>

      {/* Week scroll buttons */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => scrollByDays(-7)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} /> Previous 7 days
        </button>
        <span className="text-xs text-gray-400">Swipe or scroll to browse</span>
        <button
          onClick={() => scrollByDays(7)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Next 7 days <ChevronRight size={16} />
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex">
          {/* Sticky room name column */}
          <div className="w-[140px] min-w-[140px] flex-shrink-0 z-20">
            {/* Header cell */}
            <div className="bg-gray-100 border-r border-b border-gray-200 px-3 py-2 font-semibold text-sm text-gray-700" style={{ height: '52px', display: 'flex', alignItems: 'center' }}>
              Room
            </div>
            {/* Group headers + room name cells */}
            {groupedRooms.map(group => (
              <div key={group.type}>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 font-semibold text-sm border-b border-r border-gray-200"
                  style={{ backgroundColor: group.color.bg, color: group.color.text }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                    style={{ backgroundColor: group.color.bar }}
                  />
                  <span className="truncate">{group.label}</span>
                </div>
                {group.rooms.map(room => (
                  <div
                    key={room.room_id}
                    className="bg-white border-r border-b border-gray-100 px-3 py-2.5 text-sm text-gray-700 truncate"
                    title={room.room_name}
                    style={{ minHeight: '40px' }}
                  >
                    {room.room_name}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollable days area */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: `${gridTotalWidth}px` }}>
              {/* Header row */}
              <div className="flex border-b border-gray-200" style={{ height: '52px' }}>
                {daysArray.map(d => (
                  <div
                    key={d.day}
                    className={`py-1.5 text-center text-xs leading-tight border-r border-gray-100 last:border-r-0 flex flex-col justify-center ${
                      d.isToday
                        ? 'bg-ocean-100 font-bold text-ocean-700'
                        : d.isWeekend
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-gray-50 text-gray-500'
                    }`}
                    style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px` }}
                  >
                    <div className="font-medium">{d.abbr}</div>
                    <div>{d.day}</div>
                  </div>
                ))}
              </div>

              {/* Room groups */}
              {groupedRooms.map(group => (
                <div key={group.type}>
                  {/* Group header spacer (matches sticky side) */}
                  <div
                    className="border-b border-gray-200 px-3 py-1.5 text-sm"
                    style={{ backgroundColor: group.color.bg, height: '33px' }}
                  />

                  {/* Room rows */}
                  {group.rooms.map(room => {
                    const bars = computeBars(room)
                    const color = getTypeColor(room.room_type)
                    return (
                      <div key={room.room_id} className="relative border-b border-gray-100" style={{ minHeight: '40px' }}>
                        {/* Day cell backgrounds */}
                        <div className="flex h-full">
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
                                width: `${DAY_COL_WIDTH}px`,
                                minWidth: `${DAY_COL_WIDTH}px`,
                                minHeight: '40px',
                                ...(d.isToday ? { boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.25)' } : {}),
                              }}
                            />
                          ))}
                        </div>

                        {/* Booking bar overlays */}
                        {bars.map(bar => {
                          const isNight = bar.tourType === 'night'
                          return (
                            <div
                              key={bar.key}
                              className="absolute top-1/2 -translate-y-1/2 h-[22px] flex items-center justify-center overflow-hidden"
                              style={{
                                left: `${bar.leftPct}%`,
                                width: `${bar.widthPct}%`,
                                minWidth: '8px',
                                backgroundColor: isNight ? '#1e293b' : color.bar,
                                opacity: 0.85,
                                borderRadius: `${bar.continuesBefore ? '0' : '4px'} ${bar.continuesAfter ? '0' : '4px'} ${bar.continuesAfter ? '0' : '4px'} ${bar.continuesBefore ? '0' : '4px'}`,
                              }}
                              title={`${room.room_name} — ${isNight ? 'Night Tour (5PM–8AM)' : 'Day Tour (8AM–5PM)'}`}
                            >
                              <span className="text-[9px] font-bold text-white tracking-wide uppercase truncate px-1">
                                {isNight ? 'Night' : 'Day'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-4">
        Colored bars span the booked date range for each room
      </p>
    </div>
  )
}
