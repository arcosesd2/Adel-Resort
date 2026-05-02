'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, Bell, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '@/store/authStore'
import useNotificationStore from '@/store/notificationStore'
import toast from 'react-hot-toast'
import ThemeToggle from '@/components/ThemeToggle'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated, isReady, logout, user } = useAuthStore()
  const { unreadCount, startPolling, stopPolling } = useNotificationStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isAuthenticated) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [isAuthenticated])

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

  const linkBase = transparent
    ? 'text-ivory-50 hover:text-brass-300'
    : 'text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300'

  const linkActive = transparent ? 'text-brass-300' : 'text-brass-600 dark:text-brass-300'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? 'bg-transparent'
          : 'bg-ivory-100/85 dark:bg-navy-900/85 backdrop-blur-lg shadow-editorial border-b border-ivory-300/60 dark:border-navy-700/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className={`flex items-center gap-2 font-serif font-semibold text-xl focus-ring rounded ${
              transparent ? 'text-ivory-50' : 'text-navy-900 dark:text-ivory-100'
            }`}
          >
            <Image src="/logo.png" alt="Adel Beach Resort" width={44} height={44} className="object-contain" />
            <span className="hidden sm:inline tracking-tight">Adel Beach Resort</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-medium text-sm transition-colors py-1 focus-ring rounded ${linkBase} ${
                  pathname === link.href ? linkActive : ''
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px rounded-full bg-brass-500 dark:bg-brass-300"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Auth + theme buttons */}
          <div className="hidden md:flex items-center gap-2">
            {!isReady ? null : isAuthenticated ? (
              <>
                {user?.is_staff ? (
                  <>
                    <Link
                      href="/admin-dashboard"
                      className={`text-sm font-medium px-2 transition-colors focus-ring rounded ${linkBase}`}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/admin-account/notifications"
                      aria-label="Notifications"
                      className={`relative p-2 transition-colors focus-ring rounded-full ${linkBase}`}
                    >
                      <Bell size={18} strokeWidth={1.75} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 bg-brass-500 dark:bg-brass-300 text-navy-900 text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/admin-account"
                      aria-label="Account"
                      className={`p-2 transition-colors focus-ring rounded-full ${linkBase}`}
                    >
                      <UserCircle size={20} strokeWidth={1.5} />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className={`text-sm font-medium px-2 transition-colors focus-ring rounded ${linkBase}`}
                    >
                      My Bookings
                    </Link>
                    <Link
                      href="/account/notifications"
                      aria-label="Notifications"
                      className={`relative p-2 transition-colors focus-ring rounded-full ${linkBase}`}
                    >
                      <Bell size={18} strokeWidth={1.75} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 bg-brass-500 dark:bg-brass-300 text-navy-900 text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/account"
                      aria-label="Account"
                      className={`p-2 transition-colors focus-ring rounded-full ${linkBase}`}
                    >
                      <UserCircle size={20} strokeWidth={1.5} />
                    </Link>
                  </>
                )}
                <ThemeToggle className={transparent ? 'text-ivory-50' : ''} />
                <button
                  onClick={handleLogout}
                  className="ml-1 text-sm font-medium px-4 py-2 rounded-lg border border-current hover:bg-brass-500 hover:text-navy-900 hover:border-brass-500 dark:hover:bg-brass-300 dark:hover:border-brass-300 transition-colors focus-ring"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <ThemeToggle className={transparent ? 'text-ivory-50' : ''} />
                <Link
                  href="/auth/login"
                  className={`text-sm font-medium px-3 py-2 transition-colors focus-ring rounded ${linkBase}`}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-navy-900 text-ivory-50 dark:bg-brass-500 dark:text-navy-900 hover:bg-brass-500 hover:text-navy-900 dark:hover:bg-brass-300 transition-colors focus-ring"
                >
                  Reserve
                </Link>
              </>
            )}
          </div>

          {/* Mobile right side: theme toggle + menu button */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle className={transparent ? 'text-ivory-50' : ''} />
            <button
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring rounded ${
                transparent ? 'text-ivory-50' : 'text-navy-900 dark:text-ivory-100'
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="md:hidden bg-ivory-100/95 dark:bg-navy-900/95 backdrop-blur-lg border-t border-ivory-300 dark:border-navy-700 shadow-editorial overflow-hidden"
          >
            <div className="px-4 py-5 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block min-h-[44px] flex items-center font-medium py-2 px-2 rounded transition-colors focus-ring ${
                    pathname === link.href
                      ? 'text-brass-600 dark:text-brass-300'
                      : 'text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="hairline my-3" />
              <div className="space-y-1">
                {!isReady ? null : isAuthenticated ? (
                  <>
                    {user?.is_staff ? (
                      <>
                        <Link
                          href="/admin-dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block min-h-[44px] flex items-center text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin-account"
                          onClick={() => setMobileOpen(false)}
                          className="min-h-[44px] flex items-center gap-2 text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          <UserCircle size={18} />
                          Staff Account
                        </Link>
                        <Link
                          href="/admin-account/notifications"
                          onClick={() => setMobileOpen(false)}
                          className="min-h-[44px] flex items-center gap-2 text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          <Bell size={18} />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="bg-brass-500 dark:bg-brass-300 text-navy-900 text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
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
                          className="min-h-[44px] flex items-center gap-2 text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          <UserCircle size={18} />
                          My Account
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block min-h-[44px] flex items-center text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          My Bookings
                        </Link>
                        <Link
                          href="/account/notifications"
                          onClick={() => setMobileOpen(false)}
                          className="min-h-[44px] flex items-center gap-2 text-navy-700 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 font-medium py-2 px-2 rounded transition-colors focus-ring"
                        >
                          <Bell size={18} />
                          Notifications
                          {unreadCount > 0 && (
                            <span className="bg-brass-500 dark:bg-brass-300 text-navy-900 text-xs font-bold rounded-full px-1.5 py-0.5 ml-1">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full min-h-[44px] mt-2 text-sm font-semibold py-2.5 px-4 rounded-lg border border-navy-900 dark:border-brass-300 text-navy-900 dark:text-brass-300 hover:bg-navy-900 hover:text-ivory-50 dark:hover:bg-brass-300 dark:hover:text-navy-900 transition-colors focus-ring"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center min-h-[44px] flex items-center justify-center border border-navy-900 dark:border-ivory-200 text-navy-900 dark:text-ivory-100 rounded-lg py-2 font-medium focus-ring"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center min-h-[44px] flex items-center justify-center bg-navy-900 text-ivory-50 dark:bg-brass-500 dark:text-navy-900 rounded-lg py-2 font-semibold focus-ring"
                    >
                      Reserve
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
