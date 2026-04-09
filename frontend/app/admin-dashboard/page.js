'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, Users, UserCheck, DollarSign, ShoppingCart, Clock, CreditCard, MessageCircle, Send, CheckCircle, ChevronDown, ChevronRight, Activity, Shield, Fingerprint, ScrollText, Smartphone, Film, Settings, Star, ImageIcon, ClipboardList, Newspaper, Calendar, Percent, BedDouble, FileDown, Mail, CalendarCheck, CreditCard as PayIcon, Tag, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import SlotPicker from '@/components/SlotPicker'
import dynamic from 'next/dynamic'
import RoomOccupancySection from '@/components/admin/RoomOccupancySection'
import UniqueVisitorsSection from '@/components/admin/UniqueVisitorsSection'

const RevenueAnalyticsSection = dynamic(
  () => import('@/components/admin/RevenueAnalyticsSection'),
  { ssr: false }
)

const statCards = [
  { key: 'total_page_views', label: 'Total Page Views', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', superadminOnly: true },
  { key: 'unique_visitors', label: 'Unique Visitors', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', superadminOnly: true },
  { key: 'net_income', label: 'Net Income', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', isCurrency: true },
  { key: 'total_sales', label: 'Total Sales', icon: ShoppingCart, color: 'text-ocean-600', bg: 'bg-ocean-50' },
  { key: 'pending_sales', label: 'Pending Sales', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'pending_payments', label: 'Pending Payments', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'unique_guests_count', label: 'Unique Guests', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', superadminOnly: true },
  { key: 'active_visitors_count', label: 'Active Visitors (90d)', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', superadminOnly: true },
]

function AdminDashboardContent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  // Use selectors so this component doesn't re-render on unrelated store updates
  // (InactivityGuard touches `lastActivity` on every mousemove/keydown/scroll/
  // touchstart, which would otherwise churn this page constantly).
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isReady = useAuthStore((s) => s.isReady)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Page views collapse state
  const [pageViewsOpen, setPageViewsOpen] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState({})

  // Unique guests collapse state
  const [guestsOpen, setGuestsOpen] = useState(false)
  const [expandedGuests, setExpandedGuests] = useState({})

  // Chat state
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [convoMessages, setConvoMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const chatEndRef = useRef(null)
  const pollRef = useRef(null)
  useEffect(() => {
    // Wait for AuthValidator to finish bootstrapping before making any
    // navigation decisions. Acting on partial auth state is what caused the
    // original /admin-dashboard ↔ /dashboard redirect loop.
    if (!isReady) return

    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/admin-dashboard')
      return
    }

    if (!user?.is_staff) {
      router.replace('/dashboard')
      return
    }

    // All staff can now fetch analytics (backend filters superadmin-only data).
    // Crucially: we NEVER redirect on analytics failure — doing so
    // previously caused an infinite loop with /dashboard.
    api.get('/analytics/dashboard/')
      .then((res) => {
        const d = res.data
        d.active_visitors_count = (d.unique_visitors_list || []).length
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setData({})
        setLoading(false)
      })

    fetchConversations()
  }, [isReady, isAuthenticated, user, router])

  // Poll for new messages in active conversation
  useEffect(() => {
    if (!activeConvo) return
    const poll = () => {
      const lastMsg = convoMessages[convoMessages.length - 1]
      const since = lastMsg ? lastMsg.created_at : ''
      api.get(`/chat/conversations/${activeConvo.id}/poll/?since=${encodeURIComponent(since)}`)
        .then(({ data }) => {
          if (data.length > 0) {
            setConvoMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const newMsgs = data.filter(m => !existingIds.has(m.id))
              return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
            })
          }
        })
        .catch(() => {})
    }
    pollRef.current = setInterval(poll, 5000)
    return () => clearInterval(pollRef.current)
  }, [activeConvo, convoMessages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convoMessages])

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/admin/conversations/')
      setConversations(data)
    } catch {}
  }

  const openConversation = async (convo) => {
    setActiveConvo(convo)
    try {
      const { data } = await api.get(`/chat/conversations/${convo.id}/`)
      setConvoMessages(data.messages)
    } catch { toast.error('Failed to load conversation.') }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConvo) return
    setSendingReply(true)
    try {
      const { data } = await api.post(`/chat/conversations/${activeConvo.id}/send/`, { content: replyText.trim() })
      setConvoMessages(prev => [...prev, data])
      setReplyText('')
      fetchConversations()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send message.')
    } finally {
      setSendingReply(false)
    }
  }

  const handleResolve = async () => {
    if (!activeConvo) return
    try {
      await api.patch(`/chat/admin/conversations/${activeConvo.id}/resolve/`)
      setActiveConvo(prev => ({ ...prev, status: 'resolved' }))
      fetchConversations()
      toast.success('Conversation resolved.')
    } catch { toast.error('Failed to resolve.') }
  }

  const togglePathExpand = (path) => {
    setExpandedPaths(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const toggleGuestExpand = (userId) => {
    setExpandedGuests(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full mb-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-8">Admin Dashboard</h1>

      {/* Dashboard Tabs — staff-accessible */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {/* Superadmin-only tabs */}
        {user?.is_superadmin && (
          <>
            <Link href="/admin-dashboard/users" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Shield size={16} /> Users
            </Link>
            <Link href="/admin-dashboard/login-activity" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <ScrollText size={16} /> Login Activity
            </Link>
            <Link href="/admin-dashboard/devices" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Fingerprint size={16} /> Devices
            </Link>
            <Link href="/admin-dashboard/gcash" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Smartphone size={16} /> GCash Settings
            </Link>
            <Link href="/admin-dashboard/settings" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Settings size={16} /> Site Settings
            </Link>
            <Link href="/admin-dashboard/reviews" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <Star size={16} /> Reviews
            </Link>
            <Link href="/admin-dashboard/manage-rooms" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <BedDouble size={16} /> Manage Rooms
            </Link>
            <Link href="/admin-dashboard/pricing" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <DollarSign size={16} /> Pricing
            </Link>
            <Link href="/admin-dashboard/activity-log" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
              <ClipboardList size={16} /> Activity Log
            </Link>
          </>
        )}
        {/* Staff-accessible management tabs */}
        <Link href="/admin-dashboard/bookings" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <CalendarCheck size={16} /> Bookings
        </Link>
        <Link href="/admin-dashboard/payments" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <CreditCard size={16} /> Payments
        </Link>
        <Link href="/admin-dashboard/vouchers" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Tag size={16} /> Vouchers
        </Link>
        <Link href="/admin-dashboard/occupancy" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Home size={16} /> Occupancy
        </Link>
        {/* Staff-accessible content tabs */}
        <Link href="/admin-dashboard/hero" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Film size={16} /> Homepage Intro
        </Link>
        <Link href="/admin-dashboard/rooms" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <ImageIcon size={16} /> Room Photos
        </Link>
        <Link href="/admin-dashboard/news" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Newspaper size={16} /> News
        </Link>
        <Link href="/admin-dashboard/events" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Calendar size={16} /> Events
        </Link>
        <Link href="/admin-dashboard/promotions" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Percent size={16} /> Promotions
        </Link>
        <Link href="/admin-dashboard/subscribers" className="btn-outline text-sm px-4 py-2 flex items-center gap-2">
          <Mail size={16} /> Subscribers
        </Link>
        <button
          onClick={async () => {
            try {
              const res = await api.get('/analytics/export/bookings/', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'bookings-export.csv'; a.click()
              URL.revokeObjectURL(url)
            } catch { toast.error('Export failed') }
          }}
          className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
        >
          <FileDown size={16} /> Export Bookings
        </button>
        <button
          onClick={async () => {
            try {
              const res = await api.get('/analytics/export/revenue/', { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              const a = document.createElement('a'); a.href = url; a.download = 'revenue-export.csv'; a.click()
              URL.revokeObjectURL(url)
            } catch { toast.error('Export failed') }
          }}
          className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
        >
          <FileDown size={16} /> Export Revenue
        </button>
      </div>

      {/* Stat Cards — visible to all staff, superadmin-only cards filtered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.filter(c => !c.superadminOnly || user?.is_superadmin).map(({ key, label, icon: Icon, color, bg, isCurrency }) => (
            <div key={key} className="card p-6 flex items-center gap-4">
              <div className={`${bg} p-3 rounded-xl`}>
                <Icon className={`${color} w-6 h-6`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isCurrency
                    ? `₱${Number(data[key] || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    : Number(data[key] || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
      </div>

      {/* Revenue Analytics — superadmin only */}
      {user?.is_superadmin && <RevenueAnalyticsSection data={data} />}

      {/* Chat Conversations */}
      <div className="card overflow-hidden mb-10">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <MessageCircle size={20} /> Chat Conversations
          </h2>
        </div>
        <div className="flex" style={{ minHeight: '400px' }}>
          {/* Conversation List */}
          <div className="w-1/3 border-r border-gray-100 overflow-y-auto" style={{ maxHeight: '500px' }}>
            {conversations.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">No conversations yet</p>
            )}
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeConvo?.id === c.id ? 'bg-ocean-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800 truncate">{c.customer_name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                {c.last_message && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.last_message.content}</p>
                )}
                {c.unread_count > 0 && (
                  <span className="inline-block mt-1 bg-ocean-600 text-white text-xs rounded-full px-2 py-0.5">
                    {c.unread_count} new
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chat Thread */}
          <div className="flex-1 flex flex-col">
            {!activeConvo ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a conversation to view messages
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{activeConvo.customer_name}</p>
                    <p className="text-xs text-gray-500">{activeConvo.subject}</p>
                  </div>
                  {activeConvo.status === 'open' && (
                    <button onClick={handleResolve} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <CheckCircle size={12} /> Resolve
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '350px' }}>
                  {convoMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.is_staff_reply ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 ${msg.is_staff_reply ? 'bg-ocean-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.is_staff_reply ? 'text-ocean-200' : 'text-gray-400'}`}>
                          {msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {activeConvo.status === 'open' && (
                  <div className="p-3 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                      placeholder="Type a reply..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    />
                    <button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}
                      className="btn-primary px-3 py-2 disabled:opacity-50">
                      <Send size={16} />
                    </button>
                  </div>
                )}
                {activeConvo.status === 'resolved' && (
                  <div className="p-3 border-t border-gray-100 text-center text-sm text-gray-400">
                    This conversation has been resolved
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unique Guests — superadmin only */}
      {user?.is_superadmin && <div className="card overflow-hidden mb-10">
        <button
          onClick={() => setGuestsOpen(!guestsOpen)}
          className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <UserCheck size={20} /> Unique Guests
          </h2>
          {guestsOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
        </button>
        {guestsOpen && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.unique_guests || []).map((guest) => {
                  const userId = guest.user__id
                  const isExpanded = expandedGuests[userId]
                  const bookings = isExpanded
                    ? (data.guest_bookings || []).filter(b => b.user__id === userId)
                    : []
                  return (
                    <React.Fragment key={userId}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleGuestExpand(userId)}
                      >
                        <td className="px-6 py-3 text-sm text-gray-700 flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                            : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                          <span className="font-medium">{guest.guest_name?.trim() || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          <div>{guest.username && !guest.username.startsWith('walkin-') ? guest.username : '\u2014'}</div>
                          {guest.phone && <div className="text-xs text-gray-400">{guest.phone}</div>}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">{guest.total_bookings}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">
                          ₱{Number(guest.total_spent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 text-right">
                          {guest.last_booking ? new Date(guest.last_booking).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014'}
                        </td>
                      </tr>
                      {isExpanded && bookings.map((b) => (
                        <tr key={b.id} className="bg-gray-50/60">
                          <td className="px-6 pl-14 py-2 text-xs text-gray-500">
                            #{b.id} — {b.room__name}
                          </td>
                          <td className="px-6 py-2 text-xs text-gray-500">
                            {b.check_in} to {b.check_out}
                          </td>
                          <td className="px-6 py-2 text-xs text-gray-600 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-xs text-gray-600 text-right">
                            ₱{Number(b.total_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-2 text-xs text-gray-400 text-right">
                            {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                      {isExpanded && bookings.length === 0 && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={5} className="px-6 pl-14 py-2 text-xs text-gray-400">No booking details available</td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {(data.unique_guests || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No guest bookings yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Unique Visitors — superadmin only */}
      {user?.is_superadmin && <UniqueVisitorsSection data={data} />}

      {/* Page Views Table — superadmin only */}
      {user?.is_superadmin && <div className="card overflow-hidden">
        <button
          onClick={() => setPageViewsOpen(!pageViewsOpen)}
          className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <Eye size={20} /> Page Views by Path
          </h2>
          {pageViewsOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
        </button>
        {pageViewsOpen && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Page Path</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Viewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.page_views.map((row) => {
                  const isExpanded = expandedPaths[row.page_path]
                  const dailyRows = isExpanded
                    ? (data.daily_page_views || []).filter(d => d.page_path === row.page_path)
                    : []
                  return (
                    <React.Fragment key={row.page_path}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => togglePathExpand(row.page_path)}
                      >
                        <td className="px-6 py-3 text-sm text-gray-700 font-mono flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                            : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                          {row.page_path}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 font-semibold text-right">{row.views.toLocaleString()}</td>
                        <td className="px-6 py-3 text-sm text-gray-500 text-right">
                          {row.last_viewed ? new Date(row.last_viewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014'}
                        </td>
                      </tr>
                      {isExpanded && dailyRows.map((d) => (
                        <tr key={`${row.page_path}-${d.view_date}`} className="bg-gray-50/60">
                          <td className="px-6 pl-14 py-2 text-xs text-gray-500">
                            {new Date(d.view_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-2 text-xs text-gray-600 text-right">{d.views.toLocaleString()}</td>
                          <td className="px-6 py-2"></td>
                        </tr>
                      ))}
                      {isExpanded && dailyRows.length === 0 && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={3} className="px-6 pl-14 py-2 text-xs text-gray-400">No daily data available</td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {data.page_views.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No page views recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>}
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}
