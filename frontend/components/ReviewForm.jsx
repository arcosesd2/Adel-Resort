'use client'

import { useState } from 'react'
import { Star, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function ReviewForm({ bookingId, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    if (!comment.trim()) {
      toast.error('Please write a comment')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/reviews/create/', {
        booking_id: bookingId,
        rating,
        comment: comment.trim(),
      })
      toast.success('Review submitted! Thank you.')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                size={28}
                className={
                  star <= (hoveredRating || rating)
                    ? 'text-sand-400 fill-sand-400'
                    : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Share your experience..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary py-2 px-6 text-sm inline-flex items-center gap-2"
      >
        <Send size={14} />
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
