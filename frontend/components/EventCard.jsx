'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

export default function EventCard({ event }) {
 const src = event.image_url || event.image || PLACEHOLDER
 const isCloud = src.includes('res.cloudinary.com')

 return (
 <Link
 href={`/events/${event.id}`}
 className="card group block overflow-hidden border border-gray-100 hover:border-ocean-300 hover:shadow-xl transition-all duration-300"
 >
 <div className="relative h-52 overflow-hidden">
 <Image
 src={cloudinaryUrl(src, { width: 600 })}
 alt={event.title}
 fill
 unoptimized={isCloud}
 className="object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 <div className="p-5">
 <div className="flex items-center gap-2 text-ocean-600 text-sm font-medium mb-2">
 <Calendar size={14} />
 {new Date(event.date).toLocaleDateString('en-US', {
 weekday: 'long',
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 })}
 </div>
 <h3 className="font-serif text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-ocean-700 transition-colors">
 {event.title}
 </h3>
 <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-3">
 {event.description}
 </p>
 <span className="inline-flex items-center gap-1 text-ocean-600 text-sm font-medium group-hover:gap-2 transition-all">
 Read more <ArrowRight size={14} />
 </span>
 </div>
 </Link>
 )
}
