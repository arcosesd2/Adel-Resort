'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Banknote, Plus, Ban, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function LoanDetailPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const { id } = useParams()

  const [loan, setLoan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [pay, setPay] = useState({
    amount: '', payment_date: new Date().toISOString().slice(0, 10),
    source: 'cash', reference: '', notes: '',
  })

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/loans'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchLoan()
  }, [isReady, isAuthenticated, user, router, id])

  const fetchLoan = async () => {
    try { const { data } = await api.get(`/hr/loans/${id}/`); setLoan(data) }
    catch { toast.error('Failed to load loan.') }
  }

  const recordPayment = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post(`/hr/loans/${id}/payments/`, pay)
      toast.success('Payment recorded.')
      setShowPayForm(false)
      setPay({ ...pay, amount: '', reference: '', notes: '' })
      fetchLoan()
    } catch (err) {
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setBusy(false) }
  }

  const cancelLoan = async () => {
    if (!confirm('Cancel this loan? Only allowed if no payments have been recorded.')) return
    setBusy(true)
    try {
      await api.post(`/hr/loans/${id}/cancel/`)
      toast.success('Cancelled.')
      fetchLoan()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') } finally { setBusy(false) }
  }

  const defaultLoan = async () => {
    if (!confirm('Mark loan as DEFAULTED? Auto-deduct will stop.')) return
    setBusy(true)
    try {
      await api.post(`/hr/loans/${id}/default/`)
      toast.success('Marked DEFAULTED.')
      fetchLoan()
    } catch { toast.error('Failed.') } finally { setBusy(false) }
  }

  if (!isReady || !user?.is_staff || !loan) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard/loans" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Loan #{loan.id}</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'active' ? 'bg-green-100 text-green-700' : loan.status === 'paid_off' ? 'bg-blue-100 text-blue-700' : loan.status === 'defaulted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{loan.status?.replace('_', ' ')}</span>
        <div className="flex-1"></div>
        {loan.status === 'active' && (
          <>
            <button onClick={cancelLoan} disabled={busy} className="btn-outline text-sm flex items-center gap-1"><Ban size={14} /> Cancel</button>
            <button onClick={defaultLoan} disabled={busy} className="btn-outline text-sm flex items-center gap-1 text-red-600 border-red-200"><AlertTriangle size={14} /> Default</button>
          </>
        )}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-ocean-800 mb-3">{loan.employee_name} <span className="text-sm text-gray-400 font-normal">{loan.employee_code}</span></h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-gray-500">Principal</dt><dd>₱{Number(loan.principal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
          <div><dt className="text-gray-500">Installment</dt><dd>₱{Number(loan.installment_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/period</dd></div>
          <div><dt className="text-gray-500">Term</dt><dd>{loan.term_periods} periods</dd></div>
          <div><dt className="text-gray-500">Interest</dt><dd>{loan.interest_rate_percent}% ({loan.interest_method})</dd></div>
          <div><dt className="text-gray-500">Auto-deduct</dt><dd>{loan.auto_deduct ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-gray-500">Start Date</dt><dd>{loan.start_date}</dd></div>
          <div><dt className="text-gray-500">Total Paid</dt><dd className="font-semibold">₱{Number(loan.total_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
          <div><dt className="text-gray-500">Remaining Balance</dt><dd className="font-bold text-ocean-700 text-base">₱{Number(loan.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</dd></div>
          <div><dt className="text-gray-500">Purpose</dt><dd>{loan.purpose || '-'}</dd></div>
        </dl>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Banknote size={18} /> Payments</h2>
          {loan.status === 'active' && <button onClick={() => setShowPayForm(!showPayForm)} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> Record manual payment</button>}
        </div>

        {showPayForm && (
          <form onSubmit={recordPayment} className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Amount *</label>
                <input type="number" step="0.01" required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Date *</label>
                <input type="date" required value={pay.payment_date} onChange={(e) => setPay({ ...pay, payment_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Source *</label>
                <select value={pay.source} onChange={(e) => setPay({ ...pay, source: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
                  <option value="gcash">GCash</option><option value="other">Other</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Reference</label>
                <input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Notes</label>
                <input value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary text-sm">Record</button>
              <button type="button" onClick={() => setShowPayForm(false)} className="btn-outline text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Source</th><th className="px-4 py-2">Reference</th></tr>
            </thead>
            <tbody>
              {(!loan.payments || loan.payments.length === 0) && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No payments yet.</td></tr>}
              {(loan.payments || []).map(p => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{p.payment_date}</td>
                  <td className="px-4 py-2 text-right">₱{Number(p.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 capitalize">{p.source?.replace('_', ' ')}</td>
                  <td className="px-4 py-2">{p.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
