'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=90'
const EASE = [0.2, 0.8, 0.2, 1]

export default function EditorialHero({ heroConfig }) {
  const heroRef = useRef(null)
  const videoRef = useRef(null)
  const reduce = useReducedMotion()

  const posterSrc = heroConfig?.poster_url || FALLBACK_POSTER
  const videoSrc = heroConfig?.video_url || null

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '8%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], reduce ? [1, 1] : [1, 0])

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
        if (entry.isIntersecting && isPlaying) tryPlay()
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
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <>
      <section
        ref={heroRef}
        className="relative h-screen min-h-[640px] flex items-end overflow-hidden bg-navy-900"
      >
        {/* Background image with subtle parallax */}
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <Image
            src={posterSrc}
            alt="Adel Beach Resort coastline"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          {/* Editorial gradient overlay — darker bottom-left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/85 via-navy-900/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-950/40" />
        </motion.div>

        {/* Editorial content panel */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="relative z-10 w-full pb-20 md:pb-28"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl">
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.8, ease: EASE }}
                className="text-brass-300 text-xs font-semibold uppercase tracking-eyebrow mb-6 flex items-center gap-3"
              >
                <span className="inline-block w-8 h-px bg-brass-300" aria-hidden="true" />
                Est. — Lawigan, Surigao Del Sur
              </motion.p>

              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.9, ease: EASE }}
                className="font-serif text-ivory-50 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight font-semibold mb-6 text-shadow-hero"
              >
                {heroConfig?.headline || (
                  <>
                    A quiet stretch of
                    <br />
                    the Philippine sea.
                  </>
                )}
              </motion.h1>

              <motion.p
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.9, ease: EASE }}
                className="text-ivory-100/90 text-lg md:text-xl leading-relaxed max-w-xl mb-10"
              >
                {heroConfig?.subheading ||
                  'Cottages, kubo rooms, and oceanfront event spaces along the shores of Lawigan. Kept simple, kept honest, kept yours.'}
              </motion.p>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
                className="flex flex-col sm:flex-row gap-3 sm:items-center"
              >
                <Link
                  href="/rooms"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-ivory-50 text-navy-900 font-semibold rounded-lg hover:bg-brass-300 transition-colors duration-300 focus-ring text-sm tracking-wide"
                >
                  Reserve your stay
                  <ArrowUpRight size={18} strokeWidth={2} />
                </Link>
                <Link
                  href="/availability"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 border border-ivory-50/40 text-ivory-50 font-medium rounded-lg hover:bg-ivory-50/10 hover:border-ivory-50 transition-colors duration-300 focus-ring text-sm tracking-wide"
                >
                  Check availability
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Subtle scroll cue — bottom right, brass hairline */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-8 right-8 hidden md:flex items-center gap-3 text-ivory-100/60 text-xs uppercase tracking-eyebrow"
        >
          <span>Scroll</span>
          <span className="block w-12 h-px bg-ivory-100/40" aria-hidden="true" />
        </motion.div>
      </section>

      {/* Video showcase — editorial framing */}
      {videoSrc && (
        <section className="relative bg-ivory-100 dark:bg-navy-950 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center mb-10 md:mb-14">
              <div className="md:col-span-4">
                <p className="eyebrow mb-3">Film</p>
                <h2 className="font-serif text-3xl md:text-4xl text-navy-900 dark:text-ivory-100 mb-4 leading-tight">
                  Take the long way around.
                </h2>
                <p className="text-navy-500 dark:text-ivory-200 text-base leading-relaxed">
                  A short film of Adel Beach Resort — the cottages at first light, the karaoke at sundown, and the sea in between.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="relative rounded-xl overflow-hidden shadow-editorial-lg group bg-navy-900 ring-1 ring-navy-200 dark:ring-navy-700">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 flex items-center justify-between md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={togglePlay}
                      className="w-11 h-11 bg-ivory-50/15 backdrop-blur rounded-full flex items-center justify-center text-ivory-50 hover:bg-brass-500 hover:text-navy-900 transition-colors focus-ring"
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="w-11 h-11 bg-ivory-50/15 backdrop-blur rounded-full flex items-center justify-center text-ivory-50 hover:bg-brass-500 hover:text-navy-900 transition-colors focus-ring"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
