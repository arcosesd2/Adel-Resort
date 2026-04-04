'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

export default function AdminNewsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', published_date: '', is_active: true })
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.is_superadmin) { router.push('/admin-dashboard'); return }
    fetchItems()
  }, [user])

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/content/admin/news/')
      setItems(data)
    } catch { toast.error('Failed to load news') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', published_date: new Date().toISOString().split('T')[0], is_active: true })
    setImageFile(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ title: item.title, content: item.content, published_date: item.published_date, is_active: item.is_active })
    setImageFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('content', form.content)
    fd.append('published_date', form.published_date)
    fd.append('is_active', form.is_active)
    if (imageFile) fd.append('image', imageFile)

    try {
      if (editing) {
        const { data } = await api.patch(`/content/admin/news/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setItems(prev => prev.map(i => i.id === editing.id ? data : i))
        toast.success('News updated')
      } else {
        const { data } = await api.post('/content/admin/news/create/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setItems(prev => [data, ...prev])
        toast.success('News created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this news item?')) return
    try {
      await api.delete(`/content/admin/news/${id}/`)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('News deleted')
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (item) => {
    try {
      const { data } = await api.patch(`/content/admin/news/${item.id}/`, { is_active: !item.is_active })
      setItems(prev => prev.map(i => i.id === item.id ? data : i))
      toast.success(data.is_active ? 'Published' : 'Unpublished')
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="spinner" /></div>

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin-dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Manage News</h1>
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2"><Plus size={16} /> Add News</button>
        </div>

        {showForm && (
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit News' : 'Create News'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input type="text" className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input min-h-[120px]" required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Published Date</label>
                  <input type="date" className="input" required value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))} />
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
          <div className="card p-12 text-center text-gray-500">No news items yet.</div>
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                {item.image_url && (
                  <img src={cloudinaryUrl(item.image_url, { width: 100 })} alt={item.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-500">{format(parseISO(item.published_date), 'MMM d, yyyy')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(item)} className="p-2 text-gray-400 hover:text-ocean-600" title={item.is_active ? 'Unpublish' : 'Publish'}>
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
