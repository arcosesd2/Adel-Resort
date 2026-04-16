'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, Plus, Trash2, ToggleLeft, ToggleRight, X, ArrowLeft, Smartphone } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const emptyForm = { username: '', first_name: '', last_name: '', phone: '', password: '', is_staff: false, is_admin: false, is_superadmin: false }

export default function UsersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('staff')
  const [modal, setModal] = useState(null)
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

  const staffUsers = useMemo(() => users.filter(u => u.is_staff || u.is_superadmin), [users])
  const customerUsers = useMemo(() => users.filter(u => !u.is_staff && !u.is_superadmin), [users])
  const displayedUsers = tab === 'staff' ? staffUsers : customerUsers

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setModal('create')
  }

  const openEdit = (u) => {
    setForm({ username: u.username, first_name: u.first_name, last_name: u.last_name, phone: u.phone || '', password: '', is_staff: u.is_staff, is_admin: !!u.is_admin, is_superadmin: u.is_superadmin })
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
      const msg = err.response?.data?.username?.[0] || err.response?.data?.password?.[0] || err.response?.data?.detail || 'Failed to save.'
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
    if (!confirm(`Delete ${u.username}?`)) return
    try {
      await api.delete(`/auth/users/${u.id}/`)
      fetchUsers()
      toast.success('User deleted.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete.')
    }
  }

  const handleResetDevices = async (u) => {
    if (!confirm(`Reset device authorization for ${u.username}?\n\nThis will log them out and allow them to authorize a new device on next login.`)) return
    try {
      const { data } = await api.post(`/auth/users/${u.id}/reset-devices/`)
      toast.success(data.detail)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset devices.')
    }
  }

  const roleBadge = (u) => {
    if (u.is_superadmin) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Superadmin</span>
    if (u.is_admin) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Admin</span>
    if (u.is_staff) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Staff</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Customer</span>
  }

  if (!user?.is_superadmin) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-dashboard" className="text-ocean-600 hover:text-ocean-800"><ArrowLeft size={20} /></Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">User Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('staff')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'staff' ? 'bg-white shadow text-ocean-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Shield size={16} /> Staff & Admin <span className="text-xs bg-ocean-100 text-ocean-700 px-1.5 py-0.5 rounded-full ml-1">{staffUsers.length}</span>
          </button>
          <button onClick={() => setTab('customers')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'customers' ? 'bg-white shadow text-ocean-700' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users size={16} /> Customers <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full ml-1">{customerUsers.length}</span>
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={openCreate} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> New User</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  {tab === 'customers' && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>}
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Logins</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  {tab === 'staff' && <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Device</th>}
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-800 font-medium">{u.username}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.first_name} {u.last_name}</td>
                    {tab === 'customers' && <td className="px-6 py-3 text-sm text-gray-500">{u.email || '—'}</td>}
                    <td className="px-6 py-3 text-sm text-gray-500">{u.phone || '—'}</td>
                    <td className="px-6 py-3 text-center">{roleBadge(u)}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-600">{u.login_count ?? 0}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-500">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-300">Never</span>}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {u.is_superadmin ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Always Active</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {tab === 'staff' && (
                      <td className="px-6 py-3 text-sm">
                        {u.is_staff && !u.is_superadmin ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Smartphone size={12} className={u.device_count > 0 ? 'text-green-600' : 'text-gray-400'} />
                            {u.device_count || 0} device{u.device_count !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(u)} className="text-gray-500 hover:text-ocean-600 text-xs underline">Edit</button>
                      {!u.is_superadmin && (
                        <>
                          <button onClick={() => handleToggleActive(u)} className="text-gray-500 hover:text-ocean-600" title="Toggle active">
                            {u.is_active ? <ToggleRight size={18} className="inline" /> : <ToggleLeft size={18} className="inline" />}
                          </button>
                          {tab === 'staff' && u.is_staff && u.device_count > 0 && (
                            <button onClick={() => handleResetDevices(u)} className="text-gray-500 hover:text-amber-600" title="Reset device authorization">
                              <Smartphone size={16} className="inline" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(u)} className="text-gray-500 hover:text-red-600" title="Delete">
                            <Trash2 size={16} className="inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedUsers.length === 0 && (
                  <tr><td colSpan={tab === 'staff' ? 8 : 8} className="px-6 py-8 text-center text-gray-400">{tab === 'staff' ? 'No staff accounts' : 'No customers'}</td></tr>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" required value={form.username} disabled={modal === 'edit'}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
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
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_staff}
                    onChange={e => setForm(f => ({ ...f, is_staff: e.target.checked }))} />
                  Staff
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_admin}
                    onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked, is_staff: e.target.checked || f.is_staff }))} />
                  Admin <span className="text-xs text-gray-400">(payroll access)</span>
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