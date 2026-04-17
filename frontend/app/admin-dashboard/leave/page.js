'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CheckCircle, XCircle, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function LeavePage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [tab, setTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [balances, setBalances] = useState([])
  const [employees, setEmployees] = useState([])
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [typeForm, setTypeForm] = useState({ name: '', code: '', is_paid: true, default_credits: '0', carry_over_max: '0' })
  const [requestForm, setRequestForm] = useState({ employee: '', leave_type: '', start_date: '', end_date: '', half_day: 'none', reason: '' })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/leave'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchData()
  }, [isReady, isAuthenticated, user, router])

  const fetchData = async () => {
    try {
      const [reqRes, typesRes, balRes, empRes] = await Promise.all([
        api.get('/hr/leave/requests/'),
        api.get('/hr/leave/types/'),
        api.get('/hr/leave/balances/'),
        api.get('/hr/employees/'),
      ])
      setRequests(reqRes.data)
      setLeaveTypes(typesRes.data)
      setBalances(balRes.data)
      setEmployees(empRes.data)
    } catch { toast.error('Failed to load.') }
  }

  const handleCreateType = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/leave/types/', { ...typeForm, default_credits: parseFloat(typeForm.default_credits), carry_over_max: parseFloat(typeForm.carry_over_max) })
      toast.success('Leave type created.')
      setShowTypeForm(false)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.code?.[0] || 'Failed.') }
  }

  const handleCreateRequest = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/leave/requests/', {
        employee: parseInt(requestForm.employee),
        leave_type: parseInt(requestForm.leave_type),
        ...requestForm,
        employee: parseInt(requestForm.employee),
        leave_type: parseInt(requestForm.leave_type),
      })
      toast.success('Leave request created.')
      setShowRequestForm(false)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  const handleApprove = async (id) => {
    try { await api.post(`/hr/leave/requests/${id}/approve/`); toast.success('Approved.'); fetchData() } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  const handleReject = async (id) => {
    const notes = prompt('Reason for rejection?')
    if (notes === null) return
    try { await api.post(`/hr/leave/requests/${id}/reject/`, { notes }); toast.success('Rejected.'); fetchData() } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  const handleInitialize = async () => {
    const year = prompt('Initialize balances for year:', new Date().getFullYear())
    if (!year) return
    try { await api.post('/hr/leave/balances/initialize/', { year: parseInt(year) }); toast.success('Balances initialized.'); fetchData() } catch { toast.error('Failed.') }
  }

  if (!isReady || !user?.is_staff) return null

  const pending = requests.filter(r => r.status === 'pending')
  const statusBadge = (s) => {
    const map = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500' }
    return map[s] || 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Leave Management</h1>
        <div className="flex-1"></div>
        <button onClick={handleInitialize} className="btn-outline text-sm flex items-center gap-1"><RefreshCw size={14} /> Init Balances</button>
        <button onClick={() => setShowRequestForm(true)} className="btn-outline text-sm flex items-center gap-1"><Plus size={14} /> Add Request</button>
        <button onClick={() => setShowTypeForm(true)} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> New Leave Type</button>
      </div>

      {pending.length > 0 && (
        <div className="card p-4 mb-4 bg-amber-50 border-amber-200 border">
          <span className="font-semibold text-amber-800">{pending.length} pending request(s) awaiting approval</span>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['requests', 'types', 'balances'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-ocean-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Dates</th><th className="px-4 py-2">Days</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {requests.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No leave requests.</td></tr>}
              {requests.map(r => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{r.employee_name}</td>
                  <td className="px-4 py-2">{r.leave_type_name}</td>
                  <td className="px-4 py-2">{r.start_date} → {r.end_date}{r.half_day !== 'none' ? ` (${r.half_day.replace('_', ' ')})` : ''}</td>
                  <td className="px-4 py-2">{r.leave_days}</td>
                  <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="px-4 py-2 flex gap-2">
                    {r.status === 'pending' && <>
                      <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:underline text-sm flex items-center gap-1"><CheckCircle size={14} /> Approve</button>
                      <button onClick={() => handleReject(r.id)} className="text-red-600 hover:underline text-sm flex items-center gap-1"><XCircle size={14} /> Reject</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'types' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Paid</th><th className="px-4 py-2">Default Credits</th><th className="px-4 py-2">Carry-over Max</th></tr>
            </thead>
            <tbody>
              {leaveTypes.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No leave types.</td></tr>}
              {leaveTypes.map(lt => (
                <tr key={lt.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{lt.code}</td>
                  <td className="px-4 py-2">{lt.name}</td>
                  <td className="px-4 py-2">{lt.is_paid ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">{lt.default_credits}</td>
                  <td className="px-4 py-2">{lt.carry_over_max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'balances' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Employee</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Year</th><th className="px-4 py-2 text-right">Credits</th><th className="px-4 py-2 text-right">Used</th><th className="px-4 py-2 text-right">Remaining</th></tr>
            </thead>
            <tbody>
              {balances.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No balances. Click "Init Balances" to create.</td></tr>}
              {balances.map(b => (
                <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{b.employee}</td>
                  <td className="px-4 py-2">{b.leave_type_name}</td>
                  <td className="px-4 py-2">{b.year}</td>
                  <td className="px-4 py-2 text-right">{b.total_credits}</td>
                  <td className="px-4 py-2 text-right">{b.used}</td>
                  <td className="px-4 py-2 text-right font-semibold text-ocean-700">{b.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTypeForm && (
        <form onSubmit={handleCreateType} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">New Leave Type</h2>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-600">Name</label><input type="text" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
              <div><label className="text-sm text-gray-600">Code</label><input type="text" value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={typeForm.is_paid} onChange={e => setTypeForm({ ...typeForm, is_paid: e.target.checked })} /><label className="text-sm text-gray-600">Paid Leave</label></div>
              <div><label className="text-sm text-gray-600">Default Credits (days/year)</label><input type="number" step="0.5" value={typeForm.default_credits} onChange={e => setTypeForm({ ...typeForm, default_credits: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm text-gray-600">Carry-over Max</label><input type="number" step="0.5" value={typeForm.carry_over_max} onChange={e => setTypeForm({ ...typeForm, carry_over_max: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn-primary text-sm">Create</button>
              <button type="button" onClick={() => setShowTypeForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {showRequestForm && (
        <form onSubmit={handleCreateRequest} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-ocean-800 mb-4">Add Leave Request</h2>
            <div className="space-y-3">
              <div><label className="text-sm text-gray-600">Employee</label><select value={requestForm.employee} onChange={e => setRequestForm({ ...requestForm, employee: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required><option value="">Select</option>{employees.map(e => <option key={e.id} value={e.id}>{e.employee_code}</option>)}</select></div>
              <div><label className="text-sm text-gray-600">Leave Type</label><select value={requestForm.leave_type} onChange={e => setRequestForm({ ...requestForm, leave_type: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required><option value="">Select</option>{leaveTypes.filter(lt => lt.is_active).map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}</select></div>
              <div><label className="text-sm text-gray-600">Start Date</label><input type="date" value={requestForm.start_date} onChange={e => setRequestForm({ ...requestForm, start_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
              <div><label className="text-sm text-gray-600">End Date</label><input type="date" value={requestForm.end_date} onChange={e => setRequestForm({ ...requestForm, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
              <div><label className="text-sm text-gray-600">Half Day</label><select value={requestForm.half_day} onChange={e => setRequestForm({ ...requestForm, half_day: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="none">Full Day</option><option value="first_half">First Half</option><option value="second_half">Second Half</option></select></div>
              <div><label className="text-sm text-gray-600">Reason</label><input type="text" value={requestForm.reason} onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn-primary text-sm">Create</button>
              <button type="button" onClick={() => setShowRequestForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
