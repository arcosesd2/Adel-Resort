'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SUB_COL_WIDTH = 42
const DAY_COL_WIDTH = SUB_COL_WIDTH * 2

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ROOM_TYPES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'dos_andanas', label: 'Dos Andanas' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Air-Conditioned Room' },
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

/** Color a cell based on booked/max ratio */
function cellBg(booked, max) {
  if (max === 0) return ''
  if (booked >= max) return 'bg-red-500 text-white'
  const pct = (booked / max) * 100
  if (pct >= 80) return 'bg-orange-400 text-white'
  if (pct >= 50) return 'bg-amber-400 text-white'
  if (pct > 0) return 'bg-emerald-400 text-white'
  return ''
}

/** Get promos for a room on a given date */
function getPromosForDate(room, dateStr) {
  return room.promo_dates?.[dateStr] || []
}

export default function PublicCalendar() {
  const [roomsAvailability, setRoomsAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const scrollRef = useRef(null)

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

  // Auto-scroll to today
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

  // Group rooms by type, keep each room separate
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

  // Pre-compute booked counts per room per date+slot
  const roomBookedCounts = useMemo(() => {
    const result = {} // { roomId: { "2026-04-13:day": 2, "2026-04-13:night": 1, "2026-04-13:overnight": 3 } }
    for (const room of roomsAvailability) {
      const counts = {}
      for (const s of (room.booked_slots || [])) {
        const key = `${s.date}:${s.slot}`
        counts[key] = (counts[key] || 0) + 1
      }
      result[room.room_id] = counts
    }
    return result
  }, [roomsAvailability])

  function getBooked(roomId, dateStr, slot) {
    return roomBookedCounts[roomId]?.[`${dateStr}:${slot}`] || 0
  }

  function fmtDate(day) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-white border border-gray-200" />
          <span className="text-gray-600">Available</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-emerald-400" />
          <span className="text-gray-600">Partially Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-amber-400" />
          <span className="text-gray-600">50%+ Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-orange-400" />
          <span className="text-gray-600">80%+ Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-red-500" />
          <span className="text-gray-600">Fully Booked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block bg-fuchsia-500 flex items-center justify-center">
            <span className="text-[7px] text-white font-bold">%</span>
          </span>
          <span className="text-gray-600">Promo Active</span>
        </span>
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
          <div className="w-[220px] min-w-[220px] flex-shrink-0 z-20">
            {/* Header spacer row 1 */}
            <div className="bg-gray-100 border-r border-b border-gray-200 px-3 font-semibold text-sm text-gray-700" style={{ height: '34px', display: 'flex', alignItems: 'center' }}>
              Room
            </div>
            {/* Header spacer row 2 */}
            <div className="bg-gray-50 border-r border-b border-gray-200" style={{ height: '22px' }} />

            {/* Group headers + room name cells */}
            {groupedRooms.map(group => (
              <div key={group.type}>
                {/* Type header */}
                <div
                  className="flex items-center gap-2 px-3 font-semibold text-sm border-b border-r border-gray-200"
                  style={{ backgroundColor: group.color.bg, color: group.color.text, height: '33px' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                    style={{ backgroundColor: group.color.bar }}
                  />
                  <span className="truncate">{group.label}</span>
                </div>
                {/* Individual rooms */}
                {group.rooms.map(room => (
                  <div
                    key={room.room_id}
                    className="bg-white border-r border-b border-gray-100 px-3 text-sm text-gray-700 flex items-center"
                    title={`${room.room_name} (${room.max_rooms} unit${room.max_rooms !== 1 ? 's' : ''})`}
                    style={{ height: '40px' }}
                  >
                    <div>
                      <span className="font-medium whitespace-nowrap">{room.room_name}</span>
                      {room.max_rooms > 1 && (
                        <span className="text-xs text-gray-400 ml-1">x{room.max_rooms}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollable days area */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: `${gridTotalWidth}px` }}>
              {/* Header row 1: Day name + number */}
              <div className="flex border-b border-gray-200" style={{ height: '34px' }}>
                {daysArray.map(d => (
                  <div
                    key={d.day}
                    className={`text-center text-xs leading-tight flex flex-col justify-center ${
                      d.isToday
                        ? 'bg-ocean-100 font-bold text-ocean-700'
                        : d.isWeekend
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-gray-50 text-gray-500'
                    }`}
                    style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px`, borderRight: '2px solid #d1d5db' }}
                  >
                    <div className="font-medium text-[10px]">{d.abbr}</div>
                    <div className="text-sm font-semibold">{d.day}</div>
                  </div>
                ))}
              </div>

              {/* Header row 2: D | N sub-labels */}
              <div className="flex border-b border-gray-300" style={{ height: '22px' }}>
                {daysArray.map(d => (
                  <div
                    key={d.day}
                    className="flex"
                    style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px`, borderRight: '2px solid #d1d5db' }}
                  >
                    <div
                      className={`flex-1 text-center text-[9px] font-bold flex items-center justify-center ${
                        d.isToday ? 'bg-ocean-50 text-ocean-600' : 'bg-amber-50 text-amber-700'
                      }`}
                      style={{ borderRight: '1px solid #cbd5e1' }}
                    >
                      D
                    </div>
                    <div
                      className={`flex-1 text-center text-[9px] font-bold flex items-center justify-center ${
                        d.isToday ? 'bg-ocean-50 text-ocean-600' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      N
                    </div>
                  </div>
                ))}
              </div>

              {/* Room groups */}
              {groupedRooms.map(group => (
                <div key={group.type}>
                  {/* Group header spacer */}
                  <div
                    className="border-b border-gray-200"
                    style={{ backgroundColor: group.color.bg, height: '33px' }}
                  />

                  {/* Room rows */}
                  {group.rooms.map(room => {
                    const max = room.max_rooms
                    const isSlotMode = room.booking_mode === 'slot'
                    const isDayOnly = room.is_day_only

                    return (
                      <div key={room.room_id} className="flex border-b border-gray-100" style={{ height: '40px' }}>
                        {daysArray.map(d => {
                          const dateStr = fmtDate(d.day)

                          if (isSlotMode) {
                            const dayBooked = getBooked(room.room_id, dateStr, 'day')
                            const nightBooked = isDayOnly ? 0 : getBooked(room.room_id, dateStr, 'night')

                            // Day-only rooms span both sub-columns (no grey Night cell)
                            if (isDayOnly) {
                              const promos = getPromosForDate(room, dateStr)
                              return (
                                <div
                                  key={d.day}
                                  className={`relative flex items-center justify-center text-[10px] font-bold transition-colors ${
                                    d.isToday ? 'ring-1 ring-inset ring-ocean-300' : ''
                                  } ${cellBg(dayBooked, max)} ${!cellBg(dayBooked, max) ? 'text-gray-400' : ''}`}
                                  style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px`, borderRight: '2px solid #e5e7eb' }}
                                  title={`${room.room_name} — Day: ${dayBooked}/${max} booked${promos.length > 0 ? ' | Promo: ' + promos.map(p => p.title).join(', ') : ''}`}
                                >
                                  {dayBooked > 0 ? `${dayBooked}/${max}` : ''}
                                  {promos.length > 0 && (
                                    <span className="absolute top-0.5 right-0.5 text-[8px] bg-fuchsia-500 text-white rounded-full w-3 h-3 flex items-center justify-center font-bold leading-none">%</span>
                                  )}
                                </div>
                              )
                            }

                            const slotPromos = getPromosForDate(room, dateStr)
                            return (
                              <div
                                key={d.day}
                                className="flex relative"
                                style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px`, borderRight: '2px solid #e5e7eb' }}
                              >
                                {/* Day cell */}
                                <div
                                  className={`flex-1 flex items-center justify-center text-[10px] font-bold transition-colors ${
                                    d.isToday ? 'ring-1 ring-inset ring-ocean-300' : ''
                                  } ${cellBg(dayBooked, max)} ${!cellBg(dayBooked, max) ? 'text-gray-400' : ''}`}
                                  style={{ borderRight: '1px solid #e2e8f0' }}
                                  title={`${room.room_name} — Day: ${dayBooked}/${max} booked${slotPromos.length > 0 ? ' | Promo: ' + slotPromos.map(p => p.title).join(', ') : ''}`}
                                >
                                  {dayBooked > 0 ? `${dayBooked}/${max}` : ''}
                                </div>
                                {/* Night cell */}
                                <div
                                  className={`flex-1 flex items-center justify-center text-[10px] font-bold transition-colors ${
                                    d.isToday ? 'ring-1 ring-inset ring-ocean-300' : ''
                                  } ${cellBg(nightBooked, max)} ${!cellBg(nightBooked, max) ? 'text-gray-400' : ''}`}
                                  title={`${room.room_name} — Night: ${nightBooked}/${max} booked`}
                                >
                                  {nightBooked > 0 ? `${nightBooked}/${max}` : ''}
                                </div>
                                {slotPromos.length > 0 && (
                                  <span className="absolute top-0.5 right-0.5 text-[8px] bg-fuchsia-500 text-white rounded-full w-3 h-3 flex items-center justify-center font-bold leading-none">%</span>
                                )}
                              </div>
                            )
                          }

                          // Overnight / 24hr mode — single value spanning both sub-columns
                          const slotType = room.booking_mode === '24hr' ? '24hr' : 'overnight'
                          const booked = getBooked(room.room_id, dateStr, slotType)
                          const ovPromos = getPromosForDate(room, dateStr)

                          return (
                            <div
                              key={d.day}
                              className={`relative flex items-center justify-center text-[10px] font-bold transition-colors ${
                                d.isToday ? 'ring-1 ring-inset ring-ocean-300' : ''
                              } ${cellBg(booked, max)} ${!cellBg(booked, max) ? 'text-gray-400' : ''}`}
                              style={{ width: `${DAY_COL_WIDTH}px`, minWidth: `${DAY_COL_WIDTH}px`, borderRight: '2px solid #e5e7eb' }}
                              title={`${room.room_name} — ${booked}/${max} booked${ovPromos.length > 0 ? ' | Promo: ' + ovPromos.map(p => p.title).join(', ') : ''}`}
                            >
                              {booked > 0 ? `${booked}/${max}` : ''}
                              {ovPromos.length > 0 && (
                                <span className="absolute top-0.5 right-0.5 text-[8px] bg-fuchsia-500 text-white rounded-full w-3 h-3 flex items-center justify-center font-bold leading-none">%</span>
                              )}
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
        Numbers show booked / total units. Empty cells are fully available.
      </p>
    </div>
  )
}
