'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=85'
const EASE = [0.2, 0.8, 0.2, 1]

export default function SplitLayout({
  children,
  imageSrc = DEFAULT_IMAGE,
  imageAlt = 'Adel Beach Resort',
  eyebrow,
  caption,
  reverse = false,
}) {
  const reduce = useReducedMotion()

  const image = (
    <div className="relative bg-navy-900 hidden md:block">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        sizes="50vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-navy-950/85 via-navy-900/55 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-10 lg:p-14 text-ivory-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-serif text-lg tracking-tight focus-ring rounded"
        >
          <Image src="/logo.png" alt="" width={36} height={36} className="object-contain brightness-0 invert opacity-90" />
          Adel Beach Resort
        </Link>
        {(eyebrow || caption) && (
          <div className="max-w-md">
            {eyebrow && (
              <p className="text-brass-300 text-xs font-semibold uppercase tracking-eyebrow mb-4 flex items-center gap-3">
                <span className="inline-block w-8 h-px bg-brass-300" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            {caption && (
              <p className="font-serif text-2xl lg:text-3xl leading-snug tracking-tight text-shadow-hero">
                {caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const form = (
    <div className="flex flex-col min-h-screen md:min-h-0 bg-ivory-100 dark:bg-navy-950">
      {/* Mobile header strip */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-ivory-300 dark:border-navy-700 bg-white dark:bg-navy-900">
        <Link href="/" className="flex items-center gap-2 font-serif text-base tracking-tight text-navy-900 dark:text-ivory-100">
          <Image src="/logo.png" alt="" width={28} height={28} className="object-contain" />
          Adel Beach Resort
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 md:py-16 lg:py-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pt-16 grid md:grid-cols-2 bg-ivory-100 dark:bg-navy-950">
      {reverse ? (
        <>
          {form}
          {image}
        </>
      ) : (
        <>
          {image}
          {form}
        </>
      )}
    </div>
  )
}
