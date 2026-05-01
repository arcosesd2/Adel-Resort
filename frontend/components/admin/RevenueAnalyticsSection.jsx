'use client'

import { useState } from 'react'
import { DollarSign, ChevronDown, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

export default function RevenueAnalyticsSection({ data, comparisons }) {
  const [open, setOpen] = useState(true)

  const { revenue_by_day = [], revenue_by_month = [] } = data

  // Fall back to month-array math if comparisons (from /revenue-insights/) isn't loaded yet.
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  const fallbackThis = revenue_by_month.find(m => m.month === thisMonthKey)?.revenue || 0
  const fallbackLast = revenue_by_month.find(m => m.month === lastMonthKey)?.revenue || 0

  const mom = comparisons?.mom || { curr: fallbackThis, prev: fallbackLast, delta_pct: fallbackLast > 0 ? Number(((fallbackThis - fallbackLast) / fallbackLast * 100).toFixed(1)) : (fallbackThis > 0 ? 100 : 0) }
  const yoy = comparisons?.yoy

  const formatCurrency = (val) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
  const formatDelta = (pct) => `${pct >= 0 ? '+' : ''}${Number(pct).toFixed(1)}%`

  const formatDayLabel = (day) => {
    const d = new Date(day + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatMonthLabel = (month) => {
    const [y, m] = month.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1, 1)
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <DollarSign size={20} /> Revenue Analytics
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="p-6">
          {/* Summary Cards: This Month / Last Month / MoM / YoY */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(mom.curr)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Last Month</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(mom.prev)}</p>
            </div>
            <div className={`rounded-xl p-4 ${mom.delta_pct >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-500">MoM Change</p>
              <p className={`text-xl font-bold ${mom.delta_pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatDelta(mom.delta_pct)}
              </p>
            </div>
            {yoy ? (
              <div className={`rounded-xl p-4 ${yoy.delta_pct >= 0 ? 'bg-cyan-50' : 'bg-rose-50'}`}>
                <p className="text-sm text-gray-500">YoY Change</p>
                <p className={`text-xl font-bold ${yoy.delta_pct >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                  {formatDelta(yoy.delta_pct)}
                </p>
                <p className="text-xs text-gray-400 mt-1">vs {formatCurrency(yoy.prev)} last year</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">YoY Change</p>
                <p className="text-xl font-bold text-gray-400">—</p>
                <p className="text-xs text-gray-400 mt-1">loading…</p>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Daily Revenue (Last 30 Days)</h3>
              <div className="h-64">
                {revenue_by_day.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenue_by_day}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tickFormatter={formatDayLabel} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} labelFormatter={formatDayLabel} />
                      <Area type="monotone" dataKey="revenue" stroke="#0e7490" fill="#0e7490" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No daily revenue data</div>
                )}
              </div>
            </div>

            {/* Monthly Revenue */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Monthly Revenue (Last 12 Months)</h3>
              <div className="h-64">
                {revenue_by_month.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue_by_month}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [formatCurrency(val), 'Revenue']} labelFormatter={formatMonthLabel} />
                      <Bar dataKey="revenue" fill="#0e7490" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No monthly revenue data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
