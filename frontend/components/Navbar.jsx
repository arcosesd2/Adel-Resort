'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { setMounted(true) }, [])

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
    { href: '/pricing', label: 'Pricing' },
    { href: '/events', label: 'Events' },
    { href: '/promotions', label: 'Promos' },
    { href: '/availability', label: 'Availability' },
  ]

  const isHome = pathname === '/'
  const transparent = isHome && !scrolled

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent ? 'bg-transparent' : 'bg-white shadow-md'
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
                className={`font-medium transition-colors ${
                  transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                } ${pathname === link.href ? (transparent ? 'text-sand-200' : 'text-ocean-600') : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!mounted ? null : isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`font-medium transition-colors ${
                    transparent ? 'text-white hover:text-sand-200' : 'text-gray-700 hover:text-ocean-600'
                  }`}
                >
                  My Bookings
                </Link>
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
      {mobileOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
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
              {!mounted ? null : isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block text-gray-700 hover:text-ocean-600 font-medium py-2"
                  >
                    My Bookings
                  </Link>
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
        </div>
      )}
    </nav>
  )
}
