import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Facebook, Instagram } from 'lucide-react'
import WaveDivider from '@/components/WaveDivider'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'
import NewsletterForm from '@/components/NewsletterForm'

const SHOW_FACEBOOK_SOCIAL_LINK = false
const FACEBOOK_SOCIAL_URL = 'https://www.facebook.com/AdelBeachResort'

export default function Footer() {
  return (
    <>
      <WaveDivider color="#0c4a6e" />
      <footer className="bg-ocean-900 text-white">
        {/* Newsletter Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-ocean-800 to-ocean-700">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-16 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <FadeInUp className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-cyan-300/80 font-light tracking-[0.3em] text-xs uppercase mb-2">Stay in the Loop</p>
                <h3 className="font-extralight text-3xl md:text-4xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-cyan-200 mb-1">
                  News, promos & quiet escapes
                </h3>
                <p className="text-ocean-200 text-sm font-light">Get updates on promos, events, and new accommodations.</p>
              </div>
              <NewsletterForm />
            </FadeInUp>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <StaggerItem className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 font-extralight tracking-wide text-xl mb-3">
                <Image src="/logo.png" alt="Adel Beach Resort" width={40} height={40} className="object-contain" />
                Adel Beach Resort
              </Link>
              <p className="text-ocean-200 text-sm leading-relaxed">
                Your perfect beach getaway in Lawigan, Surigao Del Sur. Enjoy cottages, rooms, and event spaces right by the shore.
              </p>
              <div className="flex gap-3 mt-4">
                {SHOW_FACEBOOK_SOCIAL_LINK && (
                  <a href={FACEBOOK_SOCIAL_URL} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-ocean-200 hover:bg-white/20 hover:text-white transition-all">
                    <Facebook size={18} />
                  </a>
                )}
                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-ocean-200 hover:bg-white/20 hover:text-white transition-all">
                  <Instagram size={18} />
                </a>
              </div>
            </StaggerItem>

            {/* Quick Links */}
            <StaggerItem>
              <h3 className="font-light tracking-[0.2em] text-xs uppercase text-cyan-200 mb-4">Quick Links</h3>
              <ul className="space-y-2 text-ocean-200">
                {[
                  { href: '/', label: 'Home' },
                  { href: '/rooms', label: 'Accommodations' },
                  { href: '/about', label: 'About Us' },
                  { href: '/terms', label: 'Terms of Service' },
                  { href: '/privacy', label: 'Privacy Policy' },
                  { href: '/data-deletion', label: 'Data Deletion' },
                  { href: '/refund-policy', label: 'Refund Policy' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </StaggerItem>

            {/* Accommodations */}
            <StaggerItem>
              <h3 className="font-light tracking-[0.2em] text-xs uppercase text-cyan-200 mb-4">Accommodations</h3>
              <ul className="space-y-2 text-ocean-200 text-sm">
                {[
                  { href: '/rooms?room_type=cottage', label: 'Cottages' },
                  { href: '/rooms?room_type=kubo', label: 'Kubo Rooms' },
                  { href: '/rooms?room_type=lavender_house', label: 'Lavender House' },
                  { href: '/rooms?room_type=ac_karaoke', label: 'Air-Conditioned Room' },
                  { href: '/rooms?room_type=function_hall', label: 'Function Hall' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </StaggerItem>

            {/* Contact */}
            <StaggerItem>
              <h3 className="font-light tracking-[0.2em] text-xs uppercase text-cyan-200 mb-4">Contact Us</h3>
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
                  arnelarcos@adel-resort.ph
                </li>
              </ul>
            </StaggerItem>
          </StaggerContainer>

          {/* Gradient separator + copyright */}
          <div className="mt-10 pt-6">
            <div className="h-[2px] bg-gradient-to-r from-ocean-600 via-sand-400 to-ocean-600 rounded-full mb-6" />
            <p className="text-center text-ocean-400 text-sm">
              &copy; {new Date().getFullYear()} Adel Beach Resort. All rights reserved.
            </p>
            <p className="text-center text-ocean-600 text-xs mt-2">v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
          </div>
        </div>
      </footer>
    </>
  )
}
