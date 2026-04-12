'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, Bell, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated, isReady, logout, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // Poll notification unread count
  useEffect(() => {
    if (!isAuthenticated) return
    const endpoint = user?.is_staff ? '/auth/staff/notifications/unread-count/' : '/auth/notifications/unread-count/'
    const fetchCount = () => {
      api.get(endpoint)
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated, user?.is_staff])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    toast.success('Logged out successfully')
    router.push('/')
    setMobileOpen(false)
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/rooms', label: 'Rooms' },
    { href: '/availability', label: 'Availability' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/news', label: 'News' },
    { href: '/events', label: 'Events' },
    { href: '/promotions', label: 'Promos' },
  ]

  const isHome = pathname === '/'
  const transparent = isHome && !scrolled

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent ? 'bg-transparent' : 'bg-white/80 backdrop-blur-lg shadow-md border-b border-white/20'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className={`flex items-center gap-2 font-serif font-bold text-xl ${
            transparent ? 'text-white' : 'text-ocean-700'
          }`}>
            <Image src="/logo.jpeg" alt="Adel Beach Resort" width={36} height={36} className="rounded-full" />
            Adel Beach Resort
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-medium transition-colors py-1 ${
                  transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                } ${pathname === link.href ? (transparent ? 'text-sand-200' : 'text-ocean-600') : ''}`}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.div
                    layoutId="nav-underline"
                    className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full ${transparent ? 'bg-sand-300' : 'bg-ocean-500'}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!isReady ? null : isAuthenticated ? (
              <>
                {user?.is_staff ? (
                  <>
                    <Link
                      href="/admin-dashboard"
                      className={`font-medium transition-colors ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/admin-account/notifications"
                      className={`relative font-medium transition-colors ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/admin-account"
                      className={`font-medium transition-colors flex items-center gap-1.5 ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      <UserCircle size={20} />
                      Account
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className={`font-medium transition-colors ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      My Bookings
                    </Link>
                    <Link
                      href="/account/notifications"
                      className={`relative font-medium transition-colors ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/account"
                      className={`font-medium transition-colors flex items-center gap-1.5 ${
                        transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                      }`}
                    >
                      <UserCircle size={20} />
                      Account
                    </Link>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="btn-primary py-2 px-4 text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`font-medium transition-colors ${
                    transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                  }`}
                >
                  Login
                </Link>
                <Link href="/auth/register" className="btn-primary py-2 px-4 text-sm">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 ${transparent ? 'text-white' : 'text-gray-700'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-white/95 backdrop-blur-lg border-t shadow-lg overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 hover:text-ocean-600 font-medium py-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t pt-3 space-y-2">
                {!isReady ? null : isAuthenticated ? (
                  <>
                    {user?.is_staff ? (
                      <>
                        <Link
                          href="/admin-dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin-account"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          <UserCircle size={18} />
                          Staff Account
                        </Link>
                        <Link
                          href="/admin-account/notifications"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          <Bell size={18} />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/account"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          <UserCircle size={18} />
                          My Account
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          My Bookings
                        </Link>
                        <Link
                          href="/account/notifications"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 text-gray-700 hover:text-ocean-600 font-medium py-2"
                        >
                          <Bell size={18} />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </>
                    )}
                    <button onClick={handleLogout} className="btn-primary w-full py-2">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center border border-ocean-600 text-ocean-600 rounded-lg py-2 font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setMobileOpen(false)}
                      className="block btn-primary text-center py-2"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
