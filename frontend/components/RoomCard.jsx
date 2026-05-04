'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Maximize, Heart } from 'lucide-react'
import ImageLightbox from '@/components/ImageLightbox'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'

const typeColors = {
 cottage: 'bg-blue-100 text-blue-700',
 dos_andanas: 'bg-purple-100 text-purple-700',
 lavender_house: 'bg-fuchsia-100 text-fuchsia-700',
 ac_karaoke: 'bg-pink-100 text-pink-700',
 kubo: 'bg-amber-100 text-amber-700',
 function_hall: 'bg-emerald-100 text-emerald-700',
 trapal_table: 'bg-lime-100 text-lime-700',
}

export default function RoomCard({ room, initialFavorited = false }) {
 const [lightboxOpen, setLightboxOpen] = useState(false)
 const [favorited, setFavorited] = useState(initialFavorited)
 const [amenitiesExpanded, setAmenitiesExpanded] = useState(false)
 const { isAuthenticated, user } = useAuthStore()
 const { id, name, room_type, room_type_display, day_price, night_price, is_day_only, booking_mode, capacity, size_sqm, primary_image, images, amenities } = room
 const isOvernight = booking_mode === 'overnight' || booking_mode === '24hr'
 const is24hr = booking_mode === '24hr'

 const toggleFavorite = async (e) => {
 e.preventDefault()
 e.stopPropagation()
 try {
 const { data } = await api.post('/auth/favorites/toggle/', { room_id: id })
 setFavorited(data.favorited)
 } catch {}
 }

 return (
 <>
 <div className="card group hover:shadow-xl transition-shadow duration-300">
 <div
 className="relative h-56 overflow-hidden cursor-pointer"
 onClick={() => setLightboxOpen(true)}
 >
 <Image
 src={cloudinaryUrl(primary_image || PLACEHOLDER, { width: 600 })}
 alt={name}
 fill
 unoptimized={!!primary_image?.includes('res.cloudinary.com')}
 className="object-cover group-hover:scale-105 transition-transform duration-500"
 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 />
 {/* Cinematic gradient overlay on hover */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
 <div className="absolute top-3 left-3">
 <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeColors[room_type] || 'bg-gray-100 text-gray-700'}`}>
 {room_type_display}
 </span>
 </div>
 <div className="absolute top-3 right-3 flex items-center gap-2">
 {is_day_only && !isOvernight && (
 <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
 Day Only
 </span>
 )}
 {isAuthenticated && !user?.is_staff && (
 <button
 onClick={toggleFavorite}
 className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
 >
 <Heart
 size={16}
 className={favorited ? 'text-red-500 fill-red-500' : 'text-gray-400'}
 />
 </button>
 )}
 </div>
 </div>

 <div className="p-5">
 <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">{name}</h3>

 <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
 <span className="flex items-center gap-1">
 <Users size={15} />
 Up to {capacity} persons
 </span>
 {size_sqm && (
 <span className="flex items-center gap-1">
 <Maximize size={15} />
 {size_sqm} m²
 </span>
 )}
 </div>

 {amenities?.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-4 min-h-[26px]">
 {(amenitiesExpanded ? amenities : amenities.slice(0, 4)).map((a) => (
 <span key={a} className="text-xs bg-white/50 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded-full">
 {a}
 </span>
 ))}
 {amenities.length > 4 && !amenitiesExpanded && (
 <button
 onClick={() => setAmenitiesExpanded(true)}
 className="text-xs text-ocean-600 hover:text-ocean-800 hover:underline cursor-pointer"
 >
 +{amenities.length - 4} more
 </button>
 )}
 {amenitiesExpanded && amenities.length > 4 && (
 <button
 onClick={() => setAmenitiesExpanded(false)}
 className="text-xs text-ocean-600 hover:text-ocean-800 hover:underline cursor-pointer"
 >
 Show less
 </button>
 )}
 </div>
 )}

 <div className="flex items-center justify-between pt-3 border-t border-white/20">
 <div>
 <span className="inline-block bg-ocean-500/10 backdrop-blur-sm rounded-full px-3 py-1 text-2xl font-bold text-ocean-700">₱{day_price}</span>
 {!isOvernight && !is_day_only && night_price && (
 <span className="text-gray-400 text-sm"> / ₱{night_price}</span>
 )}
 <div className="text-gray-400 text-xs mt-1">
 {is24hr ? 'per 24 hours' : isOvernight ? 'per night' : is_day_only ? 'day tour' : 'day / night'}
 </div>
 </div>
 <Link
 href={`/rooms/${id}`}
 className="btn-primary py-2 px-5 text-sm"
 >
 Book Now
 </Link>
 </div>
 </div>
 </div>

 <ImageLightbox
 images={images || []}
 primaryImage={primary_image}
 roomName={name}
 isOpen={lightboxOpen}
 onClose={() => setLightboxOpen(false)}
 />
 </>
 )
}
