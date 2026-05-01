'use client'

import { useState } from 'react'
import { Gauge, ChevronDown, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`

export default function HotelKpiSection({ insights }) {
  const [open, setOpen] = useState(true)

  const {
    adr = 0,
    revpar = 0,
    occupancy_pct = 0,
    occupied_room_nights = 0,
    total_available_slots = 0,
    short_window,
    long_window,
    occupancy_trend = [],
    lead_time_buckets = [],
  } = insights || {}

  const formatDayLabel = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="card overflow-hidden mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
          <Gauge size={20} /> Hotel KPIs
        </h2>
        {open ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {open && (
        <div className="p-6">
          {short_window && (
            <p className="text-xs text-gray-500 mb-4">
              KPIs window: {short_window.from} → {short_window.to}
            </p>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-gray-500" title="Average Daily Rate — revenue per occupied room-night">ADR</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(adr)}</p>
              <p className="text-xs text-gray-400 mt-1">{occupied_room_nights.toLocaleString()} room-nights occupied</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-4">
              <p className="text-sm text-gray-500" title="Revenue per Available Room — revenue ÷ available room-nights">RevPAR</p>
              <p className="text-xl font-bold text-cyan-700">{formatCurrency(revpar)}</p>
              <p className="text-xs text-gray-400 mt-1">{total_available_slots.toLocaleString()} available room-nights</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Occupancy</p>
              <p className="text-xl font-bold text-amber-700">{Number(occupancy_pct).toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">across all active rooms</p>
            </div>
          </div>

          {/* Occupancy trend + lead time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">Daily Occupancy Trend</h3>
              <div className="h-64">
                {occupancy_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={occupancy_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tickFormatter={formatDayLabel} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(val) => [`${val}%`, 'Occupancy']}
                        labelFormatter={formatDayLabel}
                      />
                      <Line type="monotone" dataKey="occupancy_pct" stroke="#0e7490" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600">Booking Lead Time</h3>
                {long_window && (
                  <span className="text-xs text-gray-400">
                    {long_window.from} → {long_window.to}
                  </span>
                )}
              </div>
              <div className="h-64">
                {lead_time_buckets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lead_time_buckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => [val, 'Bookings']} labelFormatter={(l) => `${l} day(s) ahead`} />
                      <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Days from booking creation to check-in</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
