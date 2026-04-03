'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import api from '@/lib/api'
import ReviewCard from '@/components/ReviewCard'
import { StaggerContainer, StaggerItem } from '@/components/motions'

export default function RoomReviews({ roomId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/reviews/room/${roomId}/`)
      .then(({ data }) => setReviews(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [roomId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) return null

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Guest Reviews</h2>
        <div className="flex items-center gap-1 bg-ocean-50 px-3 py-1 rounded-full">
          <Star size={14} className="text-sand-400 fill-sand-400" />
          <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
          <span className="text-xs text-gray-500">({reviews.length})</span>
        </div>
      </div>
      <StaggerContainer className="space-y-3">
        {reviews.map((review) => (
          <StaggerItem key={review.id}>
            <ReviewCard review={review} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}
