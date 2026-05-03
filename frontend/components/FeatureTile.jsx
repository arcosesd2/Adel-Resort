'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from '@/components/motions'

export default function FeatureTile({
  image,
  alt,
  eyebrow,
  title,
  body,
  href,
  ctaLabel = 'Learn more',
  index = 0,
}) {
  const reduce = useReducedMotion()
  const initial = reduce ? false : { y: 30, opacity: 0 }

  return (
    <motion.div
      initial={initial}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay: reduce ? 0 : index * 0.1, ease: 'easeOut' }}
      className="group relative rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.18)] dark:shadow-[0_8px_32px_0_rgba(31,38,135,0.4)]"
    >
      <div className="relative aspect-[4/5] md:aspect-[3/4]">
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Dark-mode multiply tint, scoped to bg only */}
        <div className="absolute inset-0 bg-blue-900/30 mix-blend-multiply hidden dark:block" />
        {/* Bottom gradient for text legibility — both modes */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/85 via-blue-950/40 to-transparent dark:from-blue-950/90 dark:via-blue-950/50" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
        <p className="text-cyan-200 font-light tracking-[0.25em] text-[10px] uppercase mb-2">
          {eyebrow}
        </p>
        <h3 className="font-extralight text-2xl md:text-3xl text-white mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-blue-50/85 font-light text-sm leading-relaxed mb-4">
          {body}
        </p>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-blue-100 group-hover:text-white text-sm font-light tracking-wide transition-colors"
          >
            {ctaLabel}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </motion.div>
  )
}
