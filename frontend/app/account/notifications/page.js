'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import useNotificationStore from '@/store/notificationStore'

const typeIcons = {
  booking_confirmed: '✅',
  payment_received: '💳',
  booking_cancelled: '❌',
  booking_completed: '🎉',
  review_approved: '⭐',
  system: '📢',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { decrementUnread, resetUnread } = useNotificationStore()

  useEffect(() => {
    api.get('/auth/notifications/?limit=100')
      .then(res => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.patch(`/auth/notifications/${id}/read/`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      decrementUnread()
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/auth/notifications/read-all/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      resetUnread()
      toast.success('All marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const deleteNotification = async (id) => {
    try {
      const notif = notifications.find(n => n.id === id)
      await api.delete(`/auth/notifications/${id}/delete/`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif && !notif.is_read) decrementUnread()
      toast.success('Notification deleted')
    } catch {
      toast.error('Failed to delete notification')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-ocean-500" size={32} />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Bell className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-1">No notifications</h3>
        <p className="text-sm text-gray-400">You&apos;ll see updates about your bookings and payments here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ocean-800">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({unreadCount} unread)</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-ocean-600 hover:text-ocean-700 font-medium flex items-center gap-1"
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card p-4 flex items-start gap-3 transition-colors ${
                !notif.is_read ? 'border-l-4 border-ocean-500 bg-ocean-50/50' : ''
              }`}
            >
              <span className="text-xl mt-0.5">{typeIcons[notif.notification_type] || '📢'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {notif.link ? (
                      <Link href={notif.link} className="font-medium text-gray-800 hover:text-ocean-600">
                        {notif.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-800">{notif.title}</span>
                    )}
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="text-ocean-500 hover:text-ocean-600 p-1"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
