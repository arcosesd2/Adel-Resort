'use client'

import { useState } from 'react'
import { Tag, ChevronDown, ChevronRight, Info } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
const formatShortCurrency = (val) => `₱${(Number(val || 0) / 1000).toFixed(0)}k`

export default function DiscountsSection({ insights }) {
  const [open, setOpen] = useState(true)

  const {
    voucher_roi = [],
    manual_discount_total = 0,
    cancellation_stats = { total: 0, cancelled: 0, rate_pct: 0 },
    refunded_revenue = 0,
    lost_revenue = 0,
    walkin_vs_online = { walkin: { count: 0, revenue: 0 }, online: { count: 0, revenue: 0 } },
    long_window,
  } = insights || {}

  const walkinChartData = [
    { name: 'Online', revenue: walkin_vs_online.online.revenue, bookings: walkin_vs_online.online.count },
    { name: 'Walk-in', revenue: walkin_vs_online.walkin.revenue, bookings: walkin_vs_online.walkin.count },
  ]

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <Tag size={20} /> Discounts, Vouchers & Cancellations
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="p-6">
          {long_window && (
            <p className="text-xs text-gray-500 mb-4">
              Window: {long_window.from} → {long_window.to}
            </p>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Cancellation Rate</p>
              <p className="text-xl font-bold text-red-700">{cancellation_stats.rate_pct}%</p>
              <p className="text-xs text-gray-400 mt-1">{cancellation_stats.cancelled} of {cancellation_stats.total} bookings</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Refunded Revenue</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(refunded_revenue)}</p>
              <p className="text-xs text-gray-400 mt-1">payments refunded</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Lost Potential</p>
              <p className="text-xl font-bold text-rose-700">{formatCurrency(lost_revenue)}</p>
              <p className="text-xs text-gray-400 mt-1">cancelled-booking value</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Manual Discounts Given</p>
              <p className="text-xl font-bold text-violet-700">{formatCurrency(manual_discount_total)}</p>
              <p className="text-xs text-gray-400 mt-1">staff-applied discounts</p>
            </div>
          </div>

          {/* Manual discount tracking note */}
          <div className="mb-6 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Manual-discount totals only include bookings created after the tracking field was added (May 2026).
              Older bookings had the discount applied to their total price but the raw amount was not stored.
            </p>
          </div>

          {/* Voucher ROI table + walk-in vs online */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Voucher ROI</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Uses</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Discount Given</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {voucher_roi.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No vouchers used in this window</td></tr>
                    ) : voucher_roi.map((v) => (
                      <tr key={v.voucher__code}>
                        <td className="px-3 py-2 font-mono text-gray-700">{v.voucher__code}</td>
                        <td className="px-3 py-2 text-right">{v.uses}</td>
                        <td className="px-3 py-2 text-right text-rose-600">{formatCurrency(v.total_discount)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(v.revenue_after)}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {v.roi !== null ? `${v.roi}×` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">ROI = revenue retained ÷ discount given. Higher = voucher attracted more revenue than it cost.</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Walk-in vs Online</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={walkinChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, key) => key === 'revenue' ? [formatCurrency(val), 'Revenue'] : [val, 'Bookings']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#0e7490" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Walk-in = backdated bookings or auto-generated walk-in usernames.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
