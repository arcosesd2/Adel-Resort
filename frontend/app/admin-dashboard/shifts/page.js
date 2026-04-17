'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Plus, UserPlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function ShiftsPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [shifts, setShifts] = useState([])
  const [employees, setEmployees] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    name: '', code: '', start_time: '08:00', end_time: '17:00',
    break_minutes: '60', grace_period_minutes: '15',
    is_night_shift: false, is_active: true, color: '#3b82f6',
  })
  const [assignForm, setAssignForm] = useState({
    employee: '', shift: '', effective_date: new Date().toISOString().slice(0, 10), end_date: '',
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/shifts'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchShifts()
    fetchEmployees()
    fetchAssignments()
  }, [isReady, isAuthenticated, user, router])

  const fetchShifts = async () => {
    try { const { data } = await api.get('/hr/shifts/'); setShifts(data) } catch { toast.error('Failed to load shifts.') }
  }
  const fetchEmployees = async () => {
    try { const { data } = await api.get('/hr/employees/'); setEmployees(data) } catch {}
  }
  const fetchAssignments = async () => {
    try { const { data } = await api.get('/hr/shift-assignments/', { params: { current: 'true' } }); setAssignments(data) } catch {}
  }

  const handleCreateShift = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/shifts/', { ...shiftForm, break_minutes: parseInt(shiftForm.break_minutes), grace_period_minutes: parseInt(shiftForm.grace_period_minutes) })
      toast.success('Shift created.')
      setShowShiftForm(false)
      setShiftForm({ name: '', code: '', start_time: '08:00', end_time: '17:00', break_minutes: '60', grace_period_minutes: '15', is_night_shift: false, is_active: true, color: '#3b82f6' })
      fetchShifts()
    } catch (err) { toast.error(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed.') }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this shift?')) return
    try { await api.delete(`/hr/shifts/${id}/`); toast.success('Deactivated.'); fetchShifts() } catch { toast.error('Failed.') }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/shift-assignments/', {
        employee: parseInt(assignForm.employee),
        shift: parseInt(assignForm.shift),
        effective_date: assignForm.effective_date,
        end_date: assignForm.end_date || undefined,
      })
      toast.success('Assigned.')
      setShowAssignForm(false)
      fetchAssignments()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  const handleRemoveAssignment = async (id) => {
    if (!confirm('Remove this shift assignment?')) return
    try { await api.delete(`/hr/shift-assignments/${id}/`); toast.success('Removed.'); fetchAssignments() } catch { toast.error('Failed.') }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Shift Management</h1>
        <div className="flex-1"></div>
        <button onClick={() => { setAssignForm({ ...assignForm, shift: shifts[0]?.id || '' }); setShowAssignForm(true) }} className="btn-outline text-sm flex items-center gap-1"><UserPlus size={14} /> Assign Shift</button>
        <button onClick={() => setShowShiftForm(true)} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> New Shift</button>
      </div>

      {showShiftForm && (
        <form onSubmit={handleCreateShift} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Create Shift</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><label className="text-sm text-gray-600">Name</label><input type="text" value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Code</label><input type="text" value={shiftForm.code} onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Start Time</label><input type="time" value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">End Time</label><input type="time" value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Break (min)</label><input type="number" value={shiftForm.break_minutes} onChange={e => setShiftForm({ ...shiftForm, break_minutes: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">Grace Period (min)</label><input type="number" value={shiftForm.grace_period_minutes} onChange={e => setShiftForm({ ...shiftForm, grace_period_minutes: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={shiftForm.is_night_shift} onChange={e => setShiftForm({ ...shiftForm, is_night_shift: e.target.checked })} /><label className="text-sm text-gray-600">Night Shift</label></div>
            <div><label className="text-sm text-gray-600">Color</label><input type="color" value={shiftForm.color} onChange={e => setShiftForm({ ...shiftForm, color: e.target.value })} className="w-full mt-1 h-9 border rounded-lg" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm">Create</button>
            <button type="button" onClick={() => setShowShiftForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      {showAssignForm && (
        <form onSubmit={handleAssign} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Assign Shift to Employee</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Employee</label>
              <select value={assignForm.employee} onChange={e => setAssignForm({ ...assignForm, employee: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} - {e.user?.first_name} {e.user?.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Shift</label>
              <select value={assignForm.shift} onChange={e => setAssignForm({ ...assignForm, shift: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Select shift</option>
                {shifts.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm text-gray-600">Effective Date</label><input type="date" value={assignForm.effective_date} onChange={e => setAssignForm({ ...assignForm, effective_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">End Date (optional)</label><input type="date" value={assignForm.end_date} onChange={e => setAssignForm({ ...assignForm, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm">Assign</button>
            <button type="button" onClick={() => setShowAssignForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Clock size={20} /> Shifts</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Time</th><th className="px-4 py-2">Break</th><th className="px-4 py-2">Grace</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {shifts.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No shifts defined.</td></tr>}
              {shifts.map(s => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2"><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: s.color }} />{s.code}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.start_time}–{s.end_time}</td>
                  <td className="px-4 py-2">{s.break_minutes}m</td>
                  <td className="px-4 py-2">{s.grace_period_minutes}m</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-2 text-right">{s.is_active && <button onClick={() => handleDeactivate(s.id)} className="text-red-500 hover:underline text-sm"><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><UserPlus size={20} /> Current Assignments</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Shift</th><th className="px-4 py-2">Since</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {assignments.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No assignments.</td></tr>}
              {assignments.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{a.employee_name} <span className="text-gray-400 text-xs">{a.employee_code}</span></td>
                  <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a.shift_code}</span></td>
                  <td className="px-4 py-2">{a.effective_date}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => handleRemoveAssignment(a.id)} className="text-red-500 hover:underline text-sm"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
