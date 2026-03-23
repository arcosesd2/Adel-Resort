'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Fingerprint, Plus, Trash2, ToggleLeft, ToggleRight, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function DevicesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ user: '', fingerprint: '', device_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && !user.is_superadmin) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchDevices()
    fetchUsers()
  }, [user, router])

  const fetchDevices = async () => {
    try {
      const { data } = await api.get('/auth/devices/')
      setDevices(data)
    } catch { toast.error('Failed to load devices.') }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users/')
      setUsers(data)
    } catch {}
  }

  const handleToggle = async (d) => {
    try {
      await api.patch(`/auth/devices/${d.id}/`)
      fetchDevices()
    } catch { toast.error('Failed to toggle.') }
  }

  const handleDelete = async (d) => {
    if (!confirm(`Delete device ${d.device_name || d.fingerprint.slice(0, 12)}?`)) return
    try {
      await api.delete(`/auth/devices/${d.id}/`)
      fetchDevices()
      toast.success('Device deleted.')
    } catch { toast.error('Failed to delete.') }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/auth/devices/', form)
      toast.success('Device registered!')
      setModal(false)
      setForm({ user: '', fingerprint: '', device_name: '' })
      fetchDevices()
    } catch (err) {
      toast.error(err.response?.data?.fingerprint?.[0] || err.response?.data?.detail || 'Failed to register.')
    } finally { setSaving(false) }
  }

  if (!user?.is_superadmin) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Registered Devices</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Fingerprint size={20} /> Devices</h2>
          <button onClick={() => setModal(true)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> Register Device</button>
        </div>

        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Device Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fingerprint</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Registered</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-800">{d.user_email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{d.device_name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 font-mono">{d.fingerprint.slice(0, 12)}...</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(d.registered_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => handleToggle(d)} className="text-gray-500 hover:text-ocean-600" title="Toggle active">
                        {d.is_active ? <ToggleRight size={18} className="inline" /> : <ToggleLeft size={18} className="inline" />}
                      </button>
                      <button onClick={() => handleDelete(d)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 size={16} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No devices registered</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Device Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Register Device</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select required value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} className="input-field">
                  <option value="">Select user</option>
                  {users.filter(u => u.is_staff).map(u => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fingerprint</label>
                <input type="text" required value={form.fingerprint} maxLength={64}
                  onChange={e => setForm(f => ({ ...f, fingerprint: e.target.value }))}
                  className="input-field font-mono" placeholder="SHA-256 hash" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Name (optional)</label>
                <input type="text" value={form.device_name}
                  onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))}
                  className="input-field" placeholder="e.g. Office Laptop" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Register'}
                </button>
                <button type="button" onClick={() => setModal(false)} className="btn-outline text-sm px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
