'use client'

import { useState, useEffect } from 'react'
import { Star, Loader2, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import Link from 'next/link'

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reviews/mine/')
      .then(res => setReviews(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-ocean-500" size={32} />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-1">No reviews yet</h3>
        <p className="text-sm text-gray-400 mb-4">After completing a stay, you can leave a review from your bookings.</p>
        <Link href="/dashboard" className="btn-primary py-2.5 px-6 text-sm inline-block">
          View Bookings
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ocean-800">My Reviews ({reviews.length})</h2>
      {reviews.map((review, i) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link href={`/rooms/${review.room}`} className="font-semibold text-ocean-700 hover:underline">
                  {review.room_name || `Room #${review.room}`}
                </Link>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  review.is_approved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {review.is_approved ? 'Published' : 'Pending Approval'}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                  />
                ))}
                <span className="text-sm text-gray-500 ml-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{review.comment}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
