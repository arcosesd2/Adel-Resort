'use client'

import { FadeInUp, StaggerContainer, StaggerItem, CountUp } from '@/components/motions'

export default function EditorialStats({ stats, eyebrow = 'In numbers', heading = 'Years on the shore.' }) {
  if (!stats?.length) return null

  return (
    <section className="bg-ivory-100 dark:bg-navy-950 py-20 md:py-28 border-y border-ivory-300 dark:border-navy-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInUp className="max-w-2xl mb-12 md:mb-16">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h2 className="font-serif text-3xl md:text-5xl text-navy-900 dark:text-ivory-100 leading-tight">
            {heading}
          </h2>
        </FadeInUp>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 divide-x divide-ivory-300 dark:divide-navy-700 border-y border-ivory-300 dark:border-navy-700">
          {stats.map(({ end, suffix, label, decimals }) => (
            <StaggerItem
              key={label}
              className="px-4 md:px-6 py-8 md:py-10 first:pl-0 last:pr-0"
            >
              <p className="font-serif text-5xl md:text-6xl lg:text-7xl text-navy-900 dark:text-ivory-100 leading-none mb-3 tracking-tight">
                <CountUp end={end} suffix={suffix || ''} decimals={decimals || 0} />
              </p>
              <p className="text-xs uppercase tracking-eyebrow font-semibold text-brass-600 dark:text-brass-300">
                {label}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
