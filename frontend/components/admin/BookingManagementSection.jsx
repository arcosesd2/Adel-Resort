'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'cancelled', 'completed']

const statusBadge = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function BookingManagementSection() {
  const [open, setOpen] = useState(true)
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await api.get(`/bookings/admin/${params}`)
      setBookings(data.results || data)
    } catch {
      toast.error('Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (open) fetchBookings()
  }, [open, fetchBookings])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/bookings/admin/${id}/`, { status: newStatus })
      toast.success(`Booking #${id} updated to ${newStatus}`)
      fetchBookings()
    } catch {
      toast.error('Failed to update status.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(`Delete booking #${id}? This cannot be undone.`)) return
    try {
      await api.delete(`/bookings/admin/${id}/`)
      toast.success(`Booking #${id} deleted.`)
      fetchBookings()
    } catch {
      toast.error('Failed to delete booking.')
    }
  }

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <ClipboardList size={20} /> Booking Management
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <>
          {/* Filter */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            {loading && <span className="text-xs text-gray-400">Loading...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Guest</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Check-in/out</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700 font-mono">#{b.id}</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium text-gray-800">{b.guest_name}</div>
                      <div className="text-xs text-gray-400">{b.guest_email}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{b.room_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {b.check_in} <span className="text-gray-400">to</span> {b.check_out}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">
                      ₱{Number(b.total_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[b.status] || 'bg-gray-100 text-gray-500'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 text-right">
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                      >
                        {['pending', 'confirmed', 'cancelled', 'completed'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete booking"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No bookings found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
