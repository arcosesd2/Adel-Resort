'use client'

import React, { useState } from 'react'
import { Home, ChevronDown, ChevronRight } from 'lucide-react'
import SlotPicker from '@/components/SlotPicker'

export default function RoomOccupancySection({ data }) {
  const [open, setOpen] = useState(true)
  const [expandedRooms, setExpandedRooms] = useState({})

  const rooms = data?.room_occupancy || []

  const toggleRoom = (roomId) => {
    setExpandedRooms(prev => ({ ...prev, [roomId]: !prev[roomId] }))
  }

  const barColor = (pct) => {
    if (pct > 70) return 'bg-red-500'
    if (pct > 30) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <Home size={20} /> Room Occupancy Overview
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Booked Slots</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Occupancy (30d)</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Upcoming</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map(room => {
                const isExpanded = expandedRooms[room.room_id]
                return (
                  <React.Fragment key={room.room_id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleRoom(room.room_id)}
                    >
                      <td className="px-6 py-3 text-sm text-gray-700 flex items-center gap-2">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                          : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                        <span className="font-medium">{room.room_name}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{room.room_type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-center">
                        {room.total_booked_slots} / {room.max_slots}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[120px]">
                            <div
                              className={`h-2.5 rounded-full ${barColor(room.occupancy_pct)}`}
                              style={{ width: `${Math.min(room.occupancy_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{room.occupancy_pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-center">{room.upcoming_bookings}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={5} className="px-6 pb-4">
                          <SlotPicker
                            key={room.room_id}
                            roomId={room.room_id}
                            isDayOnly={room.is_day_only}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {rooms.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No active rooms</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
