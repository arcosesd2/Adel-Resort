'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown, CheckCircle, DollarSign, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function PayrollRunDetail() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const { id } = useParams()

  const [run, setRun] = useState(null)
  const [payslips, setPayslips] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/payroll'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    if (!(user?.is_admin || user?.is_superadmin)) { router.replace('/admin-dashboard'); return }
    fetchRun()
    fetchPayslips()
  }, [isReady, isAuthenticated, user, router, id])

  const fetchRun = async () => {
    try { const { data } = await api.get(`/hr/runs/${id}/`); setRun(data) } catch { toast.error('Failed to load run.') }
  }
  const fetchPayslips = async () => {
    try { const { data } = await api.get(`/hr/runs/${id}/payslips/`); setPayslips(data) } catch {}
  }

  const action = async (path, msg, body = {}) => {
    setBusy(true)
    try {
      await api.post(`/hr/runs/${id}/${path}/`, body)
      toast.success(msg)
      fetchRun()
      fetchPayslips()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.') } finally { setBusy(false) }
  }

  const downloadPdf = async (psId, num) => {
    try {
      const res = await api.get(`/hr/payslips/${psId}/pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `${num}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed.') }
  }

  if (!isReady || !user?.is_staff || !run) return null

  const totals = payslips.reduce((acc, p) => {
    acc.gross += Number(p.gross_earnings || 0)
    acc.deduct += Number(p.total_deductions || 0)
    acc.net += Number(p.net_pay || 0)
    return acc
  }, { gross: 0, deduct: 0, net: 0 })

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin-dashboard/payroll" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Payroll Run #{run.id}</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${run.status === 'paid' ? 'bg-green-100 text-green-700' : run.status === 'finalized' ? 'bg-blue-100 text-blue-700' : run.status === 'voided' ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>{run.status}</span>
        <div className="flex-1"></div>
        {run.status === 'draft' && <button onClick={() => action('finalize', 'Finalized.')} disabled={busy} className="btn-primary text-sm flex items-center gap-1"><CheckCircle size={14} /> Finalize</button>}
        {run.status === 'finalized' && <button onClick={() => action('mark-paid', 'Marked as paid; loan deductions applied.')} disabled={busy} className="btn-primary text-sm flex items-center gap-1"><DollarSign size={14} /> Mark Paid</button>}
        {run.status !== 'voided' && (
          <button onClick={() => { const reason = prompt('Reason for voiding?', ''); if (reason !== null) action('void', 'Voided.', { reason }) }} disabled={busy} className="btn-outline text-sm flex items-center gap-1 text-red-600 border-red-200"><XCircle size={14} /> Void</button>
        )}
      </div>

      <div className="card p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><div className="text-gray-500">Period</div><div className="font-semibold">{run.period?.start_date} → {run.period?.end_date}</div></div>
        <div><div className="text-gray-500">Gross Total</div><div className="font-semibold">₱{totals.gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
        <div><div className="text-gray-500">Deductions</div><div className="font-semibold">₱{totals.deduct.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
        <div><div className="text-gray-500">Net Total</div><div className="font-semibold text-ocean-700">₱{totals.net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800">Payslips ({payslips.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                 <th className="px-4 py-2">No.</th><th className="px-4 py-2">Employee</th>
                 <th className="px-4 py-2 text-right">Gross</th>
                 <th className="px-4 py-2 text-right">OT</th><th className="px-4 py-2 text-right">Holiday</th>
                 <th className="px-4 py-2 text-right">RestDay</th><th className="px-4 py-2 text-right">Night</th>
                 <th className="px-4 py-2 text-right">SSS</th><th className="px-4 py-2 text-right">PH</th>
                 <th className="px-4 py-2 text-right">HDMF</th><th className="px-4 py-2 text-right">WTax</th>
                 <th className="px-4 py-2 text-right">Loan</th><th className="px-4 py-2 text-right">Other</th>
                 <th className="px-4 py-2 text-right">Net</th>
                 <th className="px-4 py-2"></th>
               </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && <tr><td colSpan={15} className="text-center py-8 text-gray-400">No payslips.</td></tr>}
              {payslips.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{p.payslip_number}</td>
                  <td className="px-4 py-2">{p.employee_name} <span className="text-gray-400 text-xs">{p.employee_code}</span></td>
                  <td className="px-4 py-2 text-right">₱{Number(p.gross_earnings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.overtime_pay) > 0 ? `₱${Number(p.overtime_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-2 text-right">{Number(p.holiday_pay) > 0 ? `₱${Number(p.holiday_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-2 text-right">{Number(p.rest_day_pay) > 0 ? `₱${Number(p.rest_day_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-2 text-right">{Number(p.night_diff) > 0 ? `₱${Number(p.night_diff).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-2 text-right">{Number(p.sss_ee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.philhealth_ee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.pagibig_ee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.withholding_tax).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.loan_deduction_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{Number(p.other_deductions) > 0 ? `₱${Number(p.other_deductions).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-2 text-right font-semibold text-ocean-700">₱{Number(p.net_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => downloadPdf(p.id, p.payslip_number)} className="text-ocean-600 hover:underline flex items-center gap-1 ml-auto"><FileDown size={14} /> PDF</button>
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
