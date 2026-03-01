export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { Users, Maximize, Check } from 'lucide-react'
import BookingForm from '@/components/BookingForm'
import RoomGallery from '@/components/RoomGallery'
import api from '@/lib/api'

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

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Image Gallery with Swipe & Zoom */}
      <div className="relative">
        <RoomGallery images={room.images || []} roomName={room.name} />
        <div className="absolute bottom-6 left-6 text-white z-20 pointer-events-none">
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
