'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=90'

export default function HeroSection({ heroConfig }) {
  const videoRef = useRef(null)
  const posterSrc = heroConfig?.poster_url || FALLBACK_POSTER
  const videoSrc = heroConfig?.video_url || null

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        {/* Poster image — always visible as fallback */}
        <Image
          src={posterSrc}
          alt="Adel Beach Resort hero"
          fill
          className="object-cover"
          priority
        />
        {/* Video overlay — plays on top of poster when available */}
        {videoSrc && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      </div>

      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <p className="text-sand-300 font-semibold tracking-widest text-sm uppercase mb-4">
          Lawigan, Surigao Del Sur
        </p>
        <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Adel Beach Resort
        </h1>
        <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
          Escape to the shores of Lawigan — affordable cottages, rooms, and event spaces right by the beach.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/rooms" className="btn-primary px-8 py-4 text-lg flex items-center gap-2 justify-center">
            Browse Accommodations
            <ArrowRight size={20} />
          </Link>
          <Link href="/availability" className="btn-outline px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-ocean-700">
            Check Availability
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 bg-white rounded-full animate-scroll" />
        </div>
      </div>
    </section>
  )
}
