export default function HairlineDivider({ className = '', variant = 'default', label }) {
  const tone = variant === 'brass' ? 'hairline-brass' : 'hairline'

  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className={`flex-1 ${tone}`} aria-hidden="true" />
        <span className="eyebrow">{label}</span>
        <span className={`flex-1 ${tone}`} aria-hidden="true" />
      </div>
    )
  }

  return <hr className={`${tone} border-0 border-t ${className}`} />
}
