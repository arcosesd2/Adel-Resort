'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

const ROOM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'suite', label: 'Suite' },
  { value: 'villa', label: 'Villa' },
  { value: 'bungalow', label: 'Bungalow' },
]

export default function RoomFilters({ onFilter }) {
  const [filters, setFilters] = useState({
    room_type: '',
    min_capacity: '',
    min_price: '',
    max_price: '',
  })

  const handleChange = (e) => {
    const updated = { ...filters, [e.target.name]: e.target.value }
    setFilters(updated)
    onFilter(updated)
  }

  const handleReset = () => {
    const reset = { room_type: '', min_capacity: '', min_price: '', max_price: '' }
    setFilters(reset)
    onFilter(reset)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
        <SlidersHorizontal size={18} />
        Filter Rooms
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Room Type</label>
          <select
            name="room_type"
            value={filters.room_type}
            onChange={handleChange}
            className="input-field py-2 text-sm"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Min Guests</label>
          <input
            type="number"
            name="min_capacity"
            value={filters.min_capacity}
            onChange={handleChange}
            min="1"
            placeholder="Any"
            className="input-field py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Min Price / Night</label>
          <input
            type="number"
            name="min_price"
            value={filters.min_price}
            onChange={handleChange}
            min="0"
            placeholder="$0"
            className="input-field py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Max Price / Night</label>
          <input
            type="number"
            name="max_price"
            value={filters.max_price}
            onChange={handleChange}
            min="0"
            placeholder="Any"
            className="input-field py-2 text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleReset}
        className="mt-3 text-sm text-ocean-600 hover:underline"
      >
        Clear filters
      </button>
    </div>
  )
}
