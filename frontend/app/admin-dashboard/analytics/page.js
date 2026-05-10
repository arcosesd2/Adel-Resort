'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Maximize2, Tag, UserCheck, Info } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const PALETTE = ['#0e7490', '#0891b2', '#14b8a6', '#f59e0b', '#a855f7', '#ec4899', '#64748b']

const fmtCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
const fmtShort = (val) => `₱${(Number(val || 0) / 1000).toFixed(0)}k`
const fmtDelta = (pct) => `${pct >= 0 ? '+' : ''}${Number(pct).toFixed(1)}%`
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtMonth = (m) => {
  const [y, mo] = m.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function Kpi({ label, value, sub, color = 'text-gray-900', bg = 'bg-gray-50', tip }) {
  return (
    <div className={`${bg} rounded-lg px-3 py-2.5 min-w-0`} title={tip}>
      <p className="text-[11px] text-gray-500 truncate">{label}</p>
      <p className={`text-lg font-bold ${color} truncate leading-tight`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, sub, children, span = '' }) {
  return (
    <div className={`card p-3 ${span} flex flex-col min-w-0`}>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h3 className="text-xs font-semibold text-gray-700 truncate">{title}</h3>
        {sub && <span className="text-[10px] text-gray-400 truncate">{sub}</span>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-gray-400 text-xs">No data</div>
}

export default function AnalyticsMonitorPage() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const containerRef = useRef(null)

  const fetchAll = async (from = dateFrom, to = dateTo) => {
    setInsightsLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const insightsUrl = params.toString() ? `/analytics/revenue-insights/?${params}` : '/analytics/revenue-insights/'
      const [dashRes, insRes] = await Promise.all([
        api.get('/analytics/dashboard/'),
        api.get(insightsUrl),
      ])
      setData(dashRes.data)
      setInsights(insRes.data)
    } catch {
      toast.error('Failed to load analytics')
      setData(prev => prev || {})
    } finally {
      setLoading(false)
      setInsightsLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const goFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.().catch(() => {})
  }

  // Derive comparisons fallback (matches RevenueAnalyticsSection logic)
  const mom = useMemo(() => {
    if (insights?.comparisons?.mom) return insights.comparisons.mom
    if (!data?.revenue_by_month) return { curr: 0, prev: 0, delta_pct: 0 }
    const now = new Date()
    const tk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lk = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`
    const curr = data.revenue_by_month.find(m => m.month === tk)?.revenue || 0
    const prev = data.revenue_by_month.find(m => m.month === lk)?.revenue || 0
    const delta_pct = prev > 0 ? Number(((curr - prev) / prev * 100).toFixed(1)) : (curr > 0 ? 100 : 0)
    return { curr, prev, delta_pct }
  }, [insights, data])

  const yoy = insights?.comparisons?.yoy

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-20 pb-6 px-4 max-w-screen-2xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const {
    revenue_by_day = [],
    revenue_by_month = [],
    net_income = 0,
    total_sales = 0,
  } = data

  const {
    revenue_by_room = [],
    revenue_by_room_type = [],
    revenue_by_payment_type = [],
    weekday_vs_weekend = { weekday: { revenue: 0, bookings: 0 }, weekend: { revenue: 0, bookings: 0 } },
    adr = 0, revpar = 0, occupancy_pct = 0,
    occupied_room_nights = 0, total_available_slots = 0,
    occupancy_trend = [], lead_time_buckets = [],
    voucher_roi = [],
    manual_discount_total = 0,
    cancellation_stats = { total: 0, cancelled: 0, rate_pct: 0 },
    refunded_revenue = 0, lost_revenue = 0,
    walkin_vs_online = { walkin: { count: 0, revenue: 0 }, online: { count: 0, revenue: 0 } },
    repeat_booking_rate = 0,
    new_vs_returning = { new: 0, returning: 0 },
    top_spenders = [],
    short_window, long_window,
  } = insights || {}

  const roomChartData = revenue_by_room.slice(0, 8).map(r => ({ name: r.room__name, revenue: r.revenue }))
  const roomTypeChartData = revenue_by_room_type.map(r => ({ name: r.room_type_label, revenue: r.revenue }))
  const paymentChartData = revenue_by_payment_type.map(r => ({
    name: r.payment__payment_type === 'full' ? 'Full'
      : r.payment__payment_type === 'downpayment' ? 'Down'
      : r.payment__payment_type === 'partial' ? 'Partial'
      : r.payment__payment_type === 'onsite' ? 'Onsite'
      : r.payment__payment_type,
    value: r.revenue,
  }))
  const weekdayData = [
    { name: 'Weekday', revenue: weekday_vs_weekend.weekday.revenue, bookings: weekday_vs_weekend.weekday.bookings },
    { name: 'Weekend', revenue: weekday_vs_weekend.weekend.revenue, bookings: weekday_vs_weekend.weekend.bookings },
  ]
  const walkinData = [
    { name: 'Online', revenue: walkin_vs_online.online.revenue, bookings: walkin_vs_online.online.count },
    { name: 'Walk-in', revenue: walkin_vs_online.walkin.revenue, bookings: walkin_vs_online.walkin.count },
  ]
  const newVsReturningTotal = (new_vs_returning.new || 0) + (new_vs_returning.returning || 0)
  const newReturnPie = [
    { name: 'New', value: new_vs_returning.new || 0 },
    { name: 'Returning', value: new_vs_returning.returning || 0 },
  ]

  return (
    <div ref={containerRef} className="min-h-screen pt-20 pb-6 px-3 sm:px-4 max-w-screen-2xl mx-auto bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Link href="/admin-dashboard" className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-ocean-800">Analytics Monitor</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs" aria-label="From" />
          <span className="text-gray-400">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs" aria-label="To" />
          <button onClick={() => fetchAll(dateFrom, dateTo)} disabled={insightsLoading}
            className="btn-primary text-xs px-2.5 py-1.5 disabled:opacity-50">
            {insightsLoading ? '…' : 'Apply'}
          </button>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); fetchAll('', '') }}
              className="btn-outline text-xs px-2.5 py-1.5">Reset</button>
          )}
          <button onClick={() => fetchAll(dateFrom, dateTo)} className="btn-outline text-xs px-2 py-1.5" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={goFullscreen} className="btn-outline text-xs px-2 py-1.5" title="Fullscreen">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {short_window && (
        <p className="text-[10px] text-gray-400 mb-2">
          KPIs: {short_window.from} → {short_window.to}
          {long_window && <> · Breakdowns: {long_window.from} → {long_window.to}</>}
        </p>
      )}

      {/* Top KPI strip — 8 mini cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
        <Kpi label="Net Income" value={fmtCurrency(net_income)} bg="bg-green-50" color="text-green-700" />
        <Kpi label="This Month" value={fmtCurrency(mom.curr)} sub={`Last: ${fmtCurrency(mom.prev)}`} bg="bg-blue-50" color="text-blue-700" />
        <Kpi label="MoM Change" value={fmtDelta(mom.delta_pct)} bg={mom.delta_pct >= 0 ? 'bg-emerald-50' : 'bg-red-50'} color={mom.delta_pct >= 0 ? 'text-emerald-700' : 'text-red-700'} />
        <Kpi label="YoY Change" value={yoy ? fmtDelta(yoy.delta_pct) : '—'} sub={yoy ? `vs ${fmtCurrency(yoy.prev)}` : 'loading…'} bg={yoy && yoy.delta_pct >= 0 ? 'bg-cyan-50' : yoy ? 'bg-rose-50' : 'bg-gray-50'} color={yoy && yoy.delta_pct >= 0 ? 'text-cyan-700' : yoy ? 'text-rose-700' : 'text-gray-400'} />
        <Kpi label="ADR" value={fmtCurrency(adr)} sub={`${occupied_room_nights.toLocaleString()} room-nights`} bg="bg-emerald-50" color="text-emerald-700" tip="Average Daily Rate" />
        <Kpi label="RevPAR" value={fmtCurrency(revpar)} sub={`${total_available_slots.toLocaleString()} avail.`} bg="bg-cyan-50" color="text-cyan-700" tip="Revenue per Available Room" />
        <Kpi label="Occupancy" value={`${Number(occupancy_pct).toFixed(1)}%`} sub="all active rooms" bg="bg-amber-50" color="text-amber-700" />
        <Kpi label="Repeat Rate" value={`${repeat_booking_rate}%`} sub={`${newVsReturningTotal} bookings`} bg="bg-teal-50" color="text-teal-700" />
      </div>

      {/* Discount/Cancellation strip — 4 mini cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Kpi label="Cancellation Rate" value={`${cancellation_stats.rate_pct}%`} sub={`${cancellation_stats.cancelled}/${cancellation_stats.total} bookings`} bg="bg-red-50" color="text-red-700" />
        <Kpi label="Refunded Revenue" value={fmtCurrency(refunded_revenue)} sub="payments refunded" bg="bg-orange-50" color="text-orange-700" />
        <Kpi label="Lost Potential" value={fmtCurrency(lost_revenue)} sub="cancelled value" bg="bg-rose-50" color="text-rose-700" />
        <Kpi label="Manual Discounts" value={fmtCurrency(manual_discount_total)} sub="staff-applied" bg="bg-violet-50" color="text-violet-700" />
      </div>

      {/* Main charts grid — 12 col on xl, dense */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-3 mb-3">
        {/* Daily Revenue (last 30d) */}
        <ChartCard title="Daily Revenue" sub="Last 30d" span="lg:col-span-2 xl:col-span-4 h-44">
          {revenue_by_day.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_by_day} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} labelFormatter={fmtDay} />
                <Area type="monotone" dataKey="revenue" stroke="#0e7490" fill="#0e7490" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Monthly Revenue (last 12mo) */}
        <ChartCard title="Monthly Revenue" sub="Last 12mo" span="lg:col-span-2 xl:col-span-4 h-44">
          {revenue_by_month.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue_by_month} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} labelFormatter={fmtMonth} />
                <Bar dataKey="revenue" fill="#0e7490" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Daily Occupancy */}
        <ChartCard title="Daily Occupancy" sub="%" span="lg:col-span-2 xl:col-span-4 h-44">
          {occupancy_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancy_trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Occ.']} labelFormatter={fmtDay} />
                <Line type="monotone" dataKey="occupancy_pct" stroke="#0e7490" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Revenue by Room */}
        <ChartCard title="Revenue by Room" sub="Top 8" span="lg:col-span-2 xl:col-span-4 h-56">
          {roomChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomChartData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#0e7490" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Revenue by Room Type */}
        <ChartCard title="Revenue by Room Type" span="lg:col-span-2 xl:col-span-4 h-56">
          {roomTypeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomTypeChartData} margin={{ top: 4, right: 4, left: -12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} interval={0} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [fmtCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#0891b2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Lead Time */}
        <ChartCard title="Booking Lead Time" sub="days ahead" span="lg:col-span-2 xl:col-span-4 h-56">
          {lead_time_buckets.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lead_time_buckets} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [v, 'Bookings']} labelFormatter={(l) => `${l} day(s) ahead`} />
                <Bar dataKey="count" fill="#a855f7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Payment Type Pie */}
        <ChartCard title="Revenue by Payment Type" span="lg:col-span-2 xl:col-span-3 h-56">
          {paymentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentChartData} cx="50%" cy="50%" outerRadius={60} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {paymentChartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Weekday vs Weekend */}
        <ChartCard title="Weekday vs Weekend" sub="by check-in" span="lg:col-span-2 xl:col-span-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, k) => k === 'revenue' ? [fmtCurrency(v), 'Revenue'] : [v, 'Bookings']} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="revenue" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="bookings" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Walk-in vs Online */}
        <ChartCard title="Walk-in vs Online" span="lg:col-span-2 xl:col-span-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={walkinData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, k) => k === 'revenue' ? [fmtCurrency(v), 'Revenue'] : [v, 'Bookings']} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="revenue" fill="#0e7490" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="bookings" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* New vs Returning Pie */}
        <ChartCard title="New vs Returning" sub={`${newVsReturningTotal} total`} span="lg:col-span-2 xl:col-span-3 h-56">
          {newVsReturningTotal > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={newReturnPie} cx="50%" cy="50%" outerRadius={60} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  <Cell fill="#0e7490" />
                  <Cell fill="#a855f7" />
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/* Voucher ROI */}
        <div className="card p-3">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Tag size={13} /> Voucher ROI
            </h3>
            <span className="text-[10px] text-gray-400">revenue ÷ discount</span>
          </div>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Uses</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Discount</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {voucher_roi.length === 0 ? (
                  <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-400">No vouchers used in this window</td></tr>
                ) : voucher_roi.map((v) => (
                  <tr key={v.voucher__code}>
                    <td className="px-2 py-1.5 font-mono text-gray-700">{v.voucher__code}</td>
                    <td className="px-2 py-1.5 text-right">{v.uses}</td>
                    <td className="px-2 py-1.5 text-right text-rose-600">{fmtCurrency(v.total_discount)}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-600">{fmtCurrency(v.revenue_after)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{v.roi !== null ? `${v.roi}×` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Spenders — superadmin only */}
        {user?.is_superadmin ? (
          <div className="card p-3">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <UserCheck size={13} /> Top Spenders
              </h3>
              <span className="text-[10px] text-gray-400">Top 20</span>
            </div>
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Guest</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Bookings</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Spent</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Last</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {top_spenders.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-4 text-center text-gray-400">No data</td></tr>
                  ) : top_spenders.map((g) => (
                    <tr key={g.guest_name}>
                      <td className="px-2 py-1.5 font-medium text-gray-700 truncate max-w-[140px]">{g.guest_name}</td>
                      <td className="px-2 py-1.5 text-right">{g.bookings}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">{fmtCurrency(g.total_spent)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">
                        {g.last_booking ? new Date(g.last_booking).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card p-3 flex items-center gap-2 text-xs text-gray-500">
            <Info size={14} /> Top Spenders list is visible to superadmins only.
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-gray-400 text-center">
        Manual-discount totals only include bookings created after May 2026 (when the tracking field was added).
      </p>
    </div>
  )
}
