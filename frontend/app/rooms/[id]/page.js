import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Users, Maximize, Check } from 'lucide-react'
import BookingForm from '@/components/BookingForm'
import api from '@/lib/api'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

async function getRoom(id) {
  try {
    const { data } = await api.get(`/rooms/${id}/`)
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const room = await getRoom(params.id)
  if (!room) return { title: 'Room not found' }
  return {
    title: `${room.name} | Adel Beach Resort`,
    description: room.description,
  }
}

const typeColors = {
  cottage: 'bg-blue-100 text-blue-700',
  dos_andanas: 'bg-purple-100 text-purple-700',
  lavender_house: 'bg-fuchsia-100 text-fuchsia-700',
  ac_karaoke: 'bg-pink-100 text-pink-700',
  kubo: 'bg-amber-100 text-amber-700',
  function_hall: 'bg-emerald-100 text-emerald-700',
  trapal_table: 'bg-lime-100 text-lime-700',
}

export default async function RoomDetailPage({ params }) {
  const room = await getRoom(params.id)
  if (!room) notFound()

  const primaryImage = room.primary_image || PLACEHOLDER
  const otherImages = room.images?.filter(img => !img.is_primary).slice(0, 4) || []

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Hero Image */}
      <div className="relative h-96 md:h-[500px] w-full">
        <Image
          src={primaryImage}
          alt={room.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeColors[room.room_type] || 'bg-gray-100 text-gray-700'}`}>
            {room.room_type_display}
          </span>
          <h1 className="font-serif text-4xl font-bold mt-2">{room.name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <div className="flex flex-wrap gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="text-ocean-500" size={20} />
                <span>Up to <strong>{room.capacity}</strong> persons</span>
              </div>
              {room.size_sqm && (
                <div className="flex items-center gap-2">
                  <Maximize className="text-ocean-500" size={20} />
                  <span><strong>{room.size_sqm}</strong> m²</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl font-bold text-gray-900 mb-3">About This Room</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{room.description}</p>
            </div>

            {/* Amenities */}
            {room.amenities?.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {room.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 bg-ocean-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-ocean-600" />
                      </div>
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {otherImages.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Gallery</h2>
                <div className="grid grid-cols-2 gap-3">
                  {otherImages.map((img) => (
                    <div key={img.id} className="relative h-48 rounded-xl overflow-hidden">
                      <Image
                        src={img.image}
                        alt={img.alt_text || room.name}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingForm room={room} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
