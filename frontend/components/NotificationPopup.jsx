'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X } from 'lucide-react'
import useNotificationStore from '@/store/notificationStore'

const typeIcons = {
  booking_confirmed: '✅',
  payment_received: '💳',
  booking_cancelled: '❌',
  booking_completed: '🎉',
  review_approved: '⭐',
  system: '📢',
  pending_payment_review: '💰',
  new_booking: '📅',
  new_review_pending: '📝',
  new_message: '💬',
}

export default function NotificationPopup() {
  const { latestNotification } = useNotificationStore()
  const visible = !!latestNotification

  useEffect(() => {
    if (!latestNotification) return
    const timer = setTimeout(() => {
      useNotificationStore.setState({ latestNotification: null })
    }, 6000)
    return () => clearTimeout(timer)
  }, [latestNotification])

  const dismiss = () => {
    useNotificationStore.setState({ latestNotification: null })
  }

  return (
    <AnimatePresence>
      {visible && latestNotification && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full pointer-events-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <span className="text-2xl mt-0.5">
                {typeIcons[latestNotification.notification_type] || '📢'}
              </span>
              <div className="flex-1 min-w-0">
                {latestNotification.link ? (
                  <Link
                    href={latestNotification.link}
                    onClick={dismiss}
                    className="font-semibold text-gray-900 hover:text-ocean-600 text-sm line-clamp-1"
                  >
                    {latestNotification.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                    {latestNotification.title}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {latestNotification.message}
                </p>
              </div>
              <button
                onClick={dismiss}
                className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-1 bg-ocean-500 animate-[shrink_6s_linear_forwards]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
