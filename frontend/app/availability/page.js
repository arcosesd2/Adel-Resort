import PublicCalendar from '@/components/PublicCalendar'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Room Availability | Adel Beach Resort',
  description: 'Check availability for all rooms at Adel Beach Resort.',
}

export default function AvailabilityPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Room Availability
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            View real-time availability for all our rooms. Colored indicators show booked dates per room type.
          </p>
        </div>

        <div className="card p-6 md:p-8">
          <PublicCalendar />
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-500 mb-4">Found your perfect dates?</p>
          <Link href="/rooms" className="btn-primary px-8 py-3 inline-flex items-center gap-2">
            Browse & Book a Room
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  )
}
