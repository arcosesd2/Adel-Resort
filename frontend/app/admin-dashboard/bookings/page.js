'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarPlus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import SlotPicker from '@/components/SlotPicker'
import BookingManagementSection from '@/components/admin/BookingManagementSection'

function BookingsPageContent() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [rooms, setRooms] = useState([])
  const [showOnsiteForm, setShowOnsiteForm] = useState(false)
  const [onsiteForm, setOnsiteForm] = useState({
    guest_name: '', guest_username: '', guest_phone: '',
    room: '', guests: 1, slots: [], special_requests: '', manual_discount: '',
  })
  const [creatingOnsite, setCreatingOnsite] = useState(false)
  const [onsiteVoucherCode, setOnsiteVoucherCode] = useState('')
  const [vouchers, setVouchers] = useState([])
  const [bookingRefreshKey, setBookingRefreshKey] = useState(0)

  const onsiteSectionRef = useRef(null)
  const guestNameRef = useRef(null)

  const selectedRoom = useMemo(() => {
    if (!onsiteForm.room) return null
    return rooms.find(r => r.id == onsiteForm.room) || null
  }, [onsiteForm.room, rooms])

  const onsiteVoucherPreview = useMemo(() => {
    if (!onsiteVoucherCode.trim() || vouchers.length === 0) return null
    const v = vouchers.find(v => v.code.toLowerCase() === onsiteVoucherCode.trim().toLowerCase())
    if (!v) return { error: 'Voucher not found' }
    if (!v.is_active) return { error: 'Voucher is inactive' }
    const now = new Date()
    if (now < new Date(v.valid_from) || now > new Date(v.valid_until)) return { error: 'Voucher expired' }
    if (v.max_uses && v.times_used >= v.max_uses) return { error: 'Voucher fully used' }
    return {
      valid: true,
      label: v.discount_type === 'percentage' ? `${v.discount_value}% off` : `₱${v.discount_value} off`,
    }
  }, [onsiteVoucherCode, vouchers])

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/bookings'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    fetchRooms()
    fetchVouchers()
  }, [isReady, isAuthenticated, user, router])

  // Pre-fill room from URL query param
  useEffect(() => {
    const roomParam = searchParams.get('room')
    if (roomParam && rooms.length > 0) {
      const roomExists = rooms.find(r => r.id == roomParam)
      if (roomExists) {
        setOnsiteForm(f => ({ ...f, room: roomParam, slots: [] }))
        setShowOnsiteForm(true)
        setTimeout(() => {
          onsiteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setTimeout(() => guestNameRef.current?.focus(), 500)
        }, 100)
      }
    }
  }, [searchParams, rooms])

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms/')
      setRooms(data.results || data)
    } catch {}
  }

  const fetchVouchers = async () => {
    try {
      const { data } = await api.get('/vouchers/')
      setVouchers(data)
    } catch {}
  }

  const handleCreateOnsiteBooking = async (e) => {
    e.preventDefault()
    if (onsiteForm.slots.length === 0) { toast.error('Add at least one slot.'); return }
    setCreatingOnsite(true)
    try {
      const payload = {
        guest_name: onsiteForm.guest_name,
        guest_username: onsiteForm.guest_username || undefined,
        guest_phone: onsiteForm.guest_phone || undefined,
        room: parseInt(onsiteForm.room),
        guests: parseInt(onsiteForm.guests),
        slots: onsiteForm.slots,
        special_requests: onsiteForm.special_requests,
      }
      if (onsiteVoucherCode.trim()) payload.voucher_code = onsiteVoucherCode.trim()
      if (onsiteForm.manual_discount) payload.manual_discount = parseFloat(onsiteForm.manual_discount)
      const { data } = await api.post('/bookings/onsite/', payload)
      let msg = `Onsite booking created! #${data.id} - ${data.room} - ₱${data.total_price}`
      if (data.manual_discount) msg += ` (₱${data.manual_discount} manual discount)`
      if (data.discount) msg += ` (₱${data.discount} voucher discount with ${data.voucher_code})`
      toast.success(msg)
      setOnsiteForm({ guest_name: '', guest_username: '', guest_phone: '', room: '', guests: 1, slots: [], special_requests: '', manual_discount: '' })
      setOnsiteVoucherCode('')
      setShowOnsiteForm(false)
      setBookingRefreshKey(k => k + 1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create booking.')
    } finally {
      setCreatingOnsite(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Booking Management</h1>
      </div>

      {/* Onsite Booking */}
      <div ref={onsiteSectionRef} className="card overflow-hidden mb-10">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <CalendarPlus size={20} /> Onsite Booking
          </h2>
          <button
            onClick={() => setShowOnsiteForm(!showOnsiteForm)}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={14} /> Walk-in Booking
          </button>
        </div>

        {showOnsiteForm && (
          <form onSubmit={handleCreateOnsiteBooking} className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                <input ref={guestNameRef} type="text" required value={onsiteForm.guest_name}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_name: e.target.value }))}
                  className="input-field" placeholder="e.g. Juan Dela Cruz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username (optional)</label>
                <input type="text" value={onsiteForm.guest_username}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_username: e.target.value }))}
                  className="input-field" placeholder="guest username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="text" value={onsiteForm.guest_phone}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_phone: e.target.value }))}
                  className="input-field" placeholder="09XX XXX XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                <select required value={onsiteForm.room}
                  onChange={e => setOnsiteForm(f => ({ ...f, room: e.target.value, slots: [] }))}
                  className="input-field">
                  <option value="">Select a room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (max {r.capacity} pax)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                <input type="number" min="1" required value={onsiteForm.guests}
                  onChange={e => setOnsiteForm(f => ({ ...f, guests: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <input type="text" value={onsiteForm.special_requests}
                  onChange={e => setOnsiteForm(f => ({ ...f, special_requests: e.target.value }))}
                  className="input-field" placeholder="Optional notes" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Code (optional)</label>
                <input type="text" value={onsiteVoucherCode}
                  onChange={e => setOnsiteVoucherCode(e.target.value)}
                  className="input-field" placeholder="e.g. SUMMER20" />
                {onsiteVoucherPreview && (
                  <p className={`text-xs mt-1 ${onsiteVoucherPreview.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {onsiteVoucherPreview.valid ? onsiteVoucherPreview.label : onsiteVoucherPreview.error}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manual Discount ₱ (optional)</label>
                <input type="number" min="0" step="0.01" value={onsiteForm.manual_discount}
                  onChange={e => setOnsiteForm(f => ({ ...f, manual_discount: e.target.value }))}
                  className="input-field" placeholder="e.g. 500" />
              </div>
            </div>

            {selectedRoom && (
              <div className="mt-4">
                <SlotPicker
                  key={selectedRoom.id}
                  roomId={selectedRoom.id}
                  isDayOnly={selectedRoom.is_day_only}
                  bookingMode={selectedRoom.booking_mode}
                  onSlotsChange={(slots) => setOnsiteForm(f => ({ ...f, slots }))}
                />
              </div>
            )}

            {!selectedRoom && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-500 text-center">
                Select a room to see the availability calendar
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creatingOnsite} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {creatingOnsite ? 'Creating...' : 'Create Booking'}
              </button>
              <button type="button" onClick={() => setShowOnsiteForm(false)} className="btn-outline text-sm px-4 py-2">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Booking list */}
      <BookingManagementSection key={bookingRefreshKey} />
    </div>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto"><div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" /></div>}>
      <BookingsPageContent />
    </Suspense>
  )
}
