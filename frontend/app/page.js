import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star, Waves, Shield, Clock } from 'lucide-react'
import api from '@/lib/api'
import RoomCard from '@/components/RoomCard'

async function getFeaturedRooms() {
  try {
    const { data } = await api.get('/rooms/?page_size=3')
    return data.results || data
  } catch {
    return []
  }
}

const features = [
  { icon: Waves, title: 'Beachfront Location', desc: 'Directly on the pristine shores with stunning ocean views' },
  { icon: Star, title: 'Luxury Amenities', desc: 'World-class facilities including pool, spa, and fine dining' },
  { icon: Shield, title: 'Best Price Guarantee', desc: 'Book direct and get the best available rate, always' },
  { icon: Clock, title: '24/7 Concierge', desc: 'Round-the-clock personalized service for every need' },
]

export default async function HomePage() {
  const rooms = await getFeaturedRooms()

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=90"
            alt="Adel Beach Resort hero"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <p className="text-sand-300 font-semibold tracking-widest text-sm uppercase mb-4">
            Welcome to Paradise
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Adel Beach Resort
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the perfect harmony of luxury and nature on the world's most beautiful shores.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/rooms" className="btn-primary px-8 py-4 text-lg flex items-center gap-2 justify-center">
              Browse Rooms
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

      {/* Features */}
      <section className="py-20 bg-ocean-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-gray-900 mb-4">Why Choose Adel Beach?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              We combine breathtaking natural beauty with unmatched luxury to create memories that last a lifetime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-ocean-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-ocean-600" size={28} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-gray-900 mb-4">Featured Accommodations</h2>
            <p className="text-gray-500 text-lg">From cozy standard rooms to lavish private villas</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.slice(0, 3).map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/rooms" className="btn-outline px-8 py-3 inline-flex items-center gap-2">
              View All Rooms
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80"
            alt="Beach sunset"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ocean-900/70" />
        </div>
        <div className="relative z-10 text-center text-white max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
            Ready for Your Dream Escape?
          </h2>
          <p className="text-ocean-200 text-lg mb-8">
            Book directly and enjoy exclusive perks including free airport transfer and late checkout.
          </p>
          <Link href="/rooms" className="btn-secondary px-10 py-4 text-lg">
            Book Your Stay
          </Link>
        </div>
      </section>
    </>
  )
}
