'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Tag } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'
import api from '@/lib/api'
import { cloudinaryUrl } from '@/lib/cloudinary'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ROOM_TYPE_LABELS = {
  cottage: 'Cottage',
  dos_andanas: 'Dos Andanas',
  lavender_house: 'Lavender House',
  ac_karaoke: 'Air-Conditioned Room',
  kubo: 'Kubo',
  function_hall: 'Function Hall',
  trapal_table: 'Trapal Table',
}

function discountBadge(promo) {
  const val = promo.discount_value
  return promo.discount_type === 'percentage' ? `${val}% OFF` : `₱${Number(val).toLocaleString()} OFF`
}

function scheduleText(promo) {
  if (promo.schedule_type === 'permanent') return 'Ongoing'
  if (promo.schedule_type === 'recurring') {
    const days = (promo.applicable_days || []).sort().map(d => DAY_LABELS[d]).join(', ')
    return days ? `Every ${days}` : 'Recurring'
  }
  return `${new Date(promo.valid_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(promo.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

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
        <FadeInUp className="text-center mb-10">
          <p className="text-ocean-600 font-semibold tracking-widest text-sm uppercase mb-3">Special Offers</p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Promotions & Deals
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Take advantage of our special offers and seasonal promotions.
          </p>
        </FadeInUp>

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
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map((promo) => (
              <StaggerItem key={promo.id}><div className="card group">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={cloudinaryUrl(promo.image_url || promo.image || PLACEHOLDER, { width: 600 })}
                    alt={promo.title}
                    fill
                    unoptimized={!!(promo.image_url || promo.image || '').includes('res.cloudinary.com')}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    {discountBadge(promo)}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">{promo.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">{promo.description}</p>
                  <div className="space-y-2 mb-3">
                    {promo.room_types?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {promo.room_types.map(rt => (
                          <span key={rt} className="text-xs bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded-full font-medium">
                            {ROOM_TYPE_LABELS[rt] || rt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">All room types</span>
                    )}
                    {promo.min_booking_amount > 0 && (
                      <p className="text-xs text-amber-600 font-medium">
                        Min. booking: ₱{Number(promo.min_booking_amount).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{scheduleText(promo)}</span>
                    {promo.allows_voucher && (
                      <span className="text-blue-600 font-medium">Stackable with vouchers</span>
                    )}
                  </div>
                </div>
              </div></StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
