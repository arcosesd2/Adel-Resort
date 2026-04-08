'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const ROOM_TYPES = [
  { value: 'cottage', label: 'Cottage' },
  { value: 'dos_andanas', label: 'Dos Andanas' },
  { value: 'lavender_house', label: 'Lavender House' },
  { value: 'ac_karaoke', label: 'Air-Conditioned Karaoke Room' },
  { value: 'kubo', label: 'Kubo' },
  { value: 'function_hall', label: 'Function Hall' },
  { value: 'trapal_table', label: 'Trapal Table' },
]

export default function AdminPricingPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ room_type: 'cottage', label: '', day_price: '', night_price: '', notes: '', order: 0 })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) { router.push('/admin-dashboard'); return }
    fetchItems()
  }, [user])

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/content/admin/pricing/')
      setItems(data)
    } catch { toast.error('Failed to load pricing') }
    finally { setLoading(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({ label: item.label, day_price: item.day_price, night_price: item.night_price || '', notes: item.notes, order: item.order })
  }

  const saveEdit = async (id) => {
    setSubmitting(true)
    try {
      const payload = {
        ...editForm,
        day_price: parseFloat(editForm.day_price),
        night_price: editForm.night_price ? parseFloat(editForm.night_price) : null,
        order: parseInt(editForm.order),
      }
      const { data } = await api.patch(`/content/admin/pricing/${id}/`, payload)
      setItems(prev => prev.map(i => i.id === id ? data : i))
      setEditingId(null)
      toast.success('Pricing updated')
    } catch { toast.error('Failed to update') }
    finally { setSubmitting(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...createForm,
        day_price: parseFloat(createForm.day_price),
        night_price: createForm.night_price ? parseFloat(createForm.night_price) : null,
        order: parseInt(createForm.order),
      }
      const { data } = await api.post('/content/admin/pricing/create/', payload)
      setItems(prev => [...prev, data].sort((a, b) => a.order - b.order))
      setShowCreate(false)
      setCreateForm({ room_type: 'cottage', label: '', day_price: '', night_price: '', notes: '', order: 0 })
      toast.success('Pricing created')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this pricing entry?')) return
    try {
      await api.delete(`/content/admin/pricing/${id}/`)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Pricing deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="spinner" /></div>

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin-dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Manage Pricing</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Add Entry</button>
        </div>

        {showCreate && (
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Pricing Entry</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Room Type</label>
                  <select className="input" value={createForm.room_type} onChange={e => setCreateForm(f => ({ ...f, room_type: e.target.value }))}>
                    {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Label</label>
                  <input type="text" className="input" required value={createForm.label} onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label">Day Price</label>
                  <input type="number" step="0.01" className="input" required value={createForm.day_price} onChange={e => setCreateForm(f => ({ ...f, day_price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Night Price</label>
                  <input type="number" step="0.01" className="input" placeholder="Optional" value={createForm.night_price} onChange={e => setCreateForm(f => ({ ...f, night_price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Order</label>
                  <input type="number" className="input" value={createForm.order} onChange={e => setCreateForm(f => ({ ...f, order: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <input type="text" className="input" placeholder="Optional" value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create'}</button>
            </form>
          </div>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Order</th>
                <th className="text-left p-3 font-medium text-gray-600">Type</th>
                <th className="text-left p-3 font-medium text-gray-600">Label</th>
                <th className="text-right p-3 font-medium text-gray-600">Day Price</th>
                <th className="text-right p-3 font-medium text-gray-600">Night Price</th>
                <th className="text-left p-3 font-medium text-gray-600">Notes</th>
                <th className="text-right p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  {editingId === item.id ? (
                    <>
                      <td className="p-2"><input type="number" className="input text-sm w-16" value={editForm.order} onChange={e => setEditForm(f => ({ ...f, order: e.target.value }))} /></td>
                      <td className="p-3 text-gray-500">{item.room_type_display}</td>
                      <td className="p-2"><input type="text" className="input text-sm" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} /></td>
                      <td className="p-2"><input type="number" step="0.01" className="input text-sm w-28 text-right" value={editForm.day_price} onChange={e => setEditForm(f => ({ ...f, day_price: e.target.value }))} /></td>
                      <td className="p-2"><input type="number" step="0.01" className="input text-sm w-28 text-right" placeholder="—" value={editForm.night_price} onChange={e => setEditForm(f => ({ ...f, night_price: e.target.value }))} /></td>
                      <td className="p-2"><input type="text" className="input text-sm" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => saveEdit(item.id)} disabled={submitting} className="p-2 text-green-600 hover:text-green-800"><Save size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-gray-400">{item.order}</td>
                      <td className="p-3 text-gray-500">{item.room_type_display}</td>
                      <td className="p-3 font-medium text-gray-900">{item.label}</td>
                      <td className="p-3 text-right text-gray-900">₱{Number(item.day_price).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-900">{item.night_price ? `₱${Number(item.night_price).toLocaleString()}` : '—'}</td>
                      <td className="p-3 text-gray-500 max-w-[200px] truncate">{item.notes || '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-ocean-600"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-12 text-center text-gray-500">No pricing entries yet.</div>}
        </div>
      </div>
    </div>
  )
}
