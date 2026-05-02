export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Trophy, TreePalm, Music, CarFront, Users, Home, Clock, Award } from 'lucide-react'
import api from '@/lib/api'
import RoomCard from '@/components/RoomCard'
import HeroSection from '@/components/HeroSection'
import EditorialStats from '@/components/home/EditorialStats'
import TestimonialQuote from '@/components/home/TestimonialQuote'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'

async function getFeaturedRooms() {
  try {
    const { data } = await api.get('/rooms/featured/')
    return data
  } catch {
    return []
  }
}

async function getHeroConfig() {
  try {
    const { data } = await api.get('/content/hero/')
    return data
  } catch {
    return null
  }
}

async function getPublicStats() {
  try {
    const { data } = await api.get('/analytics/stats/')
    return data
  } catch {
    return null
  }
}

async function getSiteSettings() {
  try {
    const { data } = await api.get('/content/settings/')
    return data
  } catch {
    return null
  }
}

const features = [
  { icon: Trophy, title: 'Multi-purpose Court', desc: 'Volleyball, basketball, and pickleball — outdoor courts for guests of any age.' },
  { icon: TreePalm, title: "Children's Playground", desc: 'A safe, shaded play area within sight of the cottages.' },
  { icon: Music, title: 'Karaoke Units', desc: 'Multiple karaoke setups around the property — Filipino tradition, kept lively.' },
  { icon: CarFront, title: 'CCTV Parking', desc: 'Wide, monitored parking so the day starts and ends without worry.' },
]

function buildStats(data) {
  return [
    { end: data?.total_guests || 0, suffix: '+', label: 'Happy guests' },
    { end: data?.total_rooms || 0, suffix: '+', label: 'Rooms & cottages' },
    { end: data?.years_of_service || 1, suffix: '+', label: 'Years of service', decimals: 0 },
    { end: data?.average_rating || 0, label: 'Average rating', decimals: 1 },
  ]
}

const testimonials = [
  {
    name: 'Maria Santos',
    location: 'Davao City',
    rating: 5,
    text: 'The cottage was clean, the staff thoughtful, and the kids never wanted to leave the playground. We will be back.',
  },
  {
    name: 'James Dela Cruz',
    location: 'Cagayan de Oro',
    rating: 5,
    text: 'A perfect place for our family reunion. The function hall held us all, and the karaoke held everything else.',
  },
  {
    name: 'Anna Reyes',
    location: 'Surigao City',
    rating: 4,
    text: 'Honest value, quiet kubo, and a sunset I will remember. Recommended for couples and small groups.',
  },
]

export default async function HomePage() {
  const [rooms, heroConfig, publicStats, siteSettings] = await Promise.all([
    getFeaturedRooms(),
    getHeroConfig(),
    getPublicStats(),
    getSiteSettings(),
  ])
  const stats = buildStats(publicStats)
  const showStats = siteSettings?.show_stats !== false
  const showTestimonials = siteSettings?.show_testimonials !== false

  return (
    <>
      <HeroSection heroConfig={heroConfig} />

      {/* Manifesto / intro */}
      <section className="bg-ivory-100 dark:bg-navy-950 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 md:gap-16 items-start">
            <FadeInUp className="md:col-span-4">
              <p className="eyebrow mb-4">A note from the shore</p>
              <span className="block w-12 h-px bg-brass-500 dark:bg-brass-300" aria-hidden="true" />
            </FadeInUp>
            <FadeInUp delay={0.1} className="md:col-span-8">
              <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-navy-900 dark:text-ivory-100 leading-snug tracking-tight">
                Adel Beach Resort is a small, family-run stretch of coast in Lawigan — built for honest stays, family
                reunions, and the kind of slow afternoons the Pacific does best.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors"
                >
                  Read our story
                  <ArrowUpRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Features / Amenities */}
      <section className="bg-white dark:bg-navy-900 py-20 md:py-28 border-t border-ivory-300 dark:border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeInUp className="max-w-2xl mb-12 md:mb-16">
            <p className="eyebrow mb-3">What you'll find</p>
            <h2 className="font-serif text-3xl md:text-5xl text-navy-900 dark:text-ivory-100 leading-tight mb-4">
              The amenities, kept simple.
            </h2>
            <p className="text-navy-500 dark:text-ivory-200 text-base md:text-lg leading-relaxed">
              Everything a beach day asks for — no more, no less.
            </p>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ivory-300 dark:bg-navy-800 border border-ivory-300 dark:border-navy-800">
            {features.map(({ icon: Icon, title, desc }) => (
              <StaggerItem
                key={title}
                className="bg-white dark:bg-navy-900 p-7 md:p-8 transition-colors duration-300 hover:bg-ivory-50 dark:hover:bg-navy-800"
              >
                <div className="w-11 h-11 mb-6 flex items-center justify-center text-brass-600 dark:text-brass-300 border border-brass-300/60 dark:border-brass-700/60 rounded">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-navy-900 dark:text-ivory-100 mb-2 tracking-tight">{title}</h3>
                <p className="text-navy-500 dark:text-ivory-200 text-sm leading-relaxed">{desc}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {showStats && <EditorialStats stats={stats} eyebrow="In numbers" heading="A few honest figures." />}

      {/* Featured Rooms */}
      <section className="bg-white dark:bg-navy-900 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeInUp className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-14">
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">Stay with us</p>
              <h2 className="font-serif text-3xl md:text-5xl text-navy-900 dark:text-ivory-100 leading-tight">
                A few of our rooms.
              </h2>
            </div>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-ivory-100 hover:text-brass-600 dark:hover:text-brass-300 transition-colors self-start md:self-auto"
            >
              View all accommodations
              <ArrowUpRight size={16} strokeWidth={2} />
            </Link>
          </FadeInUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {rooms.slice(0, 3).map((room) => (
              <StaggerItem key={room.id}>
                <RoomCard room={room} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials */}
      {showTestimonials && (
        <section className="bg-ivory-100 dark:bg-navy-950 py-20 md:py-28 border-t border-ivory-300 dark:border-navy-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <FadeInUp className="max-w-2xl mb-12 md:mb-16">
              <p className="eyebrow mb-3">Guest letters</p>
              <h2 className="font-serif text-3xl md:text-5xl text-navy-900 dark:text-ivory-100 leading-tight">
                In the words of those who stayed.
              </h2>
            </FadeInUp>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {testimonials.map((t) => (
                <StaggerItem key={t.name}>
                  <TestimonialQuote {...t} verified />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* CTA Banner — editorial split */}
      <section className="relative overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1600&q=80"
              alt="Beach sunset at Adel Beach Resort"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative bg-navy-900 dark:bg-navy-950 text-ivory-50 px-8 md:px-14 lg:px-20 py-16 md:py-24 flex flex-col justify-center">
            <FadeInUp>
              <p className="eyebrow text-brass-300 mb-4">Plan your stay</p>
              <h2 className="font-serif text-3xl md:text-5xl text-ivory-50 leading-tight mb-6 tracking-tight">
                The shore is best in person.
              </h2>
              <p className="text-ivory-100/80 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                Day tours, overnight stays, and event spaces — book directly and we'll have everything ready when you arrive.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/rooms"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-brass-500 text-navy-900 font-semibold rounded-lg hover:bg-brass-300 transition-colors duration-300 focus-ring text-sm tracking-wide"
                >
                  Reserve a room
                  <ArrowUpRight size={18} strokeWidth={2} />
                </Link>
                <Link
                  href="/availability"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 border border-ivory-50/40 text-ivory-50 font-medium rounded-lg hover:bg-ivory-50/10 hover:border-ivory-50 transition-colors duration-300 focus-ring text-sm tracking-wide"
                >
                  Check dates
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>
    </>
  )
}
