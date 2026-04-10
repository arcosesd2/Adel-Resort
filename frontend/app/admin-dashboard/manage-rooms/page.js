'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const ROOM_TYPES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'dos_andanas', label: 'Dos Andanas' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Air-Conditioned Karaoke Room' },
  { value: 'kubo', label: 'Kubo' },
  { value: 'function_hall', label: 'Function Hall' },
  { value: 'trapal_table', label: 'Trapal Table' },
]

const BOOKING_MODES = [
  { value: 'slot', label: 'Day/Night Slot' },
  { value: 'overnight', label: 'Overnight (Check-in 2PM / Check-out 12NN)' },
  { value: '24hr', label: '24-Hour (Check-in & Check-out same time next day)' },
]

const emptyForm = {
  name: '', room_type: 'cottage', booking_mode: 'slot', description: '', day_price: '', night_price: '',
  is_day_only: false, capacity: 2, max_rooms: 1, size_sqm: '', amenities: '', is_active: true,
}

export default function AdminManageRoomsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) { router.push('/admin-dashboard'); return }
    fetchRooms()
  }, [user])

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms/admin/')
      setRooms(data)
    } catch { toast.error('Failed to load rooms') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (room) => {
    setEditing(room)
    setForm({
      name: room.name, room_type: room.room_type, booking_mode: room.booking_mode, description: room.description,
      day_price: room.day_price, night_price: room.night_price || '',
      is_day_only: room.is_day_only, capacity: room.capacity, max_rooms: room.max_rooms,
      size_sqm: room.size_sqm || '', amenities: (room.amenities || []).join(', '), is_active: room.is_active,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      ...form,
      day_price: parseFloat(form.day_price),
      night_price: form.night_price ? parseFloat(form.night_price) : null,
      capacity: parseInt(form.capacity),
      max_rooms: parseInt(form.max_rooms),
      size_sqm: form.size_sqm ? parseInt(form.size_sqm) : null,
      amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
    }

    try {
      if (editing) {
        const { data } = await api.patch(`/rooms/admin/${editing.id}/`, payload)
        setRooms(prev => prev.map(r => r.id === editing.id ? data : r))
        toast.success('Room updated')
      } else {
        const { data } = await api.post('/rooms/admin/create/', payload)
        setRooms(prev => [...prev, data])
        toast.success('Room created')
      }
      setShowForm(false)
    } catch (err) {
      const errors = err.response?.data
      if (errors && typeof errors === 'object') {
        const msg = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
        toast.error(msg)
      } else {
        toast.error('Failed to save')
      }
    } finally { setSubmitting(false) }
  }

  const handleDeactivate = async (room) => {
    if (!confirm(`Deactivate "${room.name}"? It will be hidden from the public.`)) return
    try {
      await api.delete(`/rooms/admin/${room.id}/`)
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_active: false } : r))
      toast.success('Room deactivated')
    } catch { toast.error('Failed to deactivate') }
  }

  const toggleActive = async (room) => {
    try {
      const { data } = await api.patch(`/rooms/admin/${room.id}/`, { is_active: !room.is_active })
      setRooms(prev => prev.map(r => r.id === room.id ? data : r))
      toast.success(data.is_active ? 'Room activated' : 'Room deactivated')
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="spinner" /></div>

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin-dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Manage Rooms</h1>
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Add Room</button>
        </div>

        {showForm && (
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Room' : 'Create Room'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input type="text" className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Room Type</label>
                  <select className="input" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
                    {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Booking Mode</label>
                  <select className="input" value={form.booking_mode} onChange={e => {
                    const mode = e.target.value
                    setForm(f => ({ ...f, booking_mode: mode, is_day_only: mode !== 'slot' ? false : f.is_day_only, night_price: mode !== 'slot' ? '' : f.night_price }))
                  }}>
                    {BOOKING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[100px]" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label">{form.booking_mode === 'overnight' ? 'Nightly Rate' : form.booking_mode === '24hr' ? 'Daily Rate (24hr)' : 'Day Price'}</label>
                  <input type="number" step="0.01" className="input" required value={form.day_price} onChange={e => setForm(f => ({ ...f, day_price: e.target.value }))} />
                </div>
                {form.booking_mode === 'slot' && (
                  <div>
                    <label className="label">Night Price</label>
                    <input type="number" step="0.01" className="input" placeholder="Optional" value={form.night_price} onChange={e => setForm(f => ({ ...f, night_price: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="label">Capacity</label>
                  <input type="number" className="input" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Units</label>
                  <input type="number" className="input" required value={form.max_rooms} onChange={e => setForm(f => ({ ...f, max_rooms: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Size (sqm)</label>
                  <input type="number" className="input" placeholder="Optional" value={form.size_sqm} onChange={e => setForm(f => ({ ...f, size_sqm: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Amenities (comma-separated)</label>
                  <input type="text" className="input" placeholder="e.g. WiFi, AC, TV" value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                {form.booking_mode === 'slot' && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.is_day_only} onChange={e => setForm(f => ({ ...f, is_day_only: e.target.checked }))} />
                    Day tour only
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active (visible to public)
                </label>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editing ? 'Update Room' : 'Create Room'}
              </button>
            </form>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">No rooms yet.</div>
        ) : (
          <div className="grid gap-4">
            {rooms.map(room => (
              <div key={room.id} className={`card p-4 flex items-center gap-4 ${!room.is_active ? 'opacity-60' : ''}`}>
                {room.primary_image ? (
                  <img src={cloudinaryUrl(room.primary_image, { width: 100 })} alt={room.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><ImageIcon size={20} className="text-gray-300" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.room_type_display} &middot; {room.capacity} pax &middot; {room.max_rooms} unit(s) &middot; {room.booking_mode === 'slot' ? 'Day/Night' : room.booking_mode === 'overnight' ? 'Overnight' : '24-Hour'}</p>
                  <p className="text-sm text-ocean-600 font-medium">
                    {room.booking_mode === 'overnight' ? '₱' + Number(room.day_price).toLocaleString() + '/night' : room.booking_mode === '24hr' ? '₱' + Number(room.day_price).toLocaleString() + '/day (24hr)' : <>Day: ₱{Number(room.day_price).toLocaleString()}{room.night_price && <> &middot; Night: ₱{Number(room.night_price).toLocaleString()}</>}</>}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {room.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(room)} className="p-2 text-gray-400 hover:text-ocean-600" title={room.is_active ? 'Deactivate' : 'Activate'}>
                    {room.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <Link href={`/admin-dashboard/rooms?room=${room.id}`} className="p-2 text-gray-400 hover:text-ocean-600" title="Manage Photos">
                    <ImageIcon size={16} />
                  </Link>
                  <button onClick={() => openEdit(room)} className="p-2 text-gray-400 hover:text-ocean-600"><Pencil size={16} /></button>
                  {room.is_active && (
                    <button onClick={() => handleDeactivate(room)} className="p-2 text-gray-400 hover:text-red-600" title="Deactivate"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
