'use client'

import { useState, useEffect } from 'react'
import { parseISO, addDays, format, isWithinInterval } from 'date-fns'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const typeColors = {
  standard: '#3b82f6',
  deluxe: '#8b5cf6',
  suite: '#f59e0b',
  villa: '#10b981',
  bungalow: '#f97316',
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

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const getBookedRoomsForDate = (date) => {
    return roomsAvailability.filter(room =>
      room.booked_ranges.some(({ check_in, check_out }) =>
        isWithinInterval(date, {
          start: parseISO(check_in),
          end: addDays(parseISO(check_out), -1),
        })
      )
    )
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {roomsAvailability.map(room => (
          <div key={room.room_id} className="flex items-center gap-1.5 text-sm">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: typeColors[room.room_type] || '#6b7280' }}
            />
            {room.room_name}
          </div>
        ))}
      </div>

      {/* Calendar header */}
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(viewYear, viewMonth, day)
          const bookedRooms = getBookedRoomsForDate(date)
          const isPast = date < today && date.toDateString() !== today.toDateString()

          return (
            <div
              key={day}
              className={`min-h-[60px] border rounded-lg p-1 text-xs ${
                isPast ? 'bg-gray-50 opacity-50' : 'bg-white hover:bg-ocean-50'
              }`}
            >
              <div className={`font-medium mb-1 ${isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {bookedRooms.map(room => (
                  <div
                    key={room.room_id}
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: typeColors[room.room_type] || '#6b7280' }}
                    title={`${room.room_name} - Booked`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-gray-400 mt-4">
        Colored bars indicate booked rooms for that day
      </p>
    </div>
  )
}
