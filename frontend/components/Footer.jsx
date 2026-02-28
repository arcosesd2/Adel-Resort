import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-ocean-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-serif font-bold text-xl mb-3">
              <Image src="/logo.jpeg" alt="Adel Beach Resort" width={32} height={32} className="rounded-full" />
              Adel Beach Resort
            </Link>
            <p className="text-ocean-200 text-sm leading-relaxed">
              Your perfect beach getaway in Lawigan, Surigao Del Sur. Enjoy cottages, rooms, and event spaces right by the shore.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="https://facebook.com/AdelBeachResort" target="_blank" rel="noopener noreferrer" className="text-ocean-300 hover:text-white transition-colors"><Facebook size={20} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-ocean-200">
              {[
                { href: '/', label: 'Home' },
                { href: '/rooms', label: 'Accommodations' },
                { href: '/availability', label: 'Check Availability' },
                { href: '/auth/register', label: 'Create Account' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Accommodations */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Accommodations</h3>
            <ul className="space-y-2 text-ocean-200 text-sm">
              {[
                { href: '/rooms?room_type=cottage', label: 'Cottages' },
                { href: '/rooms?room_type=kubo', label: 'Kubo Rooms' },
                { href: '/rooms?room_type=lavender_house', label: 'Lavender House' },
                { href: '/rooms?room_type=ac_karaoke', label: 'Karaoke Room' },
                { href: '/rooms?room_type=function_hall', label: 'Function Hall' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-ocean-200">
              <li className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-sand-400" />
                Adel Beach Resort, Lawigan, Surigao Del Sur
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-sand-400" />
                09685361395
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-sand-400" />
                adelbeachresortph@gmail.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ocean-700 mt-10 pt-6 text-center text-ocean-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Adel Beach Resort. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
