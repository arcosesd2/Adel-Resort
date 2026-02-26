'use client'

import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import { isWithinInterval, parseISO, addDays } from 'date-fns'
import api from '@/lib/api'

export default function AvailabilityCalendar({ roomId, onDatesChange }) {
  const [bookedRanges, setBookedRanges] = useState([])
  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}/availability/`)
        setBookedRanges(data.booked_ranges)
      } catch (err) {
        console.error('Failed to load availability:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAvailability()
  }, [roomId])

  const isDateBooked = (date) => {
    return bookedRanges.some(({ check_in, check_out }) =>
      isWithinInterval(date, {
        start: parseISO(check_in),
        end: addDays(parseISO(check_out), -1),
      })
    )
  }

  const handleCheckIn = (date) => {
    setCheckIn(date)
    setCheckOut(null)
    onDatesChange?.(date, null)
  }

  const handleCheckOut = (date) => {
    setCheckOut(date)
    onDatesChange?.(checkIn, date)
  }

  const highlightDates = bookedRanges.flatMap(({ check_in, check_out }) => {
    const dates = []
    let current = parseISO(check_in)
    const end = parseISO(check_out)
    while (current < end) {
      dates.push(new Date(current))
      current = addDays(current, 1)
    }
    return dates
  })

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm mb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-ocean-500 inline-block" />
          Selected
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
          <DatePicker
            selected={checkIn}
            onChange={handleCheckIn}
            selectsStart
            startDate={checkIn}
            endDate={checkOut}
            minDate={new Date()}
            filterDate={(date) => !isDateBooked(date)}
            highlightDates={[
              { 'react-datepicker__day--highlighted-booked': highlightDates },
            ]}
            placeholderText="Select check-in date"
            className="input-field"
            dateFormat="MMM d, yyyy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
          <DatePicker
            selected={checkOut}
            onChange={handleCheckOut}
            selectsEnd
            startDate={checkIn}
            endDate={checkOut}
            minDate={checkIn ? addDays(checkIn, 1) : new Date()}
            filterDate={(date) => !isDateBooked(date)}
            highlightDates={[
              { 'react-datepicker__day--highlighted-booked': highlightDates },
            ]}
            placeholderText="Select check-out date"
            className="input-field"
            dateFormat="MMM d, yyyy"
            disabled={!checkIn}
          />
        </div>
      </div>
    </div>
  )
}
