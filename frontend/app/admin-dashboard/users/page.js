'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const emptyForm = { email: '', first_name: '', last_name: '', phone: '', password: '', is_staff: false, is_superadmin: false }

export default function UsersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'create' | 'edit'
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && !user.is_superadmin) { router.replace('/admin-dashboard'); return }
    if (!user) return
    fetchUsers()
  }, [user, router])

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users/')
      setUsers(data)
    } catch { toast.error('Failed to load users.') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setModal('create')
  }

  const openEdit = (u) => {
    setForm({ email: u.email, first_name: u.first_name, last_name: u.last_name, phone: u.phone || '', password: '', is_staff: u.is_staff, is_superadmin: u.is_superadmin })
    setEditId(u.id)
    setModal('edit')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.post('/auth/users/', form)
        toast.success('User created!')
      } else {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.patch(`/auth/users/${editId}/`, payload)
        toast.success('User updated!')
      }
      setModal(null)
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.password?.[0] || err.response?.data?.detail || 'Failed to save.'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => {
    try {
      await api.patch(`/auth/users/${u.id}/`, { is_active: !u.is_active })
      fetchUsers()
    } catch { toast.error('Failed to toggle.') }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete ${u.email}?`)) return
    try {
      await api.delete(`/auth/users/${u.id}/`)
      fetchUsers()
      toast.success('User deleted.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete.')
    }
  }

  const roleBadge = (u) => {
    if (u.is_superadmin) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Superadmin</span>
    if (u.is_staff) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Staff</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">User</span>
  }

  if (!user?.is_superadmin) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">User Management</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Shield size={20} /> All Users</h2>
          <button onClick={openCreate} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> New User</button>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-800">{u.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.first_name} {u.last_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{u.phone || '—'}</td>
                    <td className="px-6 py-3 text-center">{roleBadge(u)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(u)} className="text-gray-500 hover:text-ocean-600 text-xs underline">Edit</button>
                      <button onClick={() => handleToggleActive(u)} className="text-gray-500 hover:text-ocean-600" title="Toggle active">
                        {u.is_active ? <ToggleRight size={18} className="inline" /> : <ToggleLeft size={18} className="inline" />}
                      </button>
                      <button onClick={() => handleDelete(u)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 size={16} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{modal === 'create' ? 'Create User' : 'Edit User'}</h3>
              <button onClick={() => setModal(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={form.email} disabled={modal === 'edit'}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field disabled:bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" required value={form.first_name}
                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" required value={form.last_name}
                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {modal === 'edit' && <span className="text-gray-400">(leave blank to keep)</span>}
                </label>
                <input type="password" value={form.password} required={modal === 'create'} minLength={8}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_staff}
                    onChange={e => setForm(f => ({ ...f, is_staff: e.target.checked }))} />
                  Staff
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_superadmin}
                    onChange={e => setForm(f => ({ ...f, is_superadmin: e.target.checked }))} />
                  Superadmin
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Save'}
                </button>
                <button type="button" onClick={() => setModal(null)} className="btn-outline text-sm px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
