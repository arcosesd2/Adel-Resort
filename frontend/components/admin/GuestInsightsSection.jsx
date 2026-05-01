'use client'

import { useState } from 'react'
import { UserCheck, ChevronDown, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts'

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`

export default function GuestInsightsSection({ insights, isSuperadmin }) {
  const [open, setOpen] = useState(true)

  const {
    repeat_booking_rate = 0,
    new_vs_returning = { new: 0, returning: 0 },
    top_spenders = [],
    long_window,
  } = insights || {}

  const total = (new_vs_returning.new || 0) + (new_vs_returning.returning || 0)
  const pieData = [
    { name: 'New', value: new_vs_returning.new || 0 },
    { name: 'Returning', value: new_vs_returning.returning || 0 },
  ]

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <UserCheck size={20} /> Guest Insights
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

          {/* Aggregate stats (visible to all staff) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="bg-teal-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-500">Repeat Booking Rate</p>
                <p className="text-2xl font-bold text-teal-700">{repeat_booking_rate}%</p>
                <p className="text-xs text-gray-400 mt-1">guests with 2+ confirmed/completed bookings</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Total Bookings (window)</p>
                <p className="text-2xl font-bold text-indigo-700">{total}</p>
                <p className="text-xs text-gray-400 mt-1">{new_vs_returning.new} new · {new_vs_returning.returning} returning</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">New vs Returning Guests</h3>
              <div className="h-56">
                {total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#0e7490" />
                        <Cell fill="#a855f7" />
                      </Pie>
                      <Tooltip formatter={(val, key) => [val, key]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Top spenders — superadmin only (mirrors unique_guests gating) */}
          {isSuperadmin && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Top Spenders (Top 20)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Guest</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Bookings</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Last Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {top_spenders.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No data</td></tr>
                    ) : top_spenders.map((g) => (
                      <tr key={g.user__id}>
                        <td className="px-3 py-2 font-medium text-gray-700">{g.guest_name}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {g.user__username && !g.user__username.startsWith('walkin-') ? g.user__username : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{g.bookings}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatCurrency(g.total_spent)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {g.last_booking ? new Date(g.last_booking).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
