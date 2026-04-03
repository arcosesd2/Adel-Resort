'use client'

import { Star } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function ReviewCard({ review }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < review.rating ? 'text-sand-400 fill-sand-400' : 'text-gray-300'}
          />
        ))}
        <span className="text-xs text-gray-400 ml-2">
          {format(parseISO(review.created_at), 'MMM d, yyyy')}
        </span>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.comment}</p>
      <p className="text-sm font-semibold text-gray-900">{review.user_name}</p>
    </div>
  )
}
