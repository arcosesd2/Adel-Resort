import Link from 'next/link'
import { Waves, MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-ocean-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-serif font-bold text-xl mb-3">
              <Waves className="w-6 h-6 text-sand-400" />
              Adel Beach Resort
            </Link>
            <p className="text-ocean-200 text-sm leading-relaxed">
              Your ultimate beach getaway. Experience luxury, nature, and unparalleled service on the shores of paradise.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-ocean-300 hover:text-white transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-ocean-300 hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-ocean-300 hover:text-white transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-ocean-200">
              {[
                { href: '/', label: 'Home' },
                { href: '/rooms', label: 'Rooms & Suites' },
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

          {/* Room Types */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Accommodations</h3>
            <ul className="space-y-2 text-ocean-200 text-sm">
              <li>Standard Rooms</li>
              <li>Deluxe Rooms</li>
              <li>Suites</li>
              <li>Beach Villas</li>
              <li>Garden Bungalows</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-ocean-200">
              <li className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-sand-400" />
                123 Beachfront Drive, Paradise Island, PI 12345
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-sand-400" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-sand-400" />
                hello@adelbeachresort.com
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
