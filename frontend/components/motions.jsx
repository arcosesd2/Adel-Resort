'use client'

import { useRef, useEffect, useState } from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion'

// Fade + slide up on scroll into view
export function FadeInUp({ children, delay = 0, className = '', duration = 0.6 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Container that staggers children reveal
export function StaggerContainer({ children, className = '', stagger = 0.1 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Child of StaggerContainer
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
      }}
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
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    if (!isInView) return

    const controls = animate(0, end, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`)
      },
    })

    return () => controls.stop()
  }, [isInView, end, duration, prefix, suffix, decimals])

  return <span ref={ref}>{display}</span>
}

export { motion, AnimatePresence, useReducedMotion }
