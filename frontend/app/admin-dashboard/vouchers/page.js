'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Tag, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

function toLocalDateRangeISOString(dateString, boundary) {
  if (boundary === 'start') {
    return `${dateString}T00:00:00+08:00`
  }
  return `${dateString}T23:59:59.999+08:00`
}

export default function VouchersPage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [vouchers, setVouchers] = useState([])
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [voucherForm, setVoucherForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '',
    valid_from: '', valid_until: '', max_uses: '', min_booking_amount: '',
  })
  const [creatingVoucher, setCreatingVoucher] = useState(false)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/admin-dashboard/vouchers'); return }
    if (!user?.is_staff) { router.replace('/dashboard'); return }
    fetchVouchers()
  }, [isReady, isAuthenticated, user, router])

  const fetchVouchers = async () => {
    try {
      const { data } = await api.get('/vouchers/')
      setVouchers(data)
    } catch {}
  }

  const handleCreateVoucher = async (e) => {
    e.preventDefault()
    setCreatingVoucher(true)
    try {
      if (voucherForm.valid_until < voucherForm.valid_from) {
        toast.error('Valid until date must be on or after valid from date.')
        return
      }

      const payload = {
        code: voucherForm.code,
        discount_type: voucherForm.discount_type,
        discount_value: voucherForm.discount_value,
        valid_from: toLocalDateRangeISOString(voucherForm.valid_from, 'start'),
        valid_until: toLocalDateRangeISOString(voucherForm.valid_until, 'end'),
      }
      if (voucherForm.max_uses) payload.max_uses = parseInt(voucherForm.max_uses)
      if (voucherForm.min_booking_amount) payload.min_booking_amount = voucherForm.min_booking_amount
      await api.post('/vouchers/', payload)
      toast.success('Voucher created!')
      setVoucherForm({ code: '', discount_type: 'percentage', discount_value: '', valid_from: '', valid_until: '', max_uses: '', min_booking_amount: '' })
      setShowVoucherForm(false)
      fetchVouchers()
    } catch (err) {
      const msg = err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to create voucher.'
      toast.error(msg)
    } finally {
      setCreatingVoucher(false)
    }
  }

  const handleToggleVoucher = async (id) => {
    try {
      await api.patch(`/vouchers/${id}/toggle/`)
      fetchVouchers()
    } catch { toast.error('Failed to toggle voucher.') }
  }

  const handleDeleteVoucher = async (id) => {
    if (!confirm('Delete this voucher?')) return
    try {
      await api.delete(`/vouchers/${id}/`)
      fetchVouchers()
      toast.success('Voucher deleted.')
    } catch { toast.error('Failed to delete voucher.') }
  }

  if (!isReady || !user?.is_staff) return null

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin-dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">Voucher Management</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <Tag size={20} /> Vouchers
          </h2>
          <button
            onClick={() => setShowVoucherForm(!showVoucherForm)}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={14} /> New Voucher
          </button>
        </div>

        {showVoucherForm && (
          <form onSubmit={handleCreateVoucher} className="p-6 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input type="text" required value={voucherForm.code}
                  onChange={e => setVoucherForm(f => ({ ...f, code: e.target.value }))}
                  className="input-field" placeholder="e.g. SUMMER20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select value={voucherForm.discount_type}
                  onChange={e => setVoucherForm(f => ({ ...f, discount_type: e.target.value }))}
                  className="input-field">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₱)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input type="number" required step="0.01" min="0" value={voucherForm.discount_value}
                  onChange={e => setVoucherForm(f => ({ ...f, discount_value: e.target.value }))}
                  className="input-field" placeholder="e.g. 20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                <input type="date" required value={voucherForm.valid_from}
                  onChange={e => setVoucherForm(f => ({ ...f, valid_from: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input type="date" required value={voucherForm.valid_until}
                  onChange={e => setVoucherForm(f => ({ ...f, valid_until: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (blank = unlimited)</label>
                <input type="number" min="1" value={voucherForm.max_uses}
                  onChange={e => setVoucherForm(f => ({ ...f, max_uses: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking Amount (optional)</label>
                <input type="number" step="0.01" min="0" value={voucherForm.min_booking_amount}
                  onChange={e => setVoucherForm(f => ({ ...f, min_booking_amount: e.target.value }))}
                  className="input-field" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creatingVoucher} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {creatingVoucher ? 'Creating...' : 'Create Voucher'}
              </button>
              <button type="button" onClick={() => setShowVoucherForm(false)} className="btn-outline text-sm px-4 py-2">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Valid Period</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Uses</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-800">{v.code}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {v.discount_type === 'percentage' ? `${v.discount_value}%` : `₱${v.discount_value}`}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(v.valid_from).toLocaleDateString()} – {new Date(v.valid_until).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 text-center">
                    {v.times_used}{v.max_uses ? `/${v.max_uses}` : ''}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleToggleVoucher(v.id)} className="text-gray-500 hover:text-ocean-600 mr-3" title="Toggle active">
                      {v.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleDeleteVoucher(v.id)} className="text-gray-500 hover:text-red-600" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No vouchers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
