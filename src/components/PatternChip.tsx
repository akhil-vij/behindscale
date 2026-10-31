import { Link } from 'react-router-dom'
import { patternCategoryById } from '../lib/patternCategories'

// A chip's colour comes from its category's entry in PATTERN_CATEGORIES
// (src/lib/patternCategories.ts), the same entry the /patterns listing
// dots read, so chips and dots always agree. `throughput`
// (volume/work-per-time) and `performance` (latency/response-time) are
// genuinely distinct categories, so they get distinct colors --
// consolidating them would erase a real distinction in the taxonomy.
// Uncategorized or unknown categories render neutral.
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
    (category && patternCategoryById.get(category)?.chipClass) || NEUTRAL_CLASSES

  return (
    <Link to={`/patterns/${slug}`} className={`${BASE_CLASSES} ${variantClasses}`}>
      {name}
    </Link>
  )
}
