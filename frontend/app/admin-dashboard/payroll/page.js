'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Play, RefreshCw, Database, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const SCHEDULES = [
  { value: 'SEMI_MONTHLY', label: 'Semi-Monthly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
]

export default function PayrollPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [year, setYear] = useState(new Date().getFullYear())
  const [schedule, setSchedule] = useState('SEMI_MONTHLY')
  const [periods, setPeriods] = useState([])
  const [runs, setRuns] = useState([])
  const [employees, setEmployees] = useState([])
  const [busy, setBusy] = useState(false)
  const [generatingFor, setGeneratingFor] = useState(null)
  const [showWeeklyForm, setShowWeeklyForm] = useState(false)
  const [weeklyCutoff, setWeeklyCutoff] = useState('5')
  const [show13Form, setShow13Form] = useState(false)
  const [thirteenthYear, setThirteenthYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/payroll'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchAll()
  }, [isReady, isAuthenticated, user, router])

  useEffect(() => { if (isReady && user?.is_staff) fetchPeriods() }, [year, schedule])

  const fetchAll = () => { fetchPeriods(); fetchRuns(); fetchEmployees() }

  const fetchPeriods = async () => {
    try {
      const { data } = await api.get('/hr/periods/', { params: { year, schedule } })
      setPeriods(data)
    } catch { toast.error('Failed to load periods.') }
  }

  const fetchRuns = async () => {
    try {
      const { data } = await api.get('/hr/runs/')
      setRuns(data.slice(0, 30))
    } catch {}
  }

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/hr/employees/', { params: { is_active: true } })
      setEmployees(data)
    } catch {}
  }

  const ensureYear = async () => {
    setBusy(true)
    try {
      await api.post('/hr/periods/ensure/', { year })
      toast.success(`Periods seeded for ${year}.`)
      fetchPeriods()
    } catch { toast.error('Failed to seed periods.') } finally { setBusy(false) }
  }

  const ensureWeekly = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/hr/periods/ensure-weekly/', { year, cutoff_day: parseInt(weeklyCutoff) })
      toast.success(`Weekly periods seeded for ${year} cutoff=${weeklyCutoff}.`)
      setShowWeeklyForm(false)
      fetchPeriods()
    } catch { toast.error('Failed.') } finally { setBusy(false) }
  }

  const seedTables = async () => {
    if (!confirm('Reseed contribution tables? Existing rows are updated, not removed.')) return
    setBusy(true)
    try {
      await api.post('/hr/tables/seed/')
      toast.success('Tables reseeded.')
    } catch { toast.error('Failed to reseed.') } finally { setBusy(false) }
  }

  const generateRun = async (periodId) => {
    setGeneratingFor(periodId)
    try {
      const { data } = await api.post('/hr/runs/', { period_id: periodId })
      toast.success(`DRAFT run #${data.id} created.`)
      fetchRuns()
      router.push(`/admin-dashboard/payroll/runs/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed.')
    } finally { setGeneratingFor(null) }
  }

  const generate13th = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/hr/runs/13th-month/', { year: parseInt(thirteenthYear) })
      toast.success(`13th-month DRAFT run #${data.id} created.`)
      setShow13Form(false)
      fetchRuns()
      router.push(`/admin-dashboard/payroll/runs/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed.')
    } finally { setBusy(false) }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Payroll</h1>
        <div className="flex-1"></div>
        <button onClick={seedTables} disabled={busy} className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><Database size={14} /> Re-seed tables</button>
        <button onClick={() => setShow13Form(!show13Form)} className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><Gift size={14} /> 13th-month</button>
      </div>

      {show13Form && (
        <form onSubmit={generate13th} className="card p-4 mb-6 flex items-end gap-3 bg-amber-50">
          <div><label className="block text-sm font-medium mb-1">Year</label>
            <input type="number" value={thirteenthYear} onChange={(e) => setThirteenthYear(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32" /></div>
          <button type="submit" disabled={busy} className="btn-primary text-sm">Generate 13th-month run</button>
          <button type="button" onClick={() => setShow13Form(false)} className="btn-outline text-sm">Cancel</button>
        </form>
      )}

      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Calendar size={20} /> Periods</h2>
          <div className="flex gap-2 items-center flex-wrap">
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24" />
            <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
              {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={ensureYear} disabled={busy} className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><RefreshCw size={14} /> Seed year</button>
            <button onClick={() => setShowWeeklyForm(!showWeeklyForm)} className="btn-outline text-sm px-3 py-1.5">+ Weekly</button>
          </div>
        </div>

        {showWeeklyForm && (
          <form onSubmit={ensureWeekly} className="p-4 bg-gray-50 border-b border-gray-100 flex items-end gap-3">
            <div><label className="block text-sm font-medium mb-1">Cutoff weekday</label>
              <select value={weeklyCutoff} onChange={(e) => setWeeklyCutoff(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option>
                <option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="7">Sunday</option>
              </select></div>
            <button type="submit" disabled={busy} className="btn-primary text-sm">Seed weekly periods for {year}</button>
            <button type="button" onClick={() => setShowWeeklyForm(false)} className="btn-outline text-sm">Cancel</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Period</th><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2">Pay Date</th><th className="px-4 py-2 text-center">Closed</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {periods.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No periods. Click "Seed year".</td></tr>}
              {periods.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{p.year}-{(p.month || 0).toString().padStart(2, '0')} <span className="text-gray-400 capitalize">{p.half?.replace('_', ' ')}</span>{p.week_number ? ` W${p.week_number}` : ''}</td>
                  <td className="px-4 py-2">{p.start_date}</td>
                  <td className="px-4 py-2">{p.end_date}</td>
                  <td className="px-4 py-2">{p.pay_date}</td>
                  <td className="px-4 py-2 text-center">{p.is_closed ? '✓' : ''}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => generateRun(p.id)} disabled={generatingFor === p.id} className="btn-primary text-xs px-2 py-1 flex items-center gap-1 ml-auto">
                      <Play size={12} /> {generatingFor === p.id ? '…' : 'Run payroll'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800">Recent Runs</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Period</th><th className="px-4 py-2">Created</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-right">Payslips</th><th className="px-4 py-2"></th></tr></thead>
            <tbody>
              {runs.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">No runs yet.</td></tr>}
              {runs.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono">{r.id}</td>
                  <td className="px-4 py-2">{r.period ? `${r.period.start_date} → ${r.period.end_date}` : '-'}</td>
                  <td className="px-4 py-2">{r.run_at?.split('T')[0]}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-green-100 text-green-700' : r.status === 'finalized' ? 'bg-blue-100 text-blue-700' : r.status === 'voided' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{r.payslip_count || '-'}</td>
                  <td className="px-4 py-2 text-right"><Link href={`/admin-dashboard/payroll/runs/${r.id}`} className="text-ocean-600 hover:underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
