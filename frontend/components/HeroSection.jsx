'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=90'

export default function HeroSection({ heroConfig }) {
  const videoRef = useRef(null)
  const heroRef = useRef(null)
  const posterSrc = heroConfig?.poster_url || FALLBACK_POSTER
  const videoSrc = heroConfig?.video_url || null

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Fix React muted attribute bug — must set directly on the DOM element
  const setVideoRef = (el) => {
    if (el) {
      el.setAttribute('muted', '')
      el.setAttribute('playsinline', '')
      el.setAttribute('webkit-playsinline', '')
      el.defaultMuted = true
      el.muted = true
    }
    videoRef.current = el
  }

  // Force autoplay — handles mount, data load, and scroll into view
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tryPlay = () => {
      video.muted = true
      const p = video.play()
      if (p !== undefined) {
        p.catch(() => {
          setTimeout(() => {
            video.muted = true
            video.play().catch(() => {})
          }, 500)
        })
      }
    }

    tryPlay()

    const onCanPlay = () => tryPlay()
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('loadeddata', onCanPlay)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && isPlaying) {
          tryPlay()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(video)

    return () => {
      observer.disconnect()
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('loadeddata', onCanPlay)
    }
  }, [videoSrc, isPlaying])

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
      {/* Hero — poster image background with parallax */}
      <section ref={heroRef} className="relative h-screen h-[100dvh] flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
          <Image
            src={posterSrc}
            alt="Adel Beach Resort hero"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </motion.div>

        {/* Floating decorative particles */}
        <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-[15%] w-2 h-2 bg-white/15 rounded-full animate-float" />
          <div className="absolute top-1/3 right-[20%] w-3 h-3 bg-white/10 rounded-full animate-float-delayed" />
          <div className="absolute bottom-1/3 left-[30%] w-1.5 h-1.5 bg-sand-300/20 rounded-full animate-float" />
          <div className="absolute top-[60%] right-[35%] w-2 h-2 bg-white/10 rounded-full animate-float-delayed" />
        </div>

        <motion.div
          className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto"
          style={{ opacity: contentOpacity }}
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sand-300 font-semibold tracking-widest text-sm uppercase mb-4"
          >
            Lawigan, Surigao Del Sur
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight text-shadow-hero"
          >
            Adel Beach Resort
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Escape to the shores of Lawigan — affordable cottages, rooms, and event spaces right by the beach.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/rooms" className="btn-primary px-8 py-4 text-lg flex items-center gap-2 justify-center">
              Browse Accommodations
              <ArrowRight size={20} />
            </Link>
            <Link href="/availability" className="btn-outline px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-ocean-700">
              Check Availability
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-6 h-10 border-2 border-white/60 rounded-full flex items-start justify-center p-1.5"
          >
            <div className="w-1.5 h-3 bg-white/80 rounded-full" />
          </motion.div>
        </motion.div>
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
                  ref={setVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="w-full aspect-video object-cover"
                >
                  <source src={videoSrc} type="video/mp4" />
                </video>

                {/* Video overlay gradient (subtle) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                {/* Video controls — always visible on mobile, hover on desktop */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
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
