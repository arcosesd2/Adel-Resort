'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Shield, Bell, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import useAuthStore from '@/store/authStore'

const sidebarLinks = [
  { href: '/admin-account', label: 'Profile', icon: User },
  { href: '/admin-account/security', label: 'Security', icon: Shield },
  { href: '/admin-account/notifications', label: 'Notifications', icon: Bell },
]

export default function AdminAccountLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isReady } = useAuthStore()

  useEffect(() => {
    if (isReady && (!isAuthenticated || !user?.is_staff)) {
      router.replace('/admin-dashboard')
    }
  }, [isReady, isAuthenticated, user, router])

  const isActive = (href) => {
    if (href === '/admin-account') return pathname === '/admin-account'
    return pathname.startsWith(href)
  }

  if (!isReady || !isAuthenticated || !user?.is_staff) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-serif font-bold text-slate-800 mb-6"
        >
          Staff Account
        </motion.h1>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:hidden overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
              <Link
                href="/admin-dashboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap bg-white/70 text-gray-600 hover:bg-slate-100 hover:text-slate-700"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>
              {sidebarLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-white/70 text-gray-600 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block w-60 shrink-0"
          >
            <div className="glass-card p-3 sticky top-24">
              <Link
                href="/admin-dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-slate-50 hover:text-slate-700 mb-1"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </Link>
              <div className="border-t border-gray-100 my-2" />
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
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'text-gray-600 hover:bg-slate-50 hover:text-slate-700'
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