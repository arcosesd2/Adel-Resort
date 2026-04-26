'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ArrowLeft, AlertCircle } from 'lucide-react'
import { FadeInUp } from '@/components/motions'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80'

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/content/events/${id}/`)
      .then(({ data }) => setEvent(data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-[50vh] bg-gray-200 rounded-2xl mb-6" />
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center py-20">
          <AlertCircle size={56} className="mx-auto text-gray-300 mb-4" />
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-3">Event not found</h1>
          <p className="text-gray-500 mb-6">This event may have been removed or is no longer available.</p>
          <Link href="/events" className="btn-primary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const src = event.image_url || event.image || PLACEHOLDER
  const isCloud = src.includes('res.cloudinary.com')

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-ocean-600 hover:text-ocean-700 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Events
        </Link>

        <FadeInUp>
          <div className="relative w-full h-[40vh] md:h-[55vh] rounded-2xl overflow-hidden mb-8 shadow-lg">
            <Image
              src={cloudinaryUrl(src, { width: 1600 })}
              alt={event.title}
              fill
              unoptimized={isCloud}
              priority
              className="object-cover"
            />
          </div>

          <div className="flex items-center gap-2 text-ocean-600 text-sm font-medium mb-3">
            <Calendar size={16} />
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-gray-900 mb-6">
            {event.title}
          </h1>

          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </div>
        </FadeInUp>
      </div>
    </div>
  )
}
