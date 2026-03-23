'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=90'

export default function HeroSection({ heroConfig }) {
  const videoRef = useRef(null)
  const posterSrc = heroConfig?.poster_url || FALLBACK_POSTER
  const videoSrc = heroConfig?.video_url || null

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <>
      {/* Hero — poster image background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={posterSrc}
            alt="Adel Beach Resort hero"
            fill
            className="object-cover"
            priority
          />
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

      {/* Video showcase — below poster hero */}
      {videoSrc && (
        <section className="relative py-20 md:py-28 bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-ocean-400 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sand-400 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section heading */}
            <div className="text-center mb-12">
              <p className="text-sand-300 font-semibold tracking-widest text-sm uppercase mb-3">
                Take a Virtual Tour
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4">
                Experience the Beauty
              </h2>
              <div className="w-16 h-1 bg-sand-400 mx-auto rounded-full" />
            </div>

            {/* Video container */}
            <div className="relative group">
              {/* Glow effect behind video */}
              <div className="absolute -inset-1 bg-gradient-to-r from-ocean-400 via-sand-400 to-ocean-400 rounded-2xl opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-500" />

              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full aspect-video object-cover"
                >
                  <source src={videoSrc} type="video/mp4" />
                </video>

                {/* Video overlay gradient (subtle) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                {/* Video controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
