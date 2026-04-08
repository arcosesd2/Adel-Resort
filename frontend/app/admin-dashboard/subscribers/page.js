'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Mail, CheckCircle, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function AdminSubscribersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) { router.push('/admin-dashboard'); return }
    fetchSubscribers()
  }, [user])

  const fetchSubscribers = async () => {
    try {
      const { data } = await api.get('/content/admin/subscribers/')
      setSubscribers(data)
    } catch {
      toast.error('Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (sub) => {
    if (!confirm(`Remove ${sub.email} from the subscriber list?`)) return
    try {
      await api.delete(`/content/admin/subscribers/${sub.id}/`)
      setSubscribers(prev => prev.filter(s => s.id !== sub.id))
      toast.success('Subscriber removed')
    } catch {
      toast.error('Failed to remove subscriber')
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Email', 'Active', 'Created'],
      ...subscribers.map(s => [s.email, s.is_active ? 'yes' : 'no', s.created_at]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="spinner" /></div>

  const activeCount = subscribers.filter(s => s.is_active).length

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin-dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Newsletter Subscribers</h1>
          </div>
          {subscribers.length > 0 && (
            <button onClick={exportCsv} className="btn-secondary text-sm">Export CSV</button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ocean-50 flex items-center justify-center text-ocean-600"><Mail size={18} /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{subscribers.length}</div>
              <div className="text-xs text-gray-500">Total subscribers</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600"><CheckCircle size={18} /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={18} /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{subscribers.length - activeCount}</div>
              <div className="text-xs text-gray-500">Unsubscribed</div>
            </div>
          </div>
        </div>

        {subscribers.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <Mail className="mx-auto text-gray-300 mb-3" size={48} />
            <p>No subscribers yet.</p>
            <p className="text-sm mt-1">Visitors can sign up via the footer newsletter form.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{sub.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {sub.is_active ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{format(parseISO(sub.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(sub)} className="p-1 text-gray-400 hover:text-red-600" title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
