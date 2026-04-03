'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'

export default function FavoriteButton({ roomId }) {
  const { isAuthenticated, user } = useAuthStore()
  const [favorited, setFavorited] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isAuthenticated || user?.is_staff) return
    api.get('/auth/favorites/')
      .then(res => {
        const isFav = res.data.some(f => f.room_id === roomId)
        setFavorited(isFav)
      })
      .catch(() => {})
  }, [isAuthenticated, roomId, user?.is_staff])

  if (!mounted || !isAuthenticated || user?.is_staff) return null

  const toggle = async () => {
    try {
      const { data } = await api.post('/auth/favorites/toggle/', { room_id: roomId })
      setFavorited(data.favorited)
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-red-50 transition-colors text-sm font-medium"
    >
      <Heart
        size={18}
        className={favorited ? 'text-red-500 fill-red-500' : 'text-gray-400'}
      />
      {favorited ? 'Saved' : 'Save'}
    </button>
  )
}
