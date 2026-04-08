'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Send } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

export default function AdminPromotionsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', discount_info: '', valid_from: '', valid_until: '', is_active: true })
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) { router.push('/admin-dashboard'); return }
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
    setForm({ title: '', description: '', discount_info: '', valid_from: '', valid_until: '', is_active: true })
    setImageFile(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      title: item.title, description: item.description, discount_info: item.discount_info,
      valid_from: item.valid_from, valid_until: item.valid_until, is_active: item.is_active,
    })
    setImageFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
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
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Promotion' : 'Create Promotion'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input type="text" className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[100px]" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Discount Info</label>
                <input type="text" className="input" required placeholder="e.g. 20% off, Buy 1 Get 1" value={form.discount_info} onChange={e => setForm(f => ({ ...f, discount_info: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Valid From</label>
                  <input type="date" className="input" required value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Valid Until</label>
                  <input type="date" className="input" required value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Image</label>
                  <input type="file" accept="image/*" className="input" onChange={e => setImageFile(e.target.files[0])} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible to public)</label>
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
              <div key={item.id} className="card p-4 flex items-center gap-4">
                {item.image_url && (
                  <img src={cloudinaryUrl(item.image_url, { width: 100 })} alt={item.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.discount_info}</p>
                  <p className="text-xs text-gray-400">
                    {format(parseISO(item.valid_from), 'MMM d')} &ndash; {format(parseISO(item.valid_until), 'MMM d, yyyy')}
                  </p>
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
                  <button
                    onClick={() => handleBroadcast(item)}
                    disabled={!item.is_active}
                    className="p-2 text-gray-400 hover:text-ocean-600 disabled:opacity-30 disabled:hover:text-gray-400"
                    title={item.is_active ? 'Send announcement to subscribers' : 'Activate to send'}
                  >
                    <Send size={16} />
                  </button>
                  <button onClick={() => toggleActive(item)} className="p-2 text-gray-400 hover:text-ocean-600">
                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
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
