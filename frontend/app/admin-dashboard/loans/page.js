'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Banknote, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function LoansPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [loans, setLoans] = useState([])
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    employee: '', principal: '', interest_rate_percent: '0', interest_method: 'none',
    term_periods: '', installment_amount: '', purpose: '',
    start_date: new Date().toISOString().slice(0, 10), auto_deduct: true,
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/loans'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchLoans(); fetchEmployees()
  }, [isReady, isAuthenticated, user, router])

  useEffect(() => { if (isReady && user?.is_staff) fetchLoans() }, [statusFilter])

  const fetchLoans = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const { data } = await api.get('/hr/loans/', { params })
      setLoans(data)
    } catch { toast.error('Failed to load loans.') }
  }

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/hr/employees/', { params: { is_active: true } })
      setEmployees(data)
    } catch {}
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = { ...form, employee: parseInt(form.employee), term_periods: parseInt(form.term_periods) }
      await api.post('/hr/loans/', payload)
      toast.success('Loan disbursed.')
      setShowForm(false)
      setForm({ ...form, employee: '', principal: '', term_periods: '', installment_amount: '', purpose: '' })
      fetchLoans()
    } catch (err) {
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setCreating(false) }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Employee Loans</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Banknote size={20} /> All Loans</h2>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              <option value="">All statuses</option>
              <option value="active">Active</option><option value="paid_off">Paid Off</option>
              <option value="cancelled">Cancelled</option><option value="defaulted">Defaulted</option>
            </select>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> New Loan</button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="p-6 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-amber-700 mb-3 bg-amber-50 p-2 rounded">Loan is created and disbursed in one step. Status starts as ACTIVE.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Employee *</label>
                <select required value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} - {e.user_full_name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Principal (PHP) *</label>
                <input type="number" step="0.01" required value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Term (number of pay periods) *</label>
                <input type="number" required value={form.term_periods} onChange={(e) => setForm({ ...form, term_periods: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Installment per period *</label>
                <input type="number" step="0.01" required value={form.installment_amount} onChange={(e) => setForm({ ...form, installment_amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Interest %</label>
                <input type="number" step="0.01" value={form.interest_rate_percent} onChange={(e) => setForm({ ...form, interest_rate_percent: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Interest Method</label>
                <select value={form.interest_method} onChange={(e) => setForm({ ...form, interest_method: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="none">None</option><option value="simple">Simple</option><option value="diminishing">Diminishing</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Purpose</label>
                <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div className="flex items-center pt-6"><label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.auto_deduct} onChange={(e) => setForm({ ...form, auto_deduct: e.target.checked })} />
                Auto-deduct from payroll
              </label></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary text-sm">Disburse Loan</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">#</th><th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2 text-right">Principal</th>
                <th className="px-4 py-2 text-right">Installment</th>
                <th className="px-4 py-2 text-right">Remaining</th>
                <th className="px-4 py-2 text-center">Auto</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No loans.</td></tr>}
              {loans.map(l => (
                <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{l.id}</td>
                  <td className="px-4 py-2">{l.employee_name} <span className="text-gray-400 text-xs">{l.employee_code}</span></td>
                  <td className="px-4 py-2 text-right">₱{Number(l.principal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">₱{Number(l.installment_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right font-semibold">₱{Number(l.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-center">{l.auto_deduct ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'paid_off' ? 'bg-blue-100 text-blue-700' : l.status === 'defaulted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      {l.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right"><Link href={`/admin-dashboard/loans/${l.id}`} className="text-ocean-600 hover:underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
