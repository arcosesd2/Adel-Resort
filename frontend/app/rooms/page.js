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

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-navy-900 border border-ivory-300 dark:border-navy-700 rounded-xl overflow-hidden"
        >
          <div className="h-64 skeleton rounded-none" />
          <div className="p-6 space-y-3">
            <div className="h-5 skeleton w-3/4" />
            <div className="h-3 skeleton w-1/2" />
            <div className="h-3 skeleton w-2/3" />
            <div className="h-px skeleton my-3" />
            <div className="h-8 skeleton w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
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
    ? rooms.filter((r) => !r.is_weekend_walkin_restricted)
    : rooms

  return (
    <>
      <RoomFilters onFilter={handleFilter} initialFilters={{ room_type: initialRoomType }} />

      {showWeekendNotice && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-5 py-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Trapal Tables and Cottages can only be booked via walk-in during weekends.
          </p>
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : displayRooms.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-ivory-300 dark:border-navy-700 flex items-center justify-center text-navy-300 dark:text-navy-300">
            <Hotel size={26} strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-2xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">No rooms match.</h3>
          <p className="text-navy-500 dark:text-ivory-200 text-sm">Try adjusting the filters above.</p>
        </div>
      ) : (
        <>
          <p className="eyebrow mb-5">
            {displayRooms.length} {displayRooms.length === 1 ? 'room' : 'rooms'} available
          </p>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
    <div className="min-h-screen pt-24 pb-20 bg-ivory-100 dark:bg-navy-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInUp className="max-w-3xl mb-12 md:mb-16">
          <p className="eyebrow mb-3">Browse our rooms</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-navy-900 dark:text-ivory-100 mb-4 leading-tight tracking-tight">
            Rooms &amp; accommodations.
          </h1>
          <p className="text-navy-500 dark:text-ivory-200 text-base md:text-lg leading-relaxed max-w-2xl">
            Cottages, kubo rooms, fully furnished houses, air-conditioned suites, and event spaces — right by the shore.
          </p>
        </FadeInUp>

        <Suspense fallback={<SkeletonGrid />}>
          <RoomsContent />
        </Suspense>
      </div>
    </div>
  )
}
