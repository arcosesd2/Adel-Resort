'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import RoomCard from '@/components/RoomCard'
import RoomFilters from '@/components/RoomFilters'
import api from '@/lib/api'
import { Hotel, AlertTriangle } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'

function isWeekend(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDay() === 0 || d.getDay() === 6
}

function RoomsContent() {
  const searchParams = useSearchParams()
  const initialRoomType = searchParams.get('room_type') || ''

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [weekendWalkinOnly, setWeekendWalkinOnly] = useState(false)

  useEffect(() => {
    api.get('/content/settings/')
      .then(({ data }) => setWeekendWalkinOnly(!!data.weekend_walkin_only))
      .catch(() => {})
  }, [])

  const fetchRooms = useCallback(async (f = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.room_type) params.set('room_type', f.room_type)
      if (f.date) params.set('date', f.date)
      if (f.min_capacity) params.set('min_capacity', f.min_capacity)
      if (f.min_price) params.set('min_price', f.min_price)
      if (f.max_price) params.set('max_price', f.max_price)

      const { data } = await api.get(`/rooms/?${params.toString()}`)
      setRooms(data.results || data)
    } catch (err) {
      console.error('Failed to load rooms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initial = initialRoomType ? { room_type: initialRoomType } : {}
    setFilters(initial)
    fetchRooms(initial)
  }, [fetchRooms, initialRoomType])

  const handleFilter = (newFilters) => {
    setFilters(newFilters)
    fetchRooms(newFilters)
  }

  const showWeekendNotice = weekendWalkinOnly && isWeekend(filters.date)
  const displayRooms = showWeekendNotice
    ? rooms.filter(r => !r.is_weekend_walkin_restricted)
    : rooms

  return (
    <>
      {/* Filters */}
      <RoomFilters onFilter={handleFilter} initialFilters={{ room_type: initialRoomType }} />

      {/* Weekend walk-in notice */}
      {showWeekendNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            All Trapal Tables and Cottages can only be booked via walk-in during the weekends.
          </p>
        </div>
      )}

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-56 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayRooms.length === 0 ? (
        <div className="text-center py-20">
          <Hotel size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-500 mb-2">No rooms found</h3>
          <p className="text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">{displayRooms.length} room{displayRooms.length !== 1 ? 's' : ''} available</p>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRooms.map((room) => (
              <StaggerItem key={room.id}>
                <RoomCard room={room} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </>
      )}
    </>
  )
}

export default function RoomsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-ocean-50 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeInUp className="text-center mb-10">
          <p className="text-ocean-600 font-semibold tracking-widest text-sm uppercase mb-3">Browse Our Rooms</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Rooms & Accommodations
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Choose from cottages, kubo rooms, fully furnished houses, air-conditioned rooms, and more.
          </p>
        </FadeInUp>

        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-56 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        }>
          <RoomsContent />
        </Suspense>
      </div>
    </div>
  )
}
