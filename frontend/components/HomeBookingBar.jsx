'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Search } from 'lucide-react'

export default function HomeBookingBar() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  const onSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (checkIn) {
      params.set('date', checkIn)
      params.set('checkin', checkIn)
    }
    if (checkOut) params.set('checkout', checkOut)
    if (guests) params.set('guests', String(guests))
    router.push(`/rooms?${params.toString()}`)
  }

  const fieldClass =
    'w-full bg-transparent text-blue-50 placeholder-blue-200/60 focus:outline-none text-sm [color-scheme:dark]'

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] p-3 md:p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 md:gap-3"
    >
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
        <Calendar size={18} className="text-cyan-200 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <span className="block text-[10px] uppercase tracking-widest text-blue-200/80">
            Check-in
          </span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={fieldClass}
          />
        </div>
      </label>

      <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
        <Calendar size={18} className="text-cyan-200 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <span className="block text-[10px] uppercase tracking-widest text-blue-200/80">
            Check-out
          </span>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={fieldClass}
          />
        </div>
      </label>

      <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
        <Users size={18} className="text-cyan-200 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <span className="block text-[10px] uppercase tracking-widest text-blue-200/80">
            Guests
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
            className={fieldClass}
          />
        </div>
      </label>

      <button
        type="submit"
        className="bg-blue-500/30 hover:bg-blue-500/50 backdrop-blur-md border border-white/30 text-white font-light tracking-wide rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-all"
      >
        <Search size={18} />
        <span>Search</span>
      </button>
    </form>
  )
}
