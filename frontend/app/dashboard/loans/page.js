'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function MyLoansPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/dashboard/loans'); return }
    api.get('/hr/employees/me/loans/')
      .then(({ data }) => setLoans(data))
      .catch(() => toast.error('Failed to load loans.'))
      .finally(() => setLoading(false))
  }, [isReady, isAuthenticated, router])

  if (!isReady || loading) return null

  const totalActive = loans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + Number(l.remaining_balance || 0), 0)

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">My Loans</h1>
      </div>

      {totalActive > 0 && (
        <div className="card p-6 mb-6 bg-amber-50 border-amber-200 border">
          <div className="text-sm text-gray-600">Total Outstanding</div>
          <div className="text-3xl font-bold text-amber-700">₱{totalActive.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2"><Banknote size={20} /> Loan History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="px-4 py-2">#</th><th className="px-4 py-2 text-right">Principal</th>
                <th className="px-4 py-2 text-right">Installment</th><th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Remaining</th><th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2">Purpose</th></tr>
            </thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">No loans on file.</td></tr>}
              {loans.map(l => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono">{l.id}</td>
                  <td className="px-4 py-2 text-right">₱{Number(l.principal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">₱{Number(l.installment_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right text-green-700">₱{Number(l.total_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right font-semibold">₱{Number(l.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'paid_off' ? 'bg-blue-100 text-blue-700' : l.status === 'defaulted' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{l.status?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2">{l.purpose || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
