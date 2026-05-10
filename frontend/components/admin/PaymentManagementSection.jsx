'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, ChevronDown, ChevronRight, ExternalLink, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const STATUS_OPTIONS = ['all', 'pending', 'succeeded', 'failed', 'refunded']

const statusBadge = {
  pending:   'bg-amber-100 text-amber-700',
  succeeded: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-500',
}

const statusIcon = {
  pending:   <Clock size={14} />,
  succeeded: <CheckCircle size={14} />,
  failed:    <XCircle size={14} />,
  refunded:  <RefreshCw size={14} />,
}

const paymentTypeLabel = {
  full:        'Full Payment',
  downpayment: 'Downpayment',
  partial:     'Partial Payment',
}

export default function PaymentManagementSection() {
  const [open, setOpen] = useState(true)
  const [payments, setPayments] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const { data } = await api.get(`/payments/admin/${params}`)
      setPayments(data)
    } catch {
      toast.error('Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (open) fetchPayments()
  }, [open, fetchPayments])

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`Set payment #${id} to "${newStatus}"? This will also update the related booking.`)) return
    setUpdating(id)
    try {
      const { data } = await api.patch(`/payments/admin/${id}/`, { status: newStatus })
      setPayments(prev => prev.map(p => p.id === id ? data : p))
      toast.success(`Payment #${id} updated to ${newStatus}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update payment.')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
      <div className="card overflow-hidden mb-10">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setOpen(o => !o)}
        >
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <CreditCard size={20} />
            Payment Transactions
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{payments.length} record{payments.length !== 1 ? 's' : ''}</span>
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>

        {open && (
          <>
            {/* Filter bar */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500 font-medium">Filter:</span>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    filter === s
                      ? 'bg-ocean-600 text-white border-ocean-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-ocean-300'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                onClick={fetchPayments}
                className="ml-auto text-xs px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-ocean-300 flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading payments…</div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No payments found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Booking Ref</th>
                      <th className="px-4 py-3 text-left">Guest</th>
                      <th className="px-4 py-3 text-left">Room</th>
                      <th className="px-4 py-3 text-left">GCash Ref</th>
                      <th className="px-4 py-3 text-left">Proof</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-gray-400">{p.id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ocean-700">{p.booking_reference}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{p.guest_name}</div>
                          <div className="text-xs text-gray-400">{p.guest_email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.room_name}</td>
                        <td className="px-4 py-3">
                          {p.gcash_reference ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{p.gcash_reference}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.proof_of_payment_url ? (
                            <button
                              onClick={() => setLightbox(p.proof_of_payment_url)}
                              className="group relative"
                              title="View proof of payment"
                            >
                              <img
                                src={p.proof_of_payment_url}
                                alt="Proof"
                                className="w-12 h-12 object-cover rounded border border-gray-200 group-hover:border-ocean-400 transition-colors"
                              />
                              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 rounded transition-opacity">
                                <ExternalLink size={14} className="text-white" />
                              </span>
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          ₱{Number(p.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {paymentTypeLabel[p.payment_type] || p.payment_type}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status]}`}>
                            {statusIcon[p.status]}
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br />
                          {new Date(p.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            disabled={updating === p.id}
                            onChange={e => handleStatusChange(p.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-ocean-400 disabled:opacity-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="succeeded">Succeeded</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox for proof of payment */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white text-sm hover:text-gray-300"
            >
              Close ✕
            </button>
            <img src={lightbox} alt="Proof of Payment" className="w-full rounded-lg shadow-2xl" />
            <a
              href={lightbox}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-300 hover:text-white"
            >
              <ExternalLink size={12} /> Open in new tab
            </a>
          </div>
        </div>
      )}
    </>
  )
}
