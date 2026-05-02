'use client'

import { useRef, useEffect, useState } from 'react'
import {
  motion,
  useInView,
  useReducedMotion,
  animate,
  AnimatePresence,
} from 'framer-motion'

const EDITORIAL_EASE = [0.2, 0.8, 0.2, 1]

// Fade + slide up on scroll into view
export function FadeInUp({ children, delay = 0, className = '', duration = 0.7, distance = 16 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Container that staggers children reveal
export function StaggerContainer({ children, className = '', stagger = 0.08, delayChildren = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView={reduce ? undefined : 'visible'}
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Child of StaggerContainer
export function StaggerItem({ children, className = '', distance = 16 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={
        reduce
          ? { hidden: {}, visible: {} }
          : {
              hidden: { opacity: 0, y: distance },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EDITORIAL_EASE } },
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated count-up number
export function CountUp({ end, duration = 2, prefix = '', suffix = '', decimals = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(`${prefix}${reduce ? Number(end).toFixed(decimals) : '0'}${suffix}`)

  useEffect(() => {
    if (!isInView) return
    if (reduce) {
      setDisplay(`${prefix}${Number(end).toFixed(decimals)}${suffix}`)
      return
    }

    const controls = animate(0, end, {
      duration,
      ease: EDITORIAL_EASE,
      onUpdate: (v) => {
        setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`)
      },
    })

    return () => controls.stop()
  }, [isInView, end, duration, prefix, suffix, decimals, reduce])

  return <span ref={ref}>{display}</span>
}

// Slow brass underline draw (used for subtle reveal accents)
export function BrassReveal({ className = '', delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      aria-hidden="true"
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={reduce ? undefined : { scaleX: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.9, ease: EDITORIAL_EASE, delay }}
      style={{ transformOrigin: 'left center' }}
      className={`block h-px bg-brass-500 dark:bg-brass-300 ${className}`}
    />
  )
}

export { motion, AnimatePresence, EDITORIAL_EASE }
