'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

export default function RoomGallery({ images = [], roomName }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Build slides: primary first, then others
  const primaryImg = images.find(img => img.is_primary)
  const otherImgs = images.filter(img => !img.is_primary)
  const allImages = primaryImg ? [primaryImg, ...otherImgs] : images.length > 0 ? images : null

  // If no images at all, show placeholder
  const slides = allImages || [{ id: 'placeholder', image: PLACEHOLDER, alt_text: roomName }]

  const openLightbox = (index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  const prevImage = useCallback(() => {
    setLightboxIndex(i => (i - 1 + slides.length) % slides.length)
  }, [slides.length])

  const nextImage = useCallback(() => {
    setLightboxIndex(i => (i + 1) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [lightboxOpen, closeLightbox, prevImage, nextImage])

  return (
    <>
      <div className="relative h-96 md:h-[500px] w-full">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
          loop={slides.length > 1}
          className="h-full w-full room-gallery-swiper"
        >
          {slides.map((img, idx) => (
            <SwiperSlide key={img.id} className="relative">
              <Image
                src={img.image}
                alt={img.alt_text || roomName}
                fill
                className="object-cover cursor-pointer"
                priority={idx === 0}
                onClick={() => openLightbox(idx)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10" />
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
          >
            <X size={32} />
          </button>

          {slides.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 bg-black/40 rounded-full p-2"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-50 bg-black/40 rounded-full p-2"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] m-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={slides[lightboxIndex].image}
              alt={slides[lightboxIndex].alt_text || roomName}
              fill
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-4 text-white text-sm z-50">
            {lightboxIndex + 1} / {slides.length}
          </div>
        </div>
      )}
    </>
  )
}
