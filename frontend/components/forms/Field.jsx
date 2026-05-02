'use client'

import { useId, forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

const Field = forwardRef(function Field(
  {
    label,
    name,
    type = 'text',
    error,
    success,
    hint,
    required,
    className = '',
    rightSlot,
    ...inputProps
  },
  ref
) {
  const id = useId()
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  const stateClass = error
    ? 'input-error'
    : success
    ? 'input-success'
    : ''

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-brass-600 dark:text-brass-300 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          name={name}
          type={inputType}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`input ${stateClass} ${isPassword || rightSlot || error || success ? 'pr-11' : ''}`}
          {...inputProps}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {error && !isPassword && (
            <AlertCircle size={16} className="text-red-500" />
          )}
          {success && !isPassword && (
            <CheckCircle2 size={16} className="text-emerald-500" />
          )}
        </div>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-brass-600 dark:hover:text-brass-300 transition-colors focus-ring rounded p-0.5"
          >
            {showPw ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        )}
        {rightSlot && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" aria-live="polite" className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle size={12} strokeWidth={2} />
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-navy-300 dark:text-navy-300">
          {hint}
        </p>
      )}
    </div>
  )
})

export default Field
