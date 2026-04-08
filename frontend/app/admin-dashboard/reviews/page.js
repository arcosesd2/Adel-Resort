'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Eye, EyeOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'

export default function AdminReviewsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (!user.is_superadmin) {
      router.push('/admin-dashboard')
      return
    }
    fetchReviews()
  }, [user])

  const fetchReviews = async () => {
    try {
      const { data } = await api.get('/reviews/admin/')
      setReviews(data)
    } catch {
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const toggleApproval = async (id) => {
    try {
      const { data } = await api.patch(`/reviews/${id}/toggle-approval/`)
      setReviews(prev => prev.map(r => r.id === id ? data : r))
      toast.success(data.is_approved ? 'Review approved' : 'Review hidden')
    } catch {
      toast.error('Failed to update review')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/admin-dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <FadeInUp className="flex items-center gap-3 mb-8">
          <Star className="text-ocean-600" size={28} />
          <div>
            <h1 className="font-serif text-3xl font-bold text-gray-900">Guest Reviews</h1>
            <p className="text-gray-500 text-sm">{reviews.length} total reviews</p>
          </div>
        </FadeInUp>

        {reviews.length === 0 ? (
          <div className="text-center py-20">
            <Star size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">No reviews yet</h3>
          </div>
        ) : (
          <StaggerContainer className="space-y-4">
            {reviews.map((review) => (
              <StaggerItem key={review.id}>
                <div className={`card p-5 ${!review.is_approved ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{review.user_name}</p>
                      <p className="text-xs text-gray-500">
                        Room: {review.room} &middot; Booking #{review.booking} &middot; {format(parseISO(review.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleApproval(review.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                        review.is_approved
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {review.is_approved ? <Eye size={12} /> : <EyeOff size={12} />}
                      {review.is_approved ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? 'text-sand-400 fill-sand-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm">{review.comment}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
