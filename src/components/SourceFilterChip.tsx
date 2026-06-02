import { Link } from 'react-router-dom'

// Filter chip on the article index. Two visual states: active (filled,
// the current filter) and inactive (border-only, click to apply).
// The "All" chip is the cleared state; its href is "/" and it's
// active when no ?source param is set.
//
// Visual is intentionally distinct from PatternChip -- pattern chips
// are tagging surfaces (rounded-md, monospace, category color); source
// filter chips are toggleable controls (same shape vocabulary, but
// switched on background+text intensity instead of hue, and use the
// accent-primary brand color when active).

const BASE_CLASSES =
  'inline-flex items-center rounded-md border px-3 py-1 font-mono text-xs leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'

const ACTIVE_CLASSES =
  'border-accent-primary bg-accent-primary text-white hover:bg-accent-hover'

const INACTIVE_CLASSES =
  'border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary'

interface SourceFilterChipProps {
  label: string
  href: string
  active: boolean
}

export default function SourceFilterChip({
  label,
  href,
  active,
}: SourceFilterChipProps) {
  return (
    <Link
      to={href}
      aria-pressed={active}
      className={`${BASE_CLASSES} ${active ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
    >
      {label}
    </Link>
  )
}
