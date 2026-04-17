'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function MyLeavePage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [requests, setRequests] = useState([])
  const [balances, setBalances] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', half_day: 'none', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/dashboard/leave'); return }
    fetchData()
  }, [isReady, isAuthenticated, router])

  const fetchData = async () => {
    try {
      const [reqRes, balRes, typeRes] = await Promise.all([
        api.get('/hr/leave/my-requests/'),
        api.get('/hr/leave/my-balances/'),
        api.get('/hr/leave/types/', { params: { is_active: 'true' } }),
      ])
      setRequests(reqRes.data)
      setBalances(balRes.data)
      setLeaveTypes(typeRes.data)
    } catch { toast.error('Failed to load.') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/hr/leave/my-requests/', {
        leave_type: parseInt(form.leave_type),
        start_date: form.start_date,
        end_date: form.end_date,
        half_day: form.half_day,
        reason: form.reason,
      })
      toast.success('Leave request submitted.')
      setShowForm(false)
      setForm({ leave_type: '', start_date: '', end_date: '', half_day: 'none', reason: '' })
      fetchData()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') } finally { setSubmitting(false) }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return
    try { await api.post(`/hr/leave/requests/${id}/cancel/`); toast.success('Cancelled.'); fetchData() } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') }
  }

  if (!isReady) return null

  const statusBadge = (s) => {
    const map = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500' }
    return map[s] || 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">My Leave</h1>
        <div className="flex-1"></div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> Request Leave</button>
      </div>

      {balances.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Leave Balances</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {balances.map(b => (
              <div key={b.id} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">{b.leave_type_name}</div>
                <div className="font-semibold text-ocean-700">{b.remaining} remaining</div>
                <div className="text-xs text-gray-400">{b.total_credits} credits - {b.used} used</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">Request Leave</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Leave Type</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Select</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Half Day</label>
              <select value={form.half_day} onChange={e => setForm({ ...form, half_day: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                <option value="none">Full Day</option>
                <option value="first_half">First Half</option>
                <option value="second_half">Second Half</option>
              </select>
            </div>
            <div><label className="text-sm text-gray-600">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div><label className="text-sm text-gray-600">End Date</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
            <div className="col-span-2"><label className="text-sm text-gray-600">Reason</label><input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={submitting} className="btn-primary text-sm">{submitting ? 'Submitting...' : 'Submit'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Calendar size={20} /> My Leave Requests</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Dates</th><th className="px-4 py-2">Days</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {requests.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No leave requests.</td></tr>}
            {requests.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.leave_type_name}</td>
                <td className="px-4 py-2">{r.start_date} → {r.end_date}{r.half_day !== 'none' ? ` (${r.half_day.replace('_', ' ')})` : ''}</td>
                <td className="px-4 py-2">{r.leave_days}</td>
                <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span></td>
                <td className="px-4 py-2">
                  {(r.status === 'pending' || r.status === 'approved') && (
                    <button onClick={() => handleCancel(r.id)} className="text-red-500 hover:underline text-sm">Cancel</button>
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
