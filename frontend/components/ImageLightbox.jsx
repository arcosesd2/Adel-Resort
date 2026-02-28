'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import { X } from 'lucide-react'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

export default function ImageLightbox({ images = [], primaryImage, roomName, isOpen, onClose }) {
  const slides = images.length > 0
    ? images.map(img => ({ src: img.image || img, alt: img.alt_text || roomName }))
    : [{ src: primaryImage || PLACEHOLDER, alt: roomName }]

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
      >
        <X size={32} />
      </button>

      <div
        className="w-full h-full max-w-5xl max-h-[85vh] m-8"
        onClick={(e) => e.stopPropagation()}
      >
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
          loop={slides.length > 1}
          className="h-full w-full room-gallery-swiper"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx} className="relative">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-contain"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}
