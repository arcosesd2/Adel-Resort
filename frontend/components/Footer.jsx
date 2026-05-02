import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Facebook, Instagram } from 'lucide-react'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motions'
import NewsletterForm from '@/components/NewsletterForm'

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/rooms', label: 'Accommodations' },
  { href: '/about', label: 'About' },
  { href: '/news', label: 'Journal' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refund-policy', label: 'Refunds' },
]

const accommodations = [
  { href: '/rooms?room_type=cottage', label: 'Cottages' },
  { href: '/rooms?room_type=kubo', label: 'Kubo Rooms' },
  { href: '/rooms?room_type=lavender_house', label: 'Lavender House' },
  { href: '/rooms?room_type=ac_karaoke', label: 'Air-Conditioned Room' },
  { href: '/rooms?room_type=function_hall', label: 'Function Hall' },
]

export default function Footer() {
  return (
    <footer className="bg-ivory-100 dark:bg-navy-950 text-navy-700 dark:text-ivory-200 border-t border-ivory-300 dark:border-navy-800">
      {/* Newsletter band */}
      <div className="bg-navy-900 dark:bg-navy-900 text-ivory-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-14">
          <FadeInUp className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-6">
              <p className="eyebrow text-brass-300 mb-3">Letters from the shore</p>
              <h3 className="font-serif text-2xl md:text-3xl text-ivory-50 leading-tight tracking-tight">
                Quiet updates. New rooms, the occasional promo.
              </h3>
            </div>
            <div className="md:col-span-6 md:pl-8">
              <NewsletterForm />
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Main lockup */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <StaggerItem className="md:col-span-4">
            <Link href="/" className="flex items-center gap-3 font-serif font-semibold text-lg text-navy-900 dark:text-ivory-100 mb-4 group focus-ring rounded">
              <Image src="/logo.png" alt="" width={36} height={36} className="object-contain" />
              <span className="tracking-tight">Adel Beach Resort</span>
            </Link>
            <p className="text-sm leading-relaxed text-navy-500 dark:text-ivory-200 max-w-sm">
              A small, family-run beach resort in Lawigan, Surigao Del Sur. Cottages, rooms, and event spaces along
              the Pacific shore.
            </p>
            <div className="flex gap-2 mt-6">
              <a
                href="https://www.facebook.com/AdelBeachResort"
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                aria-label="Adel Beach Resort on Facebook"
                className="w-10 h-10 rounded-full border border-ivory-300 dark:border-navy-700 flex items-center justify-center text-navy-700 dark:text-ivory-200 hover:bg-brass-500 hover:text-navy-900 hover:border-brass-500 dark:hover:bg-brass-300 dark:hover:text-navy-900 dark:hover:border-brass-300 transition-colors focus-ring"
              >
                <Facebook size={16} strokeWidth={1.75} />
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                aria-label="Adel Beach Resort on Instagram"
                className="w-10 h-10 rounded-full border border-ivory-300 dark:border-navy-700 flex items-center justify-center text-navy-700 dark:text-ivory-200 hover:bg-brass-500 hover:text-navy-900 hover:border-brass-500 dark:hover:bg-brass-300 dark:hover:text-navy-900 dark:hover:border-brass-300 transition-colors focus-ring"
              >
                <Instagram size={16} strokeWidth={1.75} />
              </a>
            </div>
          </StaggerItem>

          {/* Quick Links */}
          <StaggerItem className="md:col-span-2">
            <p className="eyebrow mb-5">Visit</p>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-500 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Accommodations */}
          <StaggerItem className="md:col-span-3">
            <p className="eyebrow mb-5">Rooms</p>
            <ul className="space-y-2.5">
              {accommodations.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-500 dark:text-ivory-200 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* Contact */}
          <StaggerItem className="md:col-span-3">
            <p className="eyebrow mb-5">Contact</p>
            <ul className="space-y-3 text-sm text-navy-500 dark:text-ivory-200">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} strokeWidth={1.5} className="mt-0.5 flex-shrink-0 text-brass-600 dark:text-brass-300" />
                <span>Adel Beach Resort,<br />Lawigan, Surigao Del Sur</span>
              </li>
              <li>
                <a
                  href="tel:09685361395"
                  className="flex items-center gap-2.5 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded"
                >
                  <Phone size={15} strokeWidth={1.5} className="text-brass-600 dark:text-brass-300" />
                  09685361395
                </a>
              </li>
              <li>
                <a
                  href="mailto:arnelarcos@adel-resort.ph"
                  className="flex items-center gap-2.5 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded"
                >
                  <Mail size={15} strokeWidth={1.5} className="text-brass-600 dark:text-brass-300" />
                  arnelarcos@adel-resort.ph
                </a>
              </li>
            </ul>
          </StaggerItem>
        </StaggerContainer>

        {/* Brass hairline + fine print */}
        <div className="mt-14 pt-6 border-t border-ivory-300 dark:border-navy-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-navy-300 dark:text-navy-300">
              &copy; {new Date().getFullYear()} Adel Beach Resort. All rights reserved.
            </p>
            <p className="text-navy-300 dark:text-navy-300 font-mono uppercase tracking-wider">
              v{process.env.NEXT_PUBLIC_APP_VERSION || '—'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
