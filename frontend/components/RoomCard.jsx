import Link from 'next/link'
import Image from 'next/image'
import { Users, Maximize } from 'lucide-react'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'

const typeColors = {
  small_cottage: 'bg-blue-100 text-blue-700',
  dos_andanas_down: 'bg-sky-100 text-sky-700',
  dos_andanas_up: 'bg-cyan-100 text-cyan-700',
  large_cottage: 'bg-teal-100 text-teal-700',
  dos_andanas_room_sm: 'bg-purple-100 text-purple-700',
  dos_andanas_room_lg: 'bg-violet-100 text-violet-700',
  lavender_house: 'bg-fuchsia-100 text-fuchsia-700',
  ac_karaoke: 'bg-pink-100 text-pink-700',
  kubo_with_toilet: 'bg-amber-100 text-amber-700',
  kubo_without_toilet: 'bg-orange-100 text-orange-700',
  function_hall: 'bg-emerald-100 text-emerald-700',
  trapal_table: 'bg-lime-100 text-lime-700',
}

export default function RoomCard({ room }) {
  const { id, name, room_type, room_type_display, day_price, night_price, is_day_only, capacity, size_sqm, primary_image, amenities } = room

  return (
    <div className="card group hover:shadow-xl transition-shadow duration-300">
      <div className="relative h-56 overflow-hidden">
        <Image
          src={primary_image || PLACEHOLDER}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeColors[room_type] || 'bg-gray-100 text-gray-700'}`}>
            {room_type_display}
          </span>
        </div>
        {is_day_only && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
              Day Only
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">{name}</h3>

        <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
          <span className="flex items-center gap-1">
            <Users size={15} />
            Up to {capacity} persons
          </span>
          {size_sqm && (
            <span className="flex items-center gap-1">
              <Maximize size={15} />
              {size_sqm} m²
            </span>
          )}
        </div>

        {amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {a}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="text-xs text-gray-400">+{amenities.length - 4} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-2xl font-bold text-ocean-700">₱{day_price}</span>
            {!is_day_only && night_price && (
              <span className="text-gray-400 text-sm"> / ₱{night_price}</span>
            )}
            <div className="text-gray-400 text-xs">
              {is_day_only ? 'day tour' : 'day / night'}
            </div>
          </div>
          <Link
            href={`/rooms/${id}`}
            className="btn-primary py-2 px-5 text-sm"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  )
}
