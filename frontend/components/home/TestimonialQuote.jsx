import { Star, BadgeCheck } from 'lucide-react'

export default function TestimonialQuote({ name, text, rating = 5, verified = true, location }) {
  return (
    <figure className="flex flex-col h-full">
      <div className="flex items-center gap-1 mb-5" aria-label={`${rating} out of 5 stars`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            strokeWidth={1.5}
            className={
              i < rating
                ? 'text-brass-500 dark:text-brass-300 fill-brass-500 dark:fill-brass-300'
                : 'text-ivory-300 dark:text-navy-700'
            }
          />
        ))}
      </div>

      <blockquote className="font-serif text-xl md:text-2xl leading-snug text-navy-900 dark:text-ivory-100 mb-6 flex-1">
        <span className="text-brass-500 dark:text-brass-300 mr-1" aria-hidden="true">&ldquo;</span>
        {text}
        <span className="text-brass-500 dark:text-brass-300 ml-1" aria-hidden="true">&rdquo;</span>
      </blockquote>

      <figcaption className="pt-5 border-t border-ivory-300 dark:border-navy-700">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-navy-900 dark:text-ivory-100">{name}</p>
            {location && (
              <p className="text-xs text-navy-300 dark:text-navy-300 mt-0.5">{location}</p>
            )}
          </div>
          {verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brass-50 dark:bg-brass-800/40 border border-brass-200 dark:border-brass-700 text-brass-700 dark:text-brass-300 text-[10px] font-semibold uppercase tracking-wider">
              <BadgeCheck size={11} strokeWidth={2.5} />
              Verified stay
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  )
}
