'use client'

import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'
import api from '@/lib/api'

export default function PricingPage() {
  const [pricing, setPricing] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/content/pricing/')
      .then(({ data }) => setPricing(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group pricing entries by room_type_display
  const grouped = pricing.reduce((acc, item) => {
    const key = item.room_type_display
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Transparent pricing for all our accommodations. Day Tour: 8AM&ndash;5PM | Night Tour: 5PM&ndash;8AM
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : pricing.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">Pricing coming soon</h3>
            <p className="text-gray-400">Please check back later for our rates.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[24%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Accommodation</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Day Rate</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Night Rate</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).map(([roomType, items]) => (
                      <>
                        <tr key={`header-${roomType}`}>
                          <td colSpan={4} className="bg-ocean-600 px-6 py-3">
                            <h2 className="font-serif text-lg font-bold text-white">{roomType}</h2>
                          </td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-800 font-medium">{item.label}</td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              ₱{Number(item.day_price).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {item.night_price ? `₱${Number(item.night_price).toLocaleString()}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.notes}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6 bg-amber-50 border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2">Additional Information</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>Extra charge of ₱100 each for rice cooker, water heater, sound system</li>
                <li>+₱100 for extra foam and bedsheet</li>
                <li>Day Tour: 8AM &ndash; 5PM | Night Tour: 5PM &ndash; 8AM</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
