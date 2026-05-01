'use client'

import { useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const PALETTE = ['#0e7490', '#0891b2', '#14b8a6', '#f59e0b', '#a855f7', '#ec4899', '#64748b']

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
const formatShortCurrency = (val) => `₱${(Number(val || 0) / 1000).toFixed(0)}k`

export default function RevenueBreakdownsSection({ insights }) {
  const [open, setOpen] = useState(true)

  const {
    revenue_by_room = [],
    revenue_by_room_type = [],
    revenue_by_payment_type = [],
    weekday_vs_weekend = { weekday: { revenue: 0, bookings: 0 }, weekend: { revenue: 0, bookings: 0 } },
    long_window,
  } = insights || {}

  const roomChartData = revenue_by_room.slice(0, 10).map(r => ({
    name: r.room__name,
    revenue: r.revenue,
    bookings: r.bookings,
  }))

  const roomTypeChartData = revenue_by_room_type.map(r => ({
    name: r.room_type_label,
    revenue: r.revenue,
    bookings: r.bookings,
  }))

  const paymentChartData = revenue_by_payment_type.map(r => ({
    name: r.payment__payment_type === 'full' ? 'Full Payment'
        : r.payment__payment_type === 'downpayment' ? 'Downpayment'
        : r.payment__payment_type === 'onsite' ? 'Onsite (no payment record)'
        : r.payment__payment_type,
    value: r.revenue,
  }))

  const weekdayData = [
    { name: 'Weekday', revenue: weekday_vs_weekend.weekday.revenue, bookings: weekday_vs_weekend.weekday.bookings },
    { name: 'Weekend', revenue: weekday_vs_weekend.weekend.revenue, bookings: weekday_vs_weekend.weekend.bookings },
  ]

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <BarChart3 size={20} /> Revenue Breakdowns
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Room (top 10) */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Revenue by Room (Top 10)</h3>
              <div className="h-72">
                {roomChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomChartData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#0e7490" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Revenue by Room Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Revenue by Room Type</h3>
              <div className="h-72">
                {roomTypeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomTypeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                      <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Revenue by Payment Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Revenue by Payment Type</h3>
              <div className="h-72">
                {paymentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        cx="50%" cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentChartData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Weekday vs Weekend */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Weekday vs Weekend (by Check-in)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, key) => key === 'revenue' ? [formatCurrency(val), 'Revenue'] : [val, 'Bookings']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
