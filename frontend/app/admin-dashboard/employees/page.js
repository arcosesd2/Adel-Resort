'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function EmployeesPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [employees, setEmployees] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    user: '', tin: '', sss_number: '', philhealth_number: '', pagibig_number: '',
    hire_date: new Date().toISOString().slice(0, 10),
    employment_status: 'regular', position: '', department: '',
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/employees'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchEmployees()
    fetchUsers()
  }, [isReady, isAuthenticated, user, router])

  const fetchEmployees = async () => {
    try {
      const params = search ? { search } : {}
      const { data } = await api.get('/hr/employees/', { params })
      setEmployees(data)
    } catch { toast.error('Failed to load employees.') }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users/')
      setUsers(data)
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/hr/employees/', { ...form, user: parseInt(form.user) })
      toast.success('Employee created. Set their compensation next.')
      setShowForm(false)
      setForm({ ...form, user: '', tin: '', sss_number: '', philhealth_number: '', pagibig_number: '', position: '', department: '' })
      fetchEmployees()
    } catch (err) {
      const e = err.response?.data
      toast.error(typeof e === 'string' ? e : (e?.detail || JSON.stringify(e) || 'Failed.'))
    } finally { setCreating(false) }
  }

  const handleDeactivate = async (id, code) => {
    if (!confirm(`Deactivate ${code}? They keep their payroll history.`)) return
    try {
      await api.delete(`/hr/employees/${id}/`)
      toast.success('Deactivated.')
      fetchEmployees()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed.')
    }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Employees</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <Users size={20} /> All Employees
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text" placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Linked User *</label>
                <select required value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select a user…</option>
                  {users.filter(u => u.is_staff).map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.first_name} {u.last_name})</option>
                  ))}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Position *</label>
                <input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Hire Date *</label>
                <input type="date" required value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Employment Status</label>
                <select value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="regular">Regular</option>
                  <option value="probationary">Probationary</option>
                  <option value="contractual">Contractual</option>
                  <option value="part_time">Part-time</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">TIN</label>
                <input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">SSS No.</label>
                <input value={form.sss_number} onChange={(e) => setForm({ ...form, sss_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">PhilHealth No.</label>
                <input value={form.philhealth_number} onChange={(e) => setForm({ ...form, philhealth_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Pag-IBIG No.</label>
                <input value={form.pagibig_number} onChange={(e) => setForm({ ...form, pagibig_number: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary text-sm">Create Employee</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Position</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Schedule</th>
                <th className="px-4 py-2 text-right">Salary</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No employees yet.</td></tr>
              )}
              {employees.map(e => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{e.employee_code}</td>
                  <td className="px-4 py-2">{e.user_full_name || e.user_username}</td>
                  <td className="px-4 py-2">{e.position}</td>
                  <td className="px-4 py-2">{e.department || '-'}</td>
                  <td className="px-4 py-2 capitalize">{e.current_compensation?.pay_schedule?.replace('_', ' ') || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    {e.current_compensation
                      ? `₱${Number(e.current_compensation.monthly_basic_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                      : <span className="text-amber-600">no salary set</span>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 flex gap-2 justify-end">
                    <Link href={`/admin-dashboard/employees/${e.id}`} className="text-ocean-600 hover:underline">Edit</Link>
                    {e.is_active && <button onClick={() => handleDeactivate(e.id, e.employee_code)} className="text-red-600 hover:underline">Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
