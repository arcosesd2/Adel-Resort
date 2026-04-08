'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Shield, CalendarDays, Star, Heart, Bell, Mail } from 'lucide-react'
import { motion } from 'framer-motion'

const sidebarLinks = [
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/security', label: 'Security', icon: Shield },
  { href: '/account/bookings', label: 'My Bookings', icon: CalendarDays },
  { href: '/account/reviews', label: 'My Reviews', icon: Star },
  { href: '/account/favorites', label: 'Favorites', icon: Heart },
  { href: '/account/notifications', label: 'Notifications', icon: Bell },
  { href: '/account/preferences', label: 'Email Preferences', icon: Mail },
]

export default function AccountLayout({ children }) {
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === '/account') return pathname === '/account'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-white pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-serif font-bold text-ocean-800 mb-6"
        >
          My Account
        </motion.h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Mobile: horizontal scrollable tabs */}
          <div className="md:hidden overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              {sidebarLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-ocean-600 text-white shadow-md'
                        : 'bg-white/70 text-gray-600 hover:bg-ocean-50 hover:text-ocean-700'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Desktop: sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block w-60 shrink-0"
          >
            <div className="glass-card p-3 sticky top-24">
              <nav className="space-y-1">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon
                  const active = isActive(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-ocean-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-ocean-50 hover:text-ocean-700'
                      }`}
                    >
                      <Icon size={18} />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </motion.aside>

          {/* Content area */}
          <motion.main
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  )
}
