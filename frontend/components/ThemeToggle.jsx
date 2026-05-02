'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '', variant = 'icon' }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const next = isDark ? 'light' : 'dark'

  const handleClick = () => setTheme(next)

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Switch to ${next} mode`}
        className={`flex items-center gap-2 w-full text-left text-sm font-medium py-2 text-fg-primary hover:text-accent transition-colors focus-ring rounded ${className}`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-transparent text-current hover:text-brass-500 dark:hover:text-brass-300 hover:border-brass-300 dark:hover:border-brass-700 transition-colors focus-ring ${className}`}
    >
      <span className="sr-only">Toggle theme</span>
      {!mounted ? (
        <span className="w-5 h-5" />
      ) : isDark ? (
        <Sun size={18} strokeWidth={1.75} />
      ) : (
        <Moon size={18} strokeWidth={1.75} />
      )}
    </button>
  )
}
