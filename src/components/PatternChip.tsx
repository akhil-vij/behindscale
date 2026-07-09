import { Link } from 'react-router-dom'

// Map of pattern category -> Tailwind class set. Each entry is a literal
// string so Tailwind's content scanner picks up every class even though
// the selection happens at runtime. Add new categories here as the
// pattern library grows.
//
// `performance` joined the ramp in the 2026-07-08 landing/navigation
// phase (docs/design-spec.md §2). `throughput` (volume/work-per-time)
// and `performance` (latency/response-time) are genuinely distinct
// pattern categories, so they get distinct colors -- consolidating
// them would erase a real distinction in the taxonomy.
const CATEGORY_CLASSES: Record<string, string> = {
  resilience: 'text-cat-blue border-cat-blue/30 bg-cat-blue/10',
  consistency: 'text-cat-purple border-cat-purple/30 bg-cat-purple/10',
  throughput: 'text-cat-green border-cat-green/30 bg-cat-green/10',
  performance: 'text-cat-orange border-cat-orange/30 bg-cat-orange/10',
  observability: 'text-cat-cyan border-cat-cyan/30 bg-cat-cyan/10',
}

const NEUTRAL_CLASSES =
  'text-text-secondary border-border-default bg-bg-surface'

const BASE_CLASSES =
  'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs leading-5 transition-colors hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'

interface PatternChipProps {
  slug: string
  name: string
  category?: string
}

export default function PatternChip({ slug, name, category }: PatternChipProps) {
  const variantClasses =
    (category && CATEGORY_CLASSES[category]) ?? NEUTRAL_CLASSES

  return (
    <Link to={`/patterns/${slug}`} className={`${BASE_CLASSES} ${variantClasses}`}>
      {name}
    </Link>
  )
}
