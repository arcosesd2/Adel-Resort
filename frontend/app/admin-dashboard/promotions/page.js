'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Send, Tag } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const ROOM_TYPES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'dos_andanas', label: 'Dos Andanas' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Air-Conditioned Room' },
  { value: 'kubo', label: 'Kubo' },
  { value: 'function_hall', label: 'Function Hall' },
  { value: 'trapal_table', label: 'Trapal Table' },
]

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const WEEKDAY_PRESETS = [
  { label: 'Every Weekday', days: [1, 2, 3, 4, 5] },
  { label: 'Every Weekend', days: [0, 6] },
  { label: 'Every Day', days: [0, 1, 2, 3, 4, 5, 6] },
]

const emptyForm = {
  title: '', description: '',
  discount_type: 'percentage', discount_value: '',
  schedule_type: 'duration', valid_from: '', valid_until: '',
  applicable_days: [], room_types: [],
  allows_voucher: false, min_booking_amount: '',
  is_active: true,
}

export default function AdminPromotionsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.is_staff) { router.push('/admin-dashboard'); return }
    fetchItems()
  }, [user])

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/content/admin/promotions/')
      setItems(data)
    } catch { toast.error('Failed to load promotions') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setImageFile(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      title: item.title, description: item.description,
      discount_type: item.discount_type, discount_value: item.discount_value,
      schedule_type: item.schedule_type,
      valid_from: item.valid_from || '', valid_until: item.valid_until || '',
      applicable_days: item.applicable_days || [], room_types: item.room_types || [],
      allows_voucher: item.allows_voucher || false,
      min_booking_amount: item.min_booking_amount || '',
      is_active: item.is_active,
    })
    setImageFile(null)
    setShowForm(true)
  }

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      applicable_days: f.applicable_days.includes(day)
        ? f.applicable_days.filter(d => d !== day)
        : [...f.applicable_days, day],
    }))
  }

  const toggleRoomType = (type) => {
    setForm(f => ({
      ...f,
      room_types: f.room_types.includes(type)
        ? f.room_types.filter(t => t !== type)
        : [...f.room_types, type],
    }))
  }

  const applyPreset = (days) => {
    setForm(f => ({ ...f, applicable_days: days }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    const payload = {
      ...form,
      discount_value: form.discount_value || '0',
      valid_from: form.schedule_type === 'duration' ? form.valid_from : '',
      valid_until: form.schedule_type === 'duration' ? form.valid_until : '',
      min_booking_amount: form.min_booking_amount || '',
      room_types: form.room_types.length > 0 ? JSON.stringify(form.room_types) : '[]',
      applicable_days: form.schedule_type === 'recurring' ? JSON.stringify(form.applicable_days) : '[]',
    }
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v)
    })
    if (imageFile) fd.append('image', imageFile)

    try {
      if (editing) {
        const { data } = await api.patch(`/content/admin/promotions/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setItems(prev => prev.map(i => i.id === editing.id ? data : i))
        toast.success('Promotion updated')
      } else {
        const { data } = await api.post('/content/admin/promotions/create/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setItems(prev => [data, ...prev])
        toast.success('Promotion created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this promotion?')) return
    try {
      await api.delete(`/content/admin/promotions/${id}/`)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Promotion deleted')
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (item) => {
    try {
      const { data } = await api.patch(`/content/admin/promotions/${item.id}/`, { is_active: !item.is_active })
      setItems(prev => prev.map(i => i.id === item.id ? data : i))
      toast.success(data.is_active ? 'Published' : 'Unpublished')
    } catch { toast.error('Failed to update') }
  }

  const handleBroadcast = async (item) => {
    const already = !!item.announcement_sent_at
    const msg = already
      ? `This promotion was already announced on ${format(parseISO(item.announcement_sent_at), 'MMM d, yyyy')}. Send again?`
      : `Send "${item.title}" to all newsletter subscribers and registered users?`
    if (!confirm(msg)) return
    try {
      const { data } = await api.post(`/content/admin/promotions/${item.id}/broadcast/`)
      toast.success(`Announcement sent to ${data.sent} recipient(s)`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, announcement_sent_at: data.announcement_sent_at } : i))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Broadcast failed')
    }
  }

  const discountLabel = (item) => {
    const val = item.discount_value
    return item.discount_type === 'percentage' ? `${val}% off` : `₱${Number(val).toLocaleString()} off`
  }

  const scheduleLabel = (item) => {
    if (item.schedule_type === 'permanent') return 'Permanent'
    if (item.schedule_type === 'recurring') {
      const dayLabels = DAYS.filter(d => (item.applicable_days || []).includes(d.value)).map(d => d.label.slice(0, 3))
      return dayLabels.length ? `Every ${dayLabels.join(', ')}` : 'Recurring'
    }
    return `${item.valid_from} – ${item.valid_until}`
  }

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="spinner" /></div>

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin-dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Manage Promotions</h1>
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Add Promotion</button>
        </div>

        {showForm && (
          <div className="card p-6 mb-8 border-2 border-ocean-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Promotion' : 'Create Promotion'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Title</label>
                  <input type="text" className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input min-h-[80px]" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>

              {/* Discount */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Tag size={16} className="text-ocean-500" /><h3 className="font-medium text-gray-700">Discount</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Discount Type</label>
                    <select className="input" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₱)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Discount Value</label>
                    <div className="relative">
                      {form.discount_type === 'fixed' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>}
                      <input type="number" step="0.01" min="0" className={`input ${form.discount_type === 'fixed' ? 'pl-7' : ''}`} required value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 500'} />
                      {form.discount_type === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Min. Booking Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      <input type="number" step="0.01" min="0" className="input pl-7" placeholder="Optional" value={form.min_booking_amount} onChange={e => setForm(f => ({ ...f, min_booking_amount: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Tag size={16} className="text-ocean-500" /><h3 className="font-medium text-gray-700">Schedule</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="label">Schedule Type</label>
                    <select className="input" value={form.schedule_type} onChange={e => setForm(f => ({ ...f, schedule_type: e.target.value }))}>
                      <option value="duration">Date Range</option>
                      <option value="recurring">Recurring (Weekly)</option>
                      <option value="permanent">Permanent</option>
                    </select>
                  </div>
                  {form.schedule_type === 'duration' && (
                    <>
                      <div><label className="label">Valid From</label><input type="date" className="input" required value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
                      <div><label className="label">Valid Until</label><input type="date" className="input" required value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
                    </>
                  )}
                </div>

                {form.schedule_type === 'recurring' && (
                  <div>
                    <label className="label">Applicable Days</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {WEEKDAY_PRESETS.map(preset => (
                        <button key={preset.label} type="button" onClick={() => applyPreset(preset.days)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            JSON.stringify([...form.applicable_days].sort()) === JSON.stringify([...preset.days].sort())
                              ? 'bg-ocean-100 border-ocean-400 text-ocean-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >{preset.label}</button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(day => (
                        <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                            form.applicable_days.includes(day.value)
                              ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >{day.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Room Types */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Tag size={16} className="text-ocean-500" /><h3 className="font-medium text-gray-700">Applicable Room Types</h3></div>
                <p className="text-xs text-gray-500 mb-2">Leave empty to apply to all room types.</p>
                <div className="flex flex-wrap gap-2">
                  {ROOM_TYPES.map(rt => (
                    <button key={rt.value} type="button" onClick={() => toggleRoomType(rt.value)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        form.room_types.includes(rt.value)
                          ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >{rt.label}</button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Tag size={16} className="text-ocean-500" /><h3 className="font-medium text-gray-700">Settings</h3></div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    Active (visible to public)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500" checked={form.allows_voucher} onChange={e => setForm(f => ({ ...f, allows_voucher: e.target.checked }))} />
                    Allow voucher on top of promotion
                  </label>
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="label">Image (optional)</label>
                <input type="file" accept="image/*" className="input" onChange={e => setImageFile(e.target.files[0])} />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">No promotions yet.</div>
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <div key={item.id} className={`card p-4 flex items-center gap-4 ${!item.is_active ? 'opacity-60' : ''}`}>
                {item.image_url ? (
                  <img src={cloudinaryUrl(item.image_url, { width: 100 })} alt={item.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Tag size={20} className="text-gray-300" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{discountLabel(item)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{item.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{scheduleLabel(item)}</span>
                    {item.allows_voucher && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Voucher stackable</span>
                    )}
                    {item.room_types?.length > 0 ? (
                      <span className="text-xs text-ocean-600">
                        {item.room_types.map(rt => ROOM_TYPES.find(t => t.value === rt)?.label || rt).join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">All rooms</span>
                    )}
                    {item.min_booking_amount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">Min. ₱{Number(item.min_booking_amount).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {item.announcement_sent_at && (
                    <span className="text-[10px] text-gray-400">Sent {format(parseISO(item.announcement_sent_at), 'MMM d')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleBroadcast(item)} disabled={!item.is_active} className="p-2 text-gray-400 hover:text-ocean-600 disabled:opacity-30" title={item.is_active ? 'Send announcement' : 'Activate to send'}><Send size={16} /></button>
                  <button onClick={() => toggleActive(item)} className="p-2 text-gray-400 hover:text-ocean-600">{item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                  <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-ocean-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
