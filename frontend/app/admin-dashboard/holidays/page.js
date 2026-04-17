'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const HOLIDAY_TYPES = [
  { value: 'regular', label: 'Regular Holiday', color: 'bg-red-100 text-red-700' },
  { value: 'special_non_working', label: 'Special Non-Working', color: 'bg-amber-100 text-amber-700' },
  { value: 'special_working', label: 'Special Working', color: 'bg-blue-100 text-blue-700' },
]

export default function HolidaysPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [holidays, setHolidays] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: '', holiday_type: 'regular', is_recurring: false,
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/holidays'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchHolidays()
  }, [isReady, isAuthenticated, user, router, year])

  const fetchHolidays = async () => {
    try { const { data } = await api.get('/hr/holidays/', { params: { year } }); setHolidays(data) } catch { toast.error('Failed to load.') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/holidays/', form)
      toast.success('Holiday added.')
      setShowForm(false)
      setForm({ date: '', name: '', holiday_type: 'regular', is_recurring: false })
      fetchHolidays()
    } catch (err) { toast.error(err.response?.data?.date?.[0] || err.response?.data?.detail || 'Failed.') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return
    try { await api.delete(`/hr/holidays/${id}/`); toast.success('Deleted.'); fetchHolidays() } catch { toast.error('Failed.') }
  }

  const getTypeConfig = (type) => HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[0]

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Holiday Calendar</h1>
        <div className="flex-1"></div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-1.5 border rounded-lg text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> Add Holiday</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Add Holiday</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="text-sm text-gray-600">Holiday Type</label>
              <select value={form.holiday_type} onChange={e => setForm({ ...form, holiday_type: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} className="rounded" />
              <label className="text-sm text-gray-600">Recurring (same date every year)</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Calendar size={20} /> {year} Holidays</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Recurring</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {holidays.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No holidays for {year}.</td></tr>}
            {holidays.map(h => {
              const tc = getTypeConfig(h.holiday_type)
              return (
                <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{h.date}</td>
                  <td className="px-4 py-2">{h.name}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span></td>
                  <td className="px-4 py-2">{h.is_recurring ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => handleDelete(h.id)} className="text-red-500 hover:underline"><Trash2 size={14} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
