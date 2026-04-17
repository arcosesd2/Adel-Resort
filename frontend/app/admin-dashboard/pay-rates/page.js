'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Percent, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

const FIELDS = [
  { section: 'Overtime Rates (% of hourly rate)', key: 'ot', fields: [
    ['ot_ordinary_pct', 'Ordinary workday'],
    ['ot_rest_day_pct', 'Rest day'],
    ['ot_regular_holiday_pct', 'Regular holiday'],
    ['ot_special_holiday_pct', 'Special holiday'],
    ['ot_rest_day_regular_holiday_pct', 'Rest day + Regular holiday'],
    ['ot_rest_day_special_holiday_pct', 'Rest day + Special holiday'],
  ]},
  { section: 'Holiday / Rest Day Rates (% of daily rate, first 8h)', key: 'day', fields: [
    ['regular_holiday_rate_pct', 'Regular holiday'],
    ['special_holiday_rate_pct', 'Special holiday'],
    ['rest_day_rate_pct', 'Rest day'],
    ['rest_day_regular_holiday_rate_pct', 'Rest day + Regular holiday'],
    ['rest_day_special_holiday_rate_pct', 'Rest day + Special holiday'],
  ]},
  { section: 'Night Differential (% premium on hourly rate, 10PM–6AM)', key: 'nd', fields: [
    ['night_diff_ordinary_pct', 'Ordinary workday'],
    ['night_diff_rest_day_pct', 'Rest day'],
    ['night_diff_holiday_pct', 'Holiday'],
  ]},
  { section: 'Deduction Multipliers (% of proportional deduction)', key: 'ded', fields: [
    ['late_deduction_multiplier_pct', 'Late penalty'],
    ['undertime_deduction_multiplier_pct', 'Undertime penalty'],
  ]},
]

const DEFAULTS = {
  effective_from: new Date().toISOString().slice(0, 10),
  ot_ordinary_pct: '125', ot_rest_day_pct: '160',
  ot_regular_holiday_pct: '260', ot_special_holiday_pct: '195',
  ot_rest_day_regular_holiday_pct: '390', ot_rest_day_special_holiday_pct: '195',
  regular_holiday_rate_pct: '200', special_holiday_rate_pct: '130',
  rest_day_rate_pct: '130', rest_day_regular_holiday_rate_pct: '260',
  rest_day_special_holiday_rate_pct: '150',
  night_diff_ordinary_pct: '10', night_diff_rest_day_pct: '20', night_diff_holiday_pct: '20',
  late_deduction_multiplier_pct: '100', undertime_deduction_multiplier_pct: '100',
}

export default function PayRatesPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [configs, setConfigs] = useState([])
  const [current, setCurrent] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...DEFAULTS })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/pay-rates'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchConfigs()
    fetchCurrent()
  }, [isReady, isAuthenticated, user, router])

  const fetchConfigs = async () => {
    try { const { data } = await api.get('/hr/payrate-config/'); setConfigs(data) } catch { toast.error('Failed to load.') }
  }
  const fetchCurrent = async () => {
    try { const { data } = await api.get('/hr/payrate-config/current/'); setCurrent(data) } catch {}
  }

  const startEdit = (cfg) => {
    const vals = { ...DEFAULTS }
    Object.keys(vals).forEach(k => { if (cfg[k] !== undefined) vals[k] = String(cfg[k]) })
    vals.effective_from = cfg.effective_from
    setForm(vals)
    setEditing(cfg.id)
    setShowForm(true)
  }

  const startCreate = () => {
    setForm({ ...DEFAULTS, effective_from: new Date().toISOString().slice(0, 10) })
    setEditing(null)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form }
    Object.keys(payload).forEach(k => {
      if (k !== 'effective_from') payload[k] = parseFloat(payload[k])
    })
    try {
      if (editing) {
        await api.patch(`/hr/payrate-config/${editing}/`, payload)
        toast.success('Updated.')
      } else {
        await api.post('/hr/payrate-config/', payload)
        toast.success('Created.')
      }
      setShowForm(false)
      setEditing(null)
      fetchConfigs()
      fetchCurrent()
    } catch (err) { toast.error(err.response?.data?.detail || err.response?.data?.effective_from?.[0] || 'Failed.') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this rate config?')) return
    try {
      await api.delete(`/hr/payrate-config/${id}/`)
      toast.success('Deleted.')
      fetchConfigs()
      fetchCurrent()
    } catch { toast.error('Failed.') }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Pay Rate Configuration</h1>
        <div className="flex-1"></div>
        <button onClick={startCreate} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> New Config</button>
      </div>

      {current && !showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Percent size={18} className="text-ocean-600" />
            <h2 className="text-lg font-semibold text-ocean-800">Current Effective: {current.effective_from}</h2>
            <button onClick={() => startEdit(current)} className="ml-auto text-sm text-ocean-600 hover:underline">Edit</button>
          </div>
          {FIELDS.map(sec => (
            <div key={sec.key} className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{sec.section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sec.fields.map(([k, label]) => (
                  <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-semibold text-ocean-700">{current[k]}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ocean-800 mb-4">{editing ? 'Edit Config' : 'New Config'}</h2>
          <div className="mb-4">
            <label className="text-sm text-gray-600">Effective From</label>
            <input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required disabled={!!editing} />
          </div>
          {FIELDS.map(sec => (
            <div key={sec.key} className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{sec.section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sec.fields.map(([k, label]) => (
                  <div key={k}>
                    <label className="text-xs text-gray-600">{label}</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="number" step="0.01" min="0" value={form[k]}
                        onChange={e => setForm({ ...form, [k]: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm" />
                      <span className="text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="btn-outline text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800">Configuration History</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="px-4 py-2">Effective From</th><th className="px-4 py-2">OT Ordinary</th><th className="px-4 py-2">Holiday (Reg)</th><th className="px-4 py-2">Night Diff</th><th className="px-4 py-2">Created By</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {configs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No configurations yet.</td></tr>}
            {configs.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{c.effective_from}</td>
                <td className="px-4 py-2">{c.ot_ordinary_pct}%</td>
                <td className="px-4 py-2">{c.regular_holiday_rate_pct}%</td>
                <td className="px-4 py-2">{c.night_diff_ordinary_pct}%</td>
                <td className="px-4 py-2 text-gray-500">{c.created_by_username || '-'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(c)} className="text-ocean-600 hover:underline text-sm mr-2">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-sm flex items-center gap-1 ml-auto"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
