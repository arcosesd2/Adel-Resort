export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Quote, Star, Users, Home, Clock, Award } from 'lucide-react'
import api from '@/lib/api'
import RoomCard from '@/components/RoomCard'
import HeroSection from '@/components/HeroSection'
import WaveDivider from '@/components/WaveDivider'
import { FadeInUp, StaggerContainer, StaggerItem, CountUp } from '@/components/motions'

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

function buildStats(data) {
 return [
 { icon: Users, end: data?.total_guests || 0, suffix: '+', label: 'Happy Guests' },
 { icon: Home, end: data?.total_rooms || 0, suffix: '+', label: 'Rooms & Cottages' },
 { icon: Clock, end: data?.years_of_service || 1, suffix: '+', label: 'Years of Service', decimals: 0 },
 { icon: Award, end: data?.average_rating || 0, label: 'Average Rating', decimals: 1 },
 ]
}

const testimonials = [
 {
 name: 'Maria Santos',
 rating: 5,
 text: 'Amazing beachfront resort! The cottage was clean, the staff was very friendly, and the kids loved the playground. We\'ll definitely be back!',
 },
 {
 name: 'James Dela Cruz',
 rating: 5,
 text: 'Perfect place for our family reunion. The function hall was spacious, the karaoke was a hit, and the beach view was absolutely stunning.',
 },
 {
 name: 'Anna Reyes',
 rating: 4,
 text: 'Great value for money! The Kubo was cozy and the sunset view from the beach was unforgettable. Highly recommend for couples or small groups.',
 },
]

export default async function HomePage() {
 const [rooms, heroConfig, publicStats, siteSettings] = await Promise.all([getFeaturedRooms(), getHeroConfig(), getPublicStats(), getSiteSettings()])
 const stats = buildStats(publicStats)
 const showStats = siteSettings?.show_stats !== false
 const showTestimonials = siteSettings?.show_testimonials !== false

 return (
 <>
 {/* Hero */}
 <HeroSection heroConfig={heroConfig} />

 {/* Stats Counter Section */}
 {showStats && <>
 <WaveDivider color="#0c4a6e" />
 <section className="py-20 bg-gradient-to-r from-ocean-900 via-ocean-800 to-ocean-900 relative overflow-hidden">
 {/* Decorative bg elements */}
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-0 left-[10%] w-64 h-64 bg-ocean-400/10 rounded-full blur-3xl" />
 <div className="absolute bottom-0 right-[10%] w-72 h-72 bg-sand-400/10 rounded-full blur-3xl" />
 </div>

 <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <FadeInUp className="text-center mb-14">
 <p className="text-sand-300 font-semibold tracking-widest text-sm uppercase mb-3">Our Track Record</p>
 <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">Why Guests Love Us</h2>
 </FadeInUp>
 <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 {stats.map(({ icon: Icon, end, suffix, label, decimals }) => (
 <StaggerItem key={label}>
 <div className="glass-card-dark p-6 text-center">
 <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
 <Icon className="text-sand-300" size={24} />
 </div>
 <div className="text-4xl md:text-5xl font-bold text-white mb-2">
 <CountUp end={end} suffix={suffix || ''} decimals={decimals || 0} />
 </div>
 <p className="text-ocean-200 text-sm font-medium">{label}</p>
 </div>
 </StaggerItem>
 ))}
 </StaggerContainer>
 </div>
 </section>
 </>}

 {/* Wave → rooms */}
 <WaveDivider color="#ffffff" />

 {/* Featured Rooms */}
 <section className="relative py-24 md:py-28 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
 <div className="absolute inset-0 pointer-events-none opacity-40">
 <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
 <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
 </div>
 <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <FadeInUp className="text-center mb-14">
 <p className="text-blue-600 font-light tracking-[0.3em] text-xs uppercase mb-4">Stay With Us</p>
 <h2 className="font-extralight text-4xl md:text-5xl lg:text-6xl mb-5 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-blue-900 to-blue-700">
 Featured Accommodations
 </h2>
 <p className="text-blue-700/80 text-lg font-light max-w-2xl mx-auto">
 From budget-friendly cottages to fully furnished rooms
 </p>
 </FadeInUp>
 <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {rooms.slice(0, 3).map((room) => (
 <StaggerItem key={room.id}>
 <RoomCard room={room} />
 </StaggerItem>
 ))}
 </StaggerContainer>
 <FadeInUp delay={0.3} className="text-center mt-10">
 <Link href="/rooms" className="btn-outline px-8 py-3 inline-flex items-center gap-2">
 View All Accommodations
 <ArrowRight size={18} />
 </Link>
 </FadeInUp>
 </div>
 </section>

 {/* Testimonials */}
 {showTestimonials && <>
 <WaveDivider color="#f0f9ff" />
 <section className="py-20 bg-ocean-50 relative overflow-hidden">
 {/* Decorative quote */}
 <div className="absolute top-10 left-10 opacity-[0.04] pointer-events-none">
 <Quote size={200} strokeWidth={1} />
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
 <FadeInUp className="text-center mb-14">
 <p className="text-blue-600 font-light tracking-[0.3em] text-xs uppercase mb-4">Guest Reviews</p>
 <h2 className="font-extralight text-4xl md:text-5xl lg:text-6xl mb-5 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-blue-900 to-blue-700">
 What Our Guests Say
 </h2>
 </FadeInUp>
 <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {testimonials.map((t) => (
 <StaggerItem key={t.name}>
 <div className="glass-card p-6 h-full flex flex-col">
 <Quote className="text-ocean-300 mb-4" size={28} />
 <p className="text-gray-600 leading-relaxed flex-1 mb-4">{t.text}</p>
 <div className="flex items-center gap-1 mb-2">
 {[...Array(5)].map((_, i) => (
 <Star
 key={i}
 size={16}
 className={i < t.rating ? 'text-sand-400 fill-sand-400' : 'text-gray-300'}
 />
 ))}
 </div>
 <p className="font-semibold text-gray-900">{t.name}</p>
 </div>
 </StaggerItem>
 ))}
 </StaggerContainer>
 </div>
 </section>
 </>}

 {/* Wave → CTA */}
 <WaveDivider color="#0c4a6e" />

 {/* CTA Banner */}
 <section className="relative py-24 overflow-hidden">
 <div className="absolute inset-0">
 <Image
 src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80"
 alt="Beach sunset"
 fill
 className="object-cover"
 />
 <div className="absolute inset-0 bg-gradient-to-br from-ocean-900/80 via-ocean-800/70 to-sand-900/60" />
 </div>

 {/* Floating decorative elements */}
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-1/4 left-[10%] w-48 h-48 bg-ocean-400/15 rounded-full blur-3xl animate-float" />
 <div className="absolute bottom-1/4 right-[15%] w-56 h-56 bg-sand-400/15 rounded-full blur-3xl animate-float-delayed" />
 </div>

 <FadeInUp className="relative z-10 text-center text-white max-w-3xl mx-auto px-4">
 <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 text-shadow-hero">
 Plan Your Next Beach Trip
 </h2>
 <p className="text-ocean-200 text-lg mb-8">
 Book your day tour or overnight stay at Adel Beach Resort. Cottages, rooms, and event halls available.
 </p>
 <Link href="/rooms" className="btn-secondary px-10 py-4 text-lg inline-block">
 Book Now
 </Link>
 </FadeInUp>
 </section>
 </>
 )
}
