'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [periods, setPeriods] = useState([])
  const [preview, setPreview] = useState(null)
  const [filter, setFilter] = useState({ employee: '', date_from: '', date_to: '', is_approved: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    employee: '', date: new Date().toISOString().slice(0, 10),
    time_in: '', time_out: '', is_approved: true, notes: '',
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/attendance'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchRecords()
    fetchEmployees()
    fetchPeriods()
  }, [isReady, isAuthenticated, user, router])

  const fetchRecords = async () => {
    try {
      const params = {}
      if (filter.employee) params.employee = filter.employee
      if (filter.date_from) params.date_from = filter.date_from
      if (filter.date_to) params.date_to = filter.date_to
      if (filter.is_approved !== '') params.is_approved = filter.is_approved
      const { data } = await api.get('/hr/attendance/records/', { params })
      setRecords(data)
    } catch { toast.error('Failed to load.') }
  }
  const fetchEmployees = async () => {
    try { const { data } = await api.get('/hr/employees/'); setEmployees(data) } catch {}
  }
  const fetchPeriods = async () => {
    try { const { data } = await api.get('/hr/periods/', { params: { year: new Date().getFullYear() } }); setPeriods(data) } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const timeIn = form.time_in ? `${form.date}T${form.time_in}:00` : null
      const timeOut = form.time_out ? `${form.date}T${form.time_out}:00` : null
      await api.post('/hr/attendance/records/', {
        employee: parseInt(form.employee),
        date: form.date,
        time_in: timeIn,
        time_out: timeOut || undefined,
        is_approved: form.is_approved,
        notes: form.notes,
      })
      toast.success('Record created.')
      setShowForm(false)
      fetchRecords()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  const handleApprove = async (id) => {
    try { await api.patch(`/hr/attendance/records/${id}/approve/`); toast.success('Approved.'); fetchRecords() } catch { toast.error('Failed.') }
  }

  const handleBulkApprove = async () => {
    const unapprovedIds = records.filter(r => !r.is_approved && r.time_out).map(r => r.id)
    if (unapprovedIds.length === 0) { toast.error('No unapproved records with clock-out.'); return }
    if (!confirm(`Approve ${unapprovedIds.length} record(s)?`)) return
    try { await api.post('/hr/attendance/records/bulk-approve/', { ids: unapprovedIds }); toast.success('Bulk approved.'); fetchRecords() } catch { toast.error('Failed.') }
  }

  const handlePreview = async (periodId) => {
    try { const { data } = await api.get('/hr/attendance/payroll-preview/', { params: { period: periodId } }); setPreview(data) } catch { toast.error('Failed.') }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Attendance Records</h1>
        <div className="flex-1"></div>
        <button onClick={handleBulkApprove} className="btn-outline text-sm flex items-center gap-1"><CheckCircle size={14} /> Bulk Approve</button>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1"><Clock size={14} /> Add Record</button>
      </div>

      {preview && (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200 border">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-amber-600" /><span className="font-semibold text-amber-800">Payroll Preview</span></div>
          {preview.warnings.filter(Boolean).map((w, i) => <div key={i} className="text-sm text-amber-700">{w}</div>)}
          {preview.warnings.filter(Boolean).length === 0 && <div className="text-sm text-green-700">No warnings — all records are approved with clock-out.</div>}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Add Attendance Record</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Employee</label>
              <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Select</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} - {e.user?.first_name} {e.user?.last_name}</option>)}
              </select>
            </div>
            <div><label className="text-sm text-gray-600">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Time In</label><input type="time" value={form.time_in} onChange={e => setForm({ ...form, time_in: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Time Out</label><input type="time" value={form.time_out} onChange={e => setForm({ ...form, time_out: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.is_approved} onChange={e => setForm({ ...form, is_approved: e.target.checked })} /><label className="text-sm text-gray-600">Approved</label></div>
            <div><label className="text-sm text-gray-600">Notes</label><input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="text-xs text-gray-500">Employee</label><select value={filter.employee} onChange={e => setFilter({ ...filter, employee: e.target.value })} className="w-full mt-1 px-2 py-1 border rounded text-sm"><option value="">All</option>{employees.map(e => <option key={e.id} value={e.id}>{e.employee_code}</option>)}</select></div>
          <div><label className="text-xs text-gray-500">From</label><input type="date" value={filter.date_from} onChange={e => setFilter({ ...filter, date_from: e.target.value })} className="w-full mt-1 px-2 py-1 border rounded text-sm" /></div>
          <div><label className="text-xs text-gray-500">To</label><input type="date" value={filter.date_to} onChange={e => setFilter({ ...filter, date_to: e.target.value })} className="w-full mt-1 px-2 py-1 border rounded text-sm" /></div>
          <div><label className="text-xs text-gray-500">Status</label><select value={filter.is_approved} onChange={e => setFilter({ ...filter, is_approved: e.target.value })} className="w-full mt-1 px-2 py-1 border rounded text-sm"><option value="">All</option><option value="true">Approved</option><option value="false">Pending</option></select></div>
          <button onClick={fetchRecords} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Filter size={14} /> Filter</button>
          <div className="flex-1"></div>
          <div><label className="text-xs text-gray-500">Payroll Preview</label><select onChange={e => { if (e.target.value) handlePreview(e.target.value) }} className="mt-1 px-2 py-1 border rounded text-sm"><option value="">Select period...</option>{periods.map(p => <option key={p.id} value={p.id}>{p.start_date} → {p.end_date}</option>)}</select></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Employee</th><th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Time In</th><th className="px-3 py-2">Time Out</th>
              <th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-right">OT</th>
              <th className="px-3 py-2 text-right">Night</th>
              <th className="px-3 py-2">Late</th><th className="px-3 py-2">Holiday</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-gray-400">No records.</td></tr>}
            {records.map(r => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{r.employee_name} <span className="text-gray-400 text-xs">{r.employee_code}</span></td>
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2 text-xs">{r.time_in ? new Date(r.time_in).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td className="px-3 py-2 text-xs">{r.time_out ? new Date(r.time_out).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : <span className="text-amber-600">No clock-out</span>}</td>
                <td className="px-3 py-2 text-right">{r.hours_worked || 0}</td>
                <td className="px-3 py-2 text-right">{r.overtime_hours || 0}</td>
                <td className="px-3 py-2 text-right">{r.night_diff_hours || 0}</td>
                <td className="px-3 py-2">{r.is_late ? <span className="text-red-600 text-xs">{r.late_minutes}m</span> : '-'}</td>
                <td className="px-3 py-2">{r.is_holiday ? <span className="text-xs px-1 py-0.5 rounded bg-red-100 text-red-700">{r.holiday_type?.replace('_', ' ')}</span> : r.is_rest_day ? <span className="text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-700">rest</span> : '-'}</td>
                <td className="px-3 py-2">
                  {r.is_approved ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {!r.is_approved && r.time_out && (
                    <button onClick={() => handleApprove(r.id)} className="text-ocean-600 hover:underline text-sm">Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
