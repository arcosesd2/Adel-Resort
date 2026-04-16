'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, History, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function EmployeeDetailPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const { id } = useParams()

  const [employee, setEmployee] = useState(null)
  const [history, setHistory] = useState([])
  const [showCompForm, setShowCompForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [comp, setComp] = useState({
    effective_date: new Date().toISOString().slice(0, 10),
    monthly_basic_salary: '',
    pay_schedule: 'semi_monthly',
    weekly_cutoff_day: 5,
    weekly_basis: '',
    tax_status: 'single',
    sss_msc_override: '',
    daily_rate: '',
    hourly_rate: '',
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/employees'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchEmployee()
    fetchHistory()
  }, [isReady, isAuthenticated, user, router, id])

  const fetchEmployee = async () => {
    try {
      const { data } = await api.get(`/hr/employees/${id}/`)
      setEmployee(data)
    } catch { toast.error('Failed to load employee.') }
  }

  const fetchHistory = async () => {
    try {
      const { data } = await api.get(`/hr/employees/${id}/compensation/`)
      setHistory(data)
    } catch {}
  }

  const handleSaveComp = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = {
        effective_date: comp.effective_date,
        monthly_basic_salary: comp.monthly_basic_salary,
        pay_schedule: comp.pay_schedule,
        tax_status: comp.tax_status,
      }
      if (comp.pay_schedule === 'weekly') {
        payload.weekly_cutoff_day = parseInt(comp.weekly_cutoff_day)
        if (comp.weekly_basis) payload.weekly_basis = comp.weekly_basis
      }
      if (comp.sss_msc_override) payload.sss_msc_override = comp.sss_msc_override
      if (comp.daily_rate) payload.daily_rate = comp.daily_rate
      if (comp.hourly_rate) payload.hourly_rate = comp.hourly_rate
      await api.post(`/hr/employees/${id}/compensation/`, payload)
      toast.success('Compensation profile saved.')
      setShowCompForm(false)
      fetchEmployee()
      fetchHistory()
    } catch (err) {
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setCreating(false) }
  }

  if (!isReady || !user?.is_staff || !employee) return null

  const cur = employee.current_compensation

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard/employees" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">{employee.user_full_name || employee.user_username}</h1>
        <span className="text-sm text-gray-500 font-mono">{employee.employee_code}</span>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-3 flex items-center gap-2"><User size={18} /> Profile</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-gray-500">Position</dt><dd>{employee.position}</dd></div>
          <div><dt className="text-gray-500">Department</dt><dd>{employee.department || '-'}</dd></div>
          <div><dt className="text-gray-500">Hire Date</dt><dd>{employee.hire_date}</dd></div>
          <div><dt className="text-gray-500">Status</dt><dd className="capitalize">{employee.employment_status?.replace('_', ' ')}</dd></div>
          <div><dt className="text-gray-500">TIN</dt><dd>{employee.tin || '-'}</dd></div>
          <div><dt className="text-gray-500">SSS</dt><dd>{employee.sss_number || '-'}</dd></div>
          <div><dt className="text-gray-500">PhilHealth</dt><dd>{employee.philhealth_number || '-'}</dd></div>
          <div><dt className="text-gray-500">Pag-IBIG</dt><dd>{employee.pagibig_number || '-'}</dd></div>
          <div><dt className="text-gray-500">Active Loans</dt><dd>{employee.active_loans_count || 0}</dd></div>
        </dl>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><History size={18} /> Compensation</h2>
          <button onClick={() => setShowCompForm(!showCompForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
            <Plus size={14} /> Set new
          </button>
        </div>
        {cur && (
          <div className="px-6 py-3 bg-ocean-50 text-sm">
            <strong>Current:</strong> ₱{Number(cur.monthly_basic_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/month —
            <span className="capitalize ml-1">{cur.pay_schedule?.replace('_', ' ')}</span>
            {cur.pay_schedule === 'weekly' && (<> · cutoff weekday {cur.weekly_cutoff_day}{cur.weekly_basis ? ` · ₱${cur.weekly_basis}/week flat` : ''}</>)}
            {' · effective '}{cur.effective_date}
          </div>
        )}
        {showCompForm && (
          <form onSubmit={handleSaveComp} className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Effective Date *</label>
                <input type="date" required value={comp.effective_date} onChange={(e) => setComp({ ...comp, effective_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Monthly Basic Salary *</label>
                <input type="number" step="0.01" required value={comp.monthly_basic_salary} onChange={(e) => setComp({ ...comp, monthly_basic_salary: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Pay Schedule *</label>
                <select value={comp.pay_schedule} onChange={(e) => setComp({ ...comp, pay_schedule: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="semi_monthly">Semi-Monthly (15th & EOM)</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select></div>
              {comp.pay_schedule === 'weekly' && (
                <>
                  <div><label className="block text-sm font-medium mb-1">Weekly Cutoff Day *</label>
                    <select value={comp.weekly_cutoff_day} onChange={(e) => setComp({ ...comp, weekly_cutoff_day: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option>
                      <option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="7">Sunday</option>
                    </select></div>
                  <div><label className="block text-sm font-medium mb-1">Weekly Basis (optional flat rate)</label>
                    <input type="number" step="0.01" value={comp.weekly_basis} onChange={(e) => setComp({ ...comp, weekly_basis: e.target.value })} placeholder="auto = monthly × 12 / 52" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                </>
              )}
              <div><label className="block text-sm font-medium mb-1">Tax Status</label>
                <select value={comp.tax_status} onChange={(e) => setComp({ ...comp, tax_status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="single">Single</option>
                  <option value="head_of_family">Head of Family</option>
                  <option value="married">Married</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">SSS MSC Override</label>
                <input type="number" step="0.01" value={comp.sss_msc_override} onChange={(e) => setComp({ ...comp, sss_msc_override: e.target.value })} placeholder="(auto from table)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Daily Rate</label>
                <input type="number" step="0.01" value={comp.daily_rate} onChange={(e) => setComp({ ...comp, daily_rate: e.target.value })} placeholder="auto = monthly / 22" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Hourly Rate</label>
                <input type="number" step="0.01" value={comp.hourly_rate} onChange={(e) => setComp({ ...comp, hourly_rate: e.target.value })} placeholder="auto = daily / 8" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary text-sm">Save Compensation</button>
              <button type="button" onClick={() => setShowCompForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Effective Date</th><th className="px-4 py-2 text-right">Monthly Basic</th>
                <th className="px-4 py-2">Schedule</th><th className="px-4 py-2">Tax Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">No compensation set yet.</td></tr>}
              {history.map(h => (
                <tr key={h.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{h.effective_date}</td>
                  <td className="px-4 py-2 text-right">₱{Number(h.monthly_basic_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 capitalize">{h.pay_schedule?.replace('_', ' ')}</td>
                  <td className="px-4 py-2 capitalize">{h.tax_status?.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
