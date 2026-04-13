'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { cloudinaryUrl } from '@/lib/cloudinary'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/favorites/')
      .then(res => setFavorites(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (roomId) => {
    try {
      await api.post('/auth/favorites/toggle/', { room_id: roomId })
      setFavorites(prev => prev.filter(f => f.room_id !== roomId))
      toast.success('Removed from favorites')
    } catch {
      toast.error('Failed to remove favorite')
    }
  }

  const roomTypeLabels = {
    cottage: 'Cottage',
    dos_andanas: 'Dos Andanas',
    lavender_house: 'Lavender House',
    ac_karaoke: 'AC Room',
    kubo: 'Kubo',
    function_hall: 'Function Hall',
    trapal_table: 'Trapal Table',
  }

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-ocean-500" size={32} />
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Heart className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-1">No favorites yet</h3>
        <p className="text-sm text-gray-400 mb-4">Browse our rooms and tap the heart icon to save your favorites.</p>
        <Link href="/rooms" className="btn-primary py-2.5 px-6 text-sm inline-block">
          Browse Rooms
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ocean-800">My Favorites ({favorites.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {favorites.map((fav, i) => (
          <motion.div
            key={fav.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card group relative"
          >
            {/* Remove button */}
            <button
              onClick={() => handleRemove(fav.room_id)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
            >
              <Heart size={16} className="text-red-500 fill-red-500" />
            </button>

            <Link href={`/rooms/${fav.room_id}`}>
              <div className="aspect-[4/3] bg-ocean-100 overflow-hidden">
                {fav.primary_image ? (
                  <img src={cloudinaryUrl(fav.primary_image, { width: 500 })} alt={fav.room_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ocean-300">
                    <span className="text-4xl">🏖️</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <span className="text-xs font-medium text-ocean-600 uppercase tracking-wide">
                  {roomTypeLabels[fav.room_type] || fav.room_type}
                </span>
                <h3 className="font-semibold text-gray-800 mt-1">{fav.room_name}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Up to {fav.capacity} guests</span>
                </div>
                <div className="mt-2 font-bold text-ocean-700">
                  PHP {Number(fav.day_price).toLocaleString()}
                  <span className="text-xs font-normal text-gray-400"> /day</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
