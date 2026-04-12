'use client'

import PublicCalendar from '@/components/PublicCalendar'

export default function AvailabilityPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-serif font-bold text-ocean-800 mb-2">Room Availability</h1>
      <p className="text-gray-500 mb-8">Check real-time availability across all room types.</p>
      <PublicCalendar />
    </div>
  )
}
