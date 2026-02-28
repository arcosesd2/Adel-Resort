'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Tag } from 'lucide-react'
import api from '@/lib/api'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

export default function PromotionsPage() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/content/promotions/')
      .then(({ data }) => setPromos(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Promotions & Deals
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Take advantage of our special offers and seasonal promotions.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-20">
            <Tag size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No active promotions</h3>
            <p className="text-gray-400">Stay tuned for upcoming deals and discounts!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map((promo) => (
              <div key={promo.id} className="card group">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={promo.image || PLACEHOLDER}
                    alt={promo.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {promo.discount_info}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">{promo.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">{promo.description}</p>
                  <div className="text-xs text-gray-400">
                    Valid: {formatDate(promo.valid_from)} &ndash; {formatDate(promo.valid_until)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
