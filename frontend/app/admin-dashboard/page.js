'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Users, DollarSign, ShoppingCart, Clock, CreditCard, Tag, Plus, Trash2, ToggleLeft, ToggleRight, MessageCircle, Send, CheckCircle, ChevronDown, ChevronRight, CalendarPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import SlotPicker from '@/components/SlotPicker'

const statCards = [
  { key: 'total_page_views', label: 'Total Page Views', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'unique_visitors', label: 'Unique Visitors', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'net_income', label: 'Net Income', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', isCurrency: true },
  { key: 'total_sales', label: 'Total Sales', icon: ShoppingCart, color: 'text-ocean-600', bg: 'bg-ocean-50' },
  { key: 'pending_sales', label: 'Pending Sales', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'pending_payments', label: 'Pending Payments', icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
]

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const router = useRouter()

  // Voucher state
  const [vouchers, setVouchers] = useState([])
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [voucherForm, setVoucherForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '',
    valid_from: '', valid_until: '', max_uses: '', min_booking_amount: '',
  })
  const [creatingVoucher, setCreatingVoucher] = useState(false)

  // Onsite booking state
  const [rooms, setRooms] = useState([])
  const [showOnsiteForm, setShowOnsiteForm] = useState(false)
  const [onsiteForm, setOnsiteForm] = useState({
    guest_name: '', guest_email: '', guest_phone: '',
    room: '', guests: 1, slots: [], special_requests: '',
  })
  const [creatingOnsite, setCreatingOnsite] = useState(false)
  const [onsiteVoucherCode, setOnsiteVoucherCode] = useState('')

  // Page views collapse state
  const [pageViewsOpen, setPageViewsOpen] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState({})

  // Chat state
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [convoMessages, setConvoMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const chatEndRef = useRef(null)
  const pollRef = useRef(null)

  const selectedRoom = useMemo(() => {
    if (!onsiteForm.room) return null
    return rooms.find(r => r.id == onsiteForm.room) || null
  }, [onsiteForm.room, rooms])

  // Voucher preview for onsite booking
  const onsiteVoucherPreview = useMemo(() => {
    if (!onsiteVoucherCode.trim() || vouchers.length === 0) return null
    const v = vouchers.find(v => v.code.toLowerCase() === onsiteVoucherCode.trim().toLowerCase())
    if (!v) return { error: 'Voucher not found' }
    if (!v.is_active) return { error: 'Voucher is inactive' }
    const now = new Date()
    if (now < new Date(v.valid_from) || now > new Date(v.valid_until)) return { error: 'Voucher expired' }
    if (v.max_uses && v.times_used >= v.max_uses) return { error: 'Voucher fully used' }
    return {
      valid: true,
      label: v.discount_type === 'percentage' ? `${v.discount_value}% off` : `₱${v.discount_value} off`,
    }
  }, [onsiteVoucherCode, vouchers])

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace('/dashboard')
      return
    }
    if (!user) return

    api.get('/analytics/dashboard/')
      .then((res) => setData(res.data))
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false))

    fetchVouchers()
    fetchConversations()
    fetchRooms()
  }, [user, router])

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

  const fetchVouchers = async () => {
    try {
      const { data } = await api.get('/vouchers/')
      setVouchers(data)
    } catch {}
  }

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/admin/conversations/')
      setConversations(data)
    } catch {}
  }

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms/')
      setRooms(data.results || data)
    } catch {}
  }

  const handleCreateOnsiteBooking = async (e) => {
    e.preventDefault()
    if (onsiteForm.slots.length === 0) { toast.error('Add at least one slot.'); return }
    setCreatingOnsite(true)
    try {
      const payload = {
        guest_name: onsiteForm.guest_name,
        guest_email: onsiteForm.guest_email || undefined,
        guest_phone: onsiteForm.guest_phone || undefined,
        room: parseInt(onsiteForm.room),
        guests: parseInt(onsiteForm.guests),
        slots: onsiteForm.slots,
        special_requests: onsiteForm.special_requests,
      }
      if (onsiteVoucherCode.trim()) {
        payload.voucher_code = onsiteVoucherCode.trim()
      }
      const { data } = await api.post('/bookings/onsite/', payload)
      let msg = `Onsite booking created! #${data.id} - ${data.room} - ₱${data.total_price}`
      if (data.discount) {
        msg += ` (₱${data.discount} discount with ${data.voucher_code})`
      }
      toast.success(msg)
      setOnsiteForm({ guest_name: '', guest_email: '', guest_phone: '', room: '', guests: 1, slots: [], special_requests: '' })
      setOnsiteVoucherCode('')
      setShowOnsiteForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create booking.')
    } finally {
      setCreatingOnsite(false)
    }
  }

  const handleCreateVoucher = async (e) => {
    e.preventDefault()
    setCreatingVoucher(true)
    try {
      const payload = {
        code: voucherForm.code,
        discount_type: voucherForm.discount_type,
        discount_value: voucherForm.discount_value,
        valid_from: new Date(voucherForm.valid_from).toISOString(),
        valid_until: new Date(voucherForm.valid_until).toISOString(),
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map(({ key, label, icon: Icon, color, bg, isCurrency }) => (
          <div key={key} className="card p-6 flex items-center gap-4">
            <div className={`${bg} p-3 rounded-xl`}>
              <Icon className={`${color} w-6 h-6`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isCurrency
                  ? `₱${Number(data[key]).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                  : Number(data[key]).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Onsite Booking */}
      <div className="card overflow-hidden mb-10">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <CalendarPlus size={20} /> Onsite Booking
          </h2>
          <button
            onClick={() => setShowOnsiteForm(!showOnsiteForm)}
            className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={14} /> Walk-in Booking
          </button>
        </div>

        {showOnsiteForm && (
          <form onSubmit={handleCreateOnsiteBooking} className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                <input type="text" required value={onsiteForm.guest_name}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_name: e.target.value }))}
                  className="input-field" placeholder="e.g. Juan Dela Cruz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input type="email" value={onsiteForm.guest_email}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_email: e.target.value }))}
                  className="input-field" placeholder="guest@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="text" value={onsiteForm.guest_phone}
                  onChange={e => setOnsiteForm(f => ({ ...f, guest_phone: e.target.value }))}
                  className="input-field" placeholder="09XX XXX XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                <select required value={onsiteForm.room}
                  onChange={e => setOnsiteForm(f => ({ ...f, room: e.target.value, slots: [] }))}
                  className="input-field">
                  <option value="">Select a room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (max {r.capacity} pax)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                <input type="number" min="1" required value={onsiteForm.guests}
                  onChange={e => setOnsiteForm(f => ({ ...f, guests: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <input type="text" value={onsiteForm.special_requests}
                  onChange={e => setOnsiteForm(f => ({ ...f, special_requests: e.target.value }))}
                  className="input-field" placeholder="Optional notes" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Code (optional)</label>
                <input type="text" value={onsiteVoucherCode}
                  onChange={e => setOnsiteVoucherCode(e.target.value)}
                  className="input-field" placeholder="e.g. SUMMER20" />
                {onsiteVoucherPreview && (
                  <p className={`text-xs mt-1 ${onsiteVoucherPreview.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {onsiteVoucherPreview.valid ? onsiteVoucherPreview.label : onsiteVoucherPreview.error}
                  </p>
                )}
              </div>
            </div>

            {/* SlotPicker calendar */}
            {selectedRoom && (
              <div className="mt-4">
                <SlotPicker
                  key={selectedRoom.id}
                  roomId={selectedRoom.id}
                  isDayOnly={selectedRoom.is_day_only}
                  onSlotsChange={(slots) => setOnsiteForm(f => ({ ...f, slots }))}
                />
              </div>
            )}

            {!selectedRoom && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-500 text-center">
                Select a room to see the availability calendar
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={creatingOnsite} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {creatingOnsite ? 'Creating...' : 'Create Booking'}
              </button>
              <button type="button" onClick={() => setShowOnsiteForm(false)} className="btn-outline text-sm px-4 py-2">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Voucher Management */}
      <div className="card overflow-hidden mb-10">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-800 flex items-center gap-2">
            <Tag size={20} /> Voucher Management
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
                <input type="text" required value={voucherForm.code} onChange={e => setVoucherForm(f => ({ ...f, code: e.target.value }))}
                  className="input-field" placeholder="e.g. SUMMER20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select value={voucherForm.discount_type} onChange={e => setVoucherForm(f => ({ ...f, discount_type: e.target.value }))}
                  className="input-field">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₱)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input type="number" required step="0.01" min="0" value={voucherForm.discount_value}
                  onChange={e => setVoucherForm(f => ({ ...f, discount_value: e.target.value }))} className="input-field" placeholder="e.g. 20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                <input type="datetime-local" required value={voucherForm.valid_from}
                  onChange={e => setVoucherForm(f => ({ ...f, valid_from: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input type="datetime-local" required value={voucherForm.valid_until}
                  onChange={e => setVoucherForm(f => ({ ...f, valid_until: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (blank = unlimited)</label>
                <input type="number" min="1" value={voucherForm.max_uses}
                  onChange={e => setVoucherForm(f => ({ ...f, max_uses: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking Amount (optional)</label>
                <input type="number" step="0.01" min="0" value={voucherForm.min_booking_amount}
                  onChange={e => setVoucherForm(f => ({ ...f, min_booking_amount: e.target.value }))} className="input-field" />
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

      {/* Page Views Table — collapsible, at bottom, with daily breakdown */}
      <div className="card overflow-hidden">
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
      </div>
    </div>
  )
}
