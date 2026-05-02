'use client'

import { useMemo } from 'react'

function scorePassword(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 10) score++
  if (pw.length >= 14) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

const META = [
  { label: 'Too short', color: 'bg-red-500' },
  { label: 'Weak', color: 'bg-red-400' },
  { label: 'Fair', color: 'bg-amber-400' },
  { label: 'Strong', color: 'bg-emerald-400' },
  { label: 'Excellent', color: 'bg-emerald-500' },
]

export default function PasswordStrength({ password }) {
  const score = useMemo(() => scorePassword(password), [password])
  const meta = META[score]

  if (!password) return null

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
              i < Math.max(score, 1) ? meta.color : 'bg-ivory-300 dark:bg-navy-700'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-[11px] text-navy-500 dark:text-navy-300">
        Strength: <span className="font-semibold text-navy-900 dark:text-ivory-100">{meta.label}</span>
      </p>
    </div>
  )
}
