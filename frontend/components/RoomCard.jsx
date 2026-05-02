'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Maximize, Heart, ArrowUpRight } from 'lucide-react'
import ImageLightbox from '@/components/ImageLightbox'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'

const typeMeta = {
  cottage: 'Cottage',
  dos_andanas: 'Dos Andanas',
  lavender_house: 'Lavender House',
  ac_karaoke: 'AC Room',
  kubo: 'Kubo',
  function_hall: 'Function Hall',
  trapal_table: 'Trapal Table',
}

export default function RoomCard({ room, initialFavorited = false, isMostLoved = false }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const {
    id, name, room_type, room_type_display, day_price, night_price, is_day_only,
    booking_mode, capacity, size_sqm, primary_image, images, amenities,
  } = room
  const isOvernight = booking_mode === 'overnight' || booking_mode === '24hr'
  const is24hr = booking_mode === '24hr'
  const typeLabel = room_type_display || typeMeta[room_type] || ''

  const galleryImages = images?.length ? images : (primary_image ? [primary_image] : [])
  const previewStack = galleryImages.slice(1, 4)

  const toggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const { data } = await api.post('/auth/favorites/toggle/', { room_id: id })
      setFavorited(data.favorited)
    } catch {}
  }

  const priceLabel = is24hr ? 'per 24 hours' : isOvernight ? 'per night' : is_day_only ? 'day tour' : 'per day'

  return (
    <>
      <article className="group relative flex flex-col bg-white dark:bg-navy-900 border border-ivory-300 dark:border-navy-700 rounded-xl overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-all duration-300 hover:-translate-y-0.5">
        <div
          className="relative h-64 overflow-hidden cursor-pointer bg-ivory-200 dark:bg-navy-800"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={cloudinaryUrl(primary_image || PLACEHOLDER, { width: 800 })}
            alt={name}
            fill
            unoptimized={!!primary_image?.includes('res.cloudinary.com')}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Top-left chips */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {typeLabel && (
              <span className="text-[10px] font-semibold uppercase tracking-eyebrow px-2.5 py-1 rounded bg-navy-900/85 backdrop-blur text-ivory-50 border border-navy-700/40">
                {typeLabel}
              </span>
            )}
            {isMostLoved && (
              <span className="text-[10px] font-semibold uppercase tracking-eyebrow px-2.5 py-1 rounded bg-brass-500 text-navy-900 border border-brass-600">
                Most loved
              </span>
            )}
          </div>
          {/* Top-right chips & favorite */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {is_day_only && !isOvernight && (
              <span className="text-[10px] font-semibold uppercase tracking-eyebrow px-2.5 py-1 rounded bg-ivory-50/95 text-navy-900 border border-ivory-300">
                Day only
              </span>
            )}
            {isAuthenticated && !user?.is_staff && (
              <button
                onClick={toggleFavorite}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                className="w-9 h-9 bg-ivory-50/95 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-brass-500 transition-colors focus-ring"
              >
                <Heart
                  size={15}
                  strokeWidth={1.75}
                  className={favorited ? 'text-red-500 fill-red-500' : 'text-navy-700 hover:text-navy-900'}
                />
              </button>
            )}
          </div>

          {/* Hover preview thumbs (only if more images exist) */}
          {previewStack.length > 0 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              {previewStack.map((img, i) => (
                <span
                  key={i}
                  className="block w-12 h-12 rounded overflow-hidden border border-ivory-50/90 shadow-md bg-ivory-200"
                >
                  <Image
                    src={cloudinaryUrl(img, { width: 120 })}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized={!!img?.includes('res.cloudinary.com')}
                    className="object-cover w-full h-full"
                  />
                </span>
              ))}
              {galleryImages.length > 4 && (
                <span className="flex items-center justify-center w-12 h-12 rounded bg-navy-900/85 text-ivory-50 text-xs font-semibold border border-ivory-50/90">
                  +{galleryImages.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-6">
          <h3 className="font-serif text-xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight leading-snug">
            {name}
          </h3>

          <div className="flex items-center gap-4 text-navy-500 dark:text-ivory-200 text-xs mb-4">
            <span className="flex items-center gap-1.5">
              <Users size={13} strokeWidth={1.75} />
              Up to {capacity} {capacity === 1 ? 'person' : 'persons'}
            </span>
            {size_sqm && (
              <span className="flex items-center gap-1.5">
                <Maximize size={13} strokeWidth={1.75} />
                {size_sqm} m²
              </span>
            )}
          </div>

          {amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5 min-h-[24px]">
              {(amenitiesExpanded ? amenities : amenities.slice(0, 3)).map((a) => (
                <span
                  key={a}
                  className="text-[11px] bg-ivory-100 dark:bg-navy-800 text-navy-700 dark:text-ivory-200 border border-ivory-300 dark:border-navy-700 px-2 py-0.5 rounded"
                >
                  {a}
                </span>
              ))}
              {amenities.length > 3 && !amenitiesExpanded && (
                <button
                  onClick={() => setAmenitiesExpanded(true)}
                  className="text-[11px] text-brass-600 dark:text-brass-300 hover:underline focus-ring rounded"
                >
                  +{amenities.length - 3} more
                </button>
              )}
              {amenitiesExpanded && amenities.length > 3 && (
                <button
                  onClick={() => setAmenitiesExpanded(false)}
                  className="text-[11px] text-brass-600 dark:text-brass-300 hover:underline focus-ring rounded"
                >
                  Show less
                </button>
              )}
            </div>
          )}

          <div className="mt-auto pt-5 border-t border-ivory-300 dark:border-navy-700 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">From</p>
              <p className="font-serif text-2xl text-navy-900 dark:text-ivory-100 leading-none">
                ₱{Number(day_price).toLocaleString()}
                {!isOvernight && !is_day_only && night_price && (
                  <span className="text-navy-300 dark:text-navy-300 text-sm font-sans ml-1">
                    / ₱{Number(night_price).toLocaleString()}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-navy-300 dark:text-navy-300 mt-1 uppercase tracking-wider">{priceLabel}</p>
            </div>
            <Link
              href={`/rooms/${id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded px-2 py-1 -mr-2"
              aria-label={`View ${name}`}
            >
              View
              <ArrowUpRight size={15} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </article>

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
