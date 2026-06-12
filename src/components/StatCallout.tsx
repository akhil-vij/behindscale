import type { ArticleStat } from '../types'

// Unit 10. Pull-stat callouts. Renders a row of up to 3 stats for a
// single placement section (problem / solution / tradeoffs). Editorial
// constraints (max 3, value-must-appear-in-prose) are enforced by the
// `stats-value-in-prose` validator check, not this component.

interface StatsRowProps {
  stats: ArticleStat[]
}

export default function StatsRow({ stats }: StatsRowProps) {
  if (stats.length === 0) return null
  return (
    <div className="mt-6 flex flex-wrap gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex-1 min-w-[180px] rounded-lg border-l-4 border-l-accent-primary bg-bg-subtle px-5 py-4"
        >
          <div className="font-mono text-3xl font-semibold text-text-primary">
            {stat.value}
          </div>
          <div className="mt-1 font-sans text-sm text-text-secondary">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
