'use client'

import { useState, useEffect, useCallback } from 'react'
import RoomCard from '@/components/RoomCard'
import RoomFilters from '@/components/RoomFilters'
import api from '@/lib/api'
import { Hotel } from 'lucide-react'

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})

  const fetchRooms = useCallback(async (f = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.room_type) params.set('room_type', f.room_type)
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
    fetchRooms()
  }, [fetchRooms])

  const handleFilter = (newFilters) => {
    setFilters(newFilters)
    fetchRooms(newFilters)
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Rooms & Accommodations
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Choose from our curated selection of beachfront rooms, suites, and private villas.
          </p>
        </div>

        {/* Filters */}
        <RoomFilters onFilter={handleFilter} />

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
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <Hotel size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No rooms found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-4">{rooms.length} room{rooms.length !== 1 ? 's' : ''} available</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
