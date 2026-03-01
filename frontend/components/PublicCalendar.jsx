'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseISO } from 'date-fns'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SUB_COL_WIDTH = 38 // px per sub-column (Day or Night)
const DAY_COL_WIDTH = SUB_COL_WIDTH * 2 // px per full day column

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

  const BOOKING_OUTLINE_COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ]

  // Returns a map: { [dayNumber]: { day: booking_id|false, night: booking_id|false } }
  function computeBookedCells(room) {
    const cells = {}
    const slots = room.booked_slots || []

    for (const s of slots) {
      const d = parseISO(s.date)
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue
      const dayNum = d.getDate()
      if (!cells[dayNum]) cells[dayNum] = { day: false, night: false }
      cells[dayNum][s.slot] = s.booking_id || true
    }
    return cells
  }

  function getOutlineColor(bookingId) {
    if (!bookingId || bookingId === true) return 'transparent'
    return BOOKING_OUTLINE_COLORS[bookingId % BOOKING_OUTLINE_COLORS.length]
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
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-4 h-4 rounded-sm inline-block bg-ocean-500" />
          <span className="text-gray-600">D — Day (8AM–5PM)</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-4 h-4 rounded-sm inline-block bg-slate-700" />
          <span className="text-gray-600">N — Night (5PM–8AM)</span>
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
            {/* Header cells — 2 rows to match date + D/N header */}
            <div className="bg-gray-100 border-r border-b border-gray-200 px-3 font-semibold text-sm text-gray-700" style={{ height: '34px', display: 'flex', alignItems: 'center' }}>
              Room
            </div>
            <div className="bg-gray-50 border-r border-b border-gray-200 px-3 text-xs text-gray-400" style={{ height: '22px', display: 'flex', alignItems: 'center' }}>
            </div>
            {/* Group headers + room name cells */}
            {groupedRooms.map(group => (
              <div key={group.type}>
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
                {group.rooms.map(room => (
                  <div
                    key={room.room_id}
                    className="bg-white border-r border-b border-gray-100 px-3 text-sm text-gray-700 truncate flex items-center"
                    title={room.room_name}
                    style={{ height: '40px' }}
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
                    style={{
                      width: `${DAY_COL_WIDTH}px`,
                      minWidth: `${DAY_COL_WIDTH}px`,
                      borderRight: '2px solid #d1d5db',
                    }}
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
                    style={{
                      width: `${DAY_COL_WIDTH}px`,
                      minWidth: `${DAY_COL_WIDTH}px`,
                      borderRight: '2px solid #d1d5db',
                    }}
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
                  {/* Group header spacer (matches sticky side) */}
                  <div
                    className="border-b border-gray-200"
                    style={{ backgroundColor: group.color.bg, height: '33px' }}
                  />

                  {/* Room rows */}
                  {group.rooms.map(room => {
                    const bookedCells = computeBookedCells(room)
                    const color = getTypeColor(room.room_type)
                    return (
                      <div key={room.room_id} className="flex border-b border-gray-100" style={{ height: '40px' }}>
                        {daysArray.map(d => {
                          const booked = bookedCells[d.day] || {}
                          const bothSameBooking = booked.day && booked.night && booked.day === booked.night

                          return (
                            <div
                              key={d.day}
                              className="flex"
                              style={{
                                width: `${DAY_COL_WIDTH}px`,
                                minWidth: `${DAY_COL_WIDTH}px`,
                                borderRight: '2px solid #e5e7eb',
                              }}
                            >
                              {bothSameBooking ? (
                                /* Merged D+N — same booking */
                                <div
                                  className={`w-full flex items-center justify-center ${
                                    d.isToday ? 'bg-ocean-50/50' : d.isWeekend ? 'bg-gray-50/50' : ''
                                  }`}
                                  title={`${room.room_name} — Booked (Day + Night)`}
                                >
                                  <div
                                    className="w-full h-[24px] rounded-sm mx-0.5"
                                    style={{
                                      background: `linear-gradient(to right, ${color.bar} 50%, #334155 50%)`,
                                      opacity: 0.85,
                                      outline: `2px solid ${getOutlineColor(booked.day)}`,
                                      outlineOffset: '-1px',
                                    }}
                                  />
                                </div>
                              ) : (
                                <>
                                  {/* Day sub-column */}
                                  <div
                                    className={`flex-1 flex items-center justify-center ${
                                      d.isToday ? 'bg-ocean-50/50' : d.isWeekend ? 'bg-gray-50/50' : ''
                                    }`}
                                    style={{ borderRight: '1px solid #e2e8f0' }}
                                    title={booked.day ? `${room.room_name} — Day Tour (8AM–5PM)` : ''}
                                  >
                                    {booked.day && (
                                      <div
                                        className="w-full h-[24px] rounded-sm mx-0.5"
                                        style={{
                                          backgroundColor: color.bar,
                                          opacity: 0.85,
                                          outline: `2px solid ${getOutlineColor(booked.day)}`,
                                          outlineOffset: '-1px',
                                        }}
                                      />
                                    )}
                                  </div>
                                  {/* Night sub-column */}
                                  <div
                                    className={`flex-1 flex items-center justify-center ${
                                      d.isToday ? 'bg-ocean-50/50' : d.isWeekend ? 'bg-gray-50/50' : ''
                                    }`}
                                    title={booked.night ? `${room.room_name} — Night Tour (5PM–8AM)` : ''}
                                  >
                                    {booked.night && (
                                      <div
                                        className="w-full h-[24px] rounded-sm mx-0.5"
                                        style={{
                                          backgroundColor: '#334155',
                                          opacity: 0.85,
                                          outline: `2px solid ${getOutlineColor(booked.night)}`,
                                          outlineOffset: '-1px',
                                        }}
                                      />
                                    )}
                                  </div>
                                </>
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
        Each date is split into Day (D) and Night (N) slots
      </p>
    </div>
  )
}
