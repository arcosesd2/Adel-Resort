'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'
import EventCard from '@/components/EventCard'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/content/events/')
      .then(({ data }) => setEvents(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const featured = events[0]
  const rest = events.slice(1)

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInUp className="text-center mb-12">
          <p className="text-ocean-600 font-semibold tracking-widest text-sm uppercase mb-3">What's Happening</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Upcoming Events
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Join us for exciting events and activities at Adel Beach Resort.
          </p>
        </FadeInUp>

        {loading ? (
          <>
            <div className="card animate-pulse mb-10 grid md:grid-cols-2 gap-0 overflow-hidden">
              <div className="h-72 md:h-96 bg-gray-200" />
              <div className="p-8 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No upcoming events</h3>
            <p className="text-gray-400">Check back soon for new events and activities!</p>
          </div>
        ) : (
          <>
            {featured && (
              <FadeInUp className="mb-12">
                <Link
                  href={`/events/${featured.id}`}
                  className="card group block overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-ocean-300 transition-all duration-300"
                >
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="relative h-72 md:h-auto md:min-h-[24rem] overflow-hidden">
                      <Image
                        src={cloudinaryUrl(featured.image_url || featured.image || PLACEHOLDER, { width: 1200 })}
                        alt={featured.title}
                        fill
                        unoptimized={!!(featured.image_url || featured.image || '').includes('res.cloudinary.com')}
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        priority
                      />
                      <span className="absolute top-4 left-4 bg-ocean-600 text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full">
                        Featured
                      </span>
                    </div>
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-ocean-600 text-sm font-medium mb-3">
                        <Calendar size={16} />
                        {new Date(featured.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-ocean-700 transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-gray-600 leading-relaxed line-clamp-4 mb-5">
                        {featured.description}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-ocean-600 font-semibold group-hover:gap-3 transition-all">
                        Read more <ArrowRight size={18} />
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeInUp>
            )}

            {rest.length > 0 && (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventCard event={event} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </>
        )}
      </div>
    </div>
  )
}
