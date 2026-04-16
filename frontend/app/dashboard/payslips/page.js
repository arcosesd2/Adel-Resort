'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function MyPayslipsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/dashboard/payslips'); return }
    api.get('/hr/employees/me/payslips/')
      .then(({ data }) => setPayslips(data))
      .catch(() => toast.error('Failed to load payslips.'))
      .finally(() => setLoading(false))
  }, [isReady, isAuthenticated, router])

  const downloadPdf = async (id, num) => {
    try {
      const res = await api.get(`/hr/payslips/${id}/pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `${num}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed.') }
  }

  if (!isReady || loading) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">My Payslips</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><FileText size={20} /> Payslips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">No.</th><th className="px-4 py-2">Period</th>
                <th className="px-4 py-2 text-right">Gross</th><th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net Pay</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {payslips.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No payslips yet.</td></tr>}
              {payslips.map(p => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{p.payslip_number}</td>
                  <td className="px-4 py-2">{p.period?.start_date} → {p.period?.end_date}</td>
                  <td className="px-4 py-2 text-right">₱{Number(p.gross_earnings).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right text-red-600">−₱{Number(p.total_deductions).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right font-bold text-ocean-700">₱{Number(p.net_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => downloadPdf(p.id, p.payslip_number)} className="text-ocean-600 hover:underline flex items-center gap-1 ml-auto"><FileDown size={14} /> PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
