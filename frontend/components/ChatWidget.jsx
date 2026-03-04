'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, ArrowLeft, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [starting, setStarting] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const chatEndRef = useRef(null)
  const pollRef = useRef(null)

  const shouldShow = isAuthenticated && user && !user.is_staff

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations/')
      setConversations(data)
      const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0)
      setUnreadTotal(total)
    } catch {}
  }, [])

  useEffect(() => {
    if (open && shouldShow) {
      fetchConversations()
    }
  }, [open, shouldShow, fetchConversations])

  // Poll for new messages in active conversation
  useEffect(() => {
    if (!activeConvo) return
    const poll = () => {
      const lastMsg = messages[messages.length - 1]
      const since = lastMsg ? lastMsg.created_at : ''
      api.get(`/chat/conversations/${activeConvo.id}/poll/?since=${encodeURIComponent(since)}`)
        .then(({ data }) => {
          if (data.length > 0) {
            setMessages(prev => {
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
  }, [activeConvo, messages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!shouldShow) return null

  const openConversation = async (convo) => {
    setActiveConvo(convo)
    setShowNewForm(false)
    try {
      const { data } = await api.get(`/chat/conversations/${convo.id}/`)
      setMessages(data.messages)
      fetchConversations()
    } catch { toast.error('Failed to load conversation.') }
  }

  const handleSend = async () => {
    if (!input.trim() || !activeConvo) return
    setSending(true)
    try {
      const { data } = await api.post(`/chat/conversations/${activeConvo.id}/send/`, { content: input.trim() })
      setMessages(prev => [...prev, data])
      setInput('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleStartConversation = async (e) => {
    e.preventDefault()
    if (!newSubject.trim() || !newMessage.trim()) return
    setStarting(true)
    try {
      const { data } = await api.post('/chat/conversations/start/', {
        subject: newSubject.trim(),
        message: newMessage.trim(),
      })
      setShowNewForm(false)
      setNewSubject('')
      setNewMessage('')
      setActiveConvo(data)
      setMessages(data.messages)
      fetchConversations()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start conversation.')
    } finally {
      setStarting(false)
    }
  }

  const goBack = () => {
    setActiveConvo(null)
    setMessages([])
    setShowNewForm(false)
    fetchConversations()
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-ocean-600 hover:bg-ocean-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle size={24} />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadTotal}
            </span>
          )}
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-ocean-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(activeConvo || showNewForm) && (
                <button onClick={goBack} className="hover:bg-ocean-700 rounded p-1">
                  <ArrowLeft size={16} />
                </button>
              )}
              <h3 className="font-semibold text-sm">
                {activeConvo ? activeConvo.subject : showNewForm ? 'New Conversation' : 'Messages'}
              </h3>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-ocean-700 rounded p-1">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!activeConvo && !showNewForm && (
              <>
                {/* Conversation list */}
                <div className="p-2">
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="w-full text-left px-3 py-2 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <Plus size={14} /> New Conversation
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 && (
                    <p className="text-center text-gray-400 text-sm mt-8">No conversations yet</p>
                  )}
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800 truncate">{c.subject}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.status}
                        </span>
                      </div>
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
              </>
            )}

            {showNewForm && (
              <form onSubmit={handleStartConversation} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                  <input type="text" required value={newSubject} onChange={e => setNewSubject(e.target.value)}
                    placeholder="e.g. Question about booking" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                  <textarea required value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3}
                    placeholder="Type your message..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent resize-none" />
                </div>
                <button type="submit" disabled={starting} className="btn-primary w-full text-sm py-2 disabled:opacity-50">
                  {starting ? 'Starting...' : 'Start Conversation'}
                </button>
              </form>
            )}

            {activeConvo && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.is_staff_reply ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.is_staff_reply ? 'bg-gray-100 text-gray-800' : 'bg-ocean-600 text-white'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-0.5 ${msg.is_staff_reply ? 'text-gray-400' : 'text-ocean-200'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {activeConvo.status === 'open' ? (
                  <div className="p-2 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                    />
                    <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary px-3 py-2 disabled:opacity-50">
                      <Send size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-t border-gray-100 text-center text-xs text-gray-400">
                    This conversation has been resolved
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
