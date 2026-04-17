'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClockIn, ClockOut, LogIn, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function MyAttendancePage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()

  const [records, setRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isReady) return
    if (!isAuthenticated) { router.replace('/auth/login?redirect=/dashboard/attendance'); return }
    fetchRecords()
  }, [isReady, isAuthenticated, router])

  const fetchRecords = async () => {
    try {
      const { data } = await api.get('/hr/attendance/my-records/')
      setRecords(data)
      const today = new Date().toISOString().slice(0, 10)
      const todayRec = data.find(r => r.date === today)
      setTodayRecord(todayRec || null)
    } catch { toast.error('Failed to load attendance.') } finally { setLoading(false) }
  }

  const handleClockIn = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/hr/attendance/clock-in/')
      toast.success('Clocked in!')
      setTodayRecord(data)
      fetchRecords()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to clock in.') } finally { setBusy(false) }
  }

  const handleClockOut = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/hr/attendance/clock-out/')
      toast.success('Clocked out!')
      setTodayRecord(data)
      fetchRecords()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to clock out.') } finally { setBusy(false) }
  }

  if (!isReady || loading) return null

  const isClockedIn = todayRecord && !todayRecord.time_out
  const isClockedOut = todayRecord && todayRecord.time_out
  const hasNoRecord = !todayRecord

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <h1 className="text-3xl font-serif font-bold text-ocean-800">My Attendance</h1>
      </div>

      <div className="card p-8 mb-6 text-center">
        {hasNoRecord && (
          <button onClick={handleClockIn} disabled={busy} className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto">
            <LogIn size={24} /> Clock In
          </button>
        )}
        {isClockedIn && (
          <div>
            <div className="text-sm text-gray-500 mb-2">Clocked in at {new Date(todayRecord.time_in).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
            <button onClick={handleClockOut} disabled={busy} className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto bg-red-600 hover:bg-red-700">
              <LogOut size={24} /> Clock Out
            </button>
          </div>
        )}
        {isClockedOut && (
          <div>
            <div className="text-green-600 font-semibold text-lg mb-2">Completed for today</div>
            <div className="text-sm text-gray-500">
              In: {new Date(todayRecord.time_in).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              {' → '}
              Out: {new Date(todayRecord.time_out).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              {' | '}
              {todayRecord.hours_worked}h worked
              {todayRecord.overtime_hours > 0 && ` | ${todayRecord.overtime_hours}h OT`}
            </div>
            {todayRecord.is_late && <div className="text-amber-600 text-sm mt-1">Late by {todayRecord.late_minutes} minutes</div>}
            {!todayRecord.is_approved && <div className="text-amber-600 text-sm mt-1">Pending approval</div>}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-ocean-800">Recent Records</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Time In</th><th className="px-4 py-2">Time Out</th><th className="px-4 py-2 text-right">Hours</th><th className="px-4 py-2 text-right">OT</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No attendance records.</td></tr>}
            {records.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2 text-xs">{r.time_in ? new Date(r.time_in).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td className="px-4 py-2 text-xs">{r.time_out ? new Date(r.time_out).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : <span className="text-amber-600">Active</span>}</td>
                <td className="px-4 py-2 text-right">{r.hours_worked || 0}</td>
                <td className="px-4 py-2 text-right">{r.overtime_hours || 0}</td>
                <td className="px-4 py-2">
                  {r.is_approved ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
