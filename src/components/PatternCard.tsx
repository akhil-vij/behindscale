import { Link } from 'react-router-dom'
import type { PatternDefinition } from '../types'
import { patternStats } from '../content'

interface PatternCardProps {
  pattern: PatternDefinition
}

export default function PatternCard({ pattern }: PatternCardProps) {
  const stats = patternStats.get(pattern.slug)
  const frequency = stats?.frequency ?? 0
  const sourceCount = stats?.sourceSlugs.length ?? 0
  const teaser = firstParagraph(pattern.definition)

  return (
    <Link
      id={`term-${pattern.slug}`}
      to={`/patterns/${pattern.slug}`}
      style={{ scrollMarginTop: '4.5rem' }}
      className="block rounded-xl border border-border-default bg-bg-surface p-5 transition-colors hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <h3 className="text-lg font-semibold tracking-tight text-text-primary">
        {pattern.name}
      </h3>
      {pattern.category && (
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-text-muted">
          {pattern.category}
        </p>
      )}
      <p className="mt-3 text-sm text-text-secondary">
        {formatFrequency(frequency, sourceCount)}
      </p>
      <p className="mt-3 line-clamp-2 leading-relaxed text-text-secondary">
        {teaser}
      </p>
    </Link>
  )
}

function firstParagraph(definition: string): string {
  return definition.split(/\n{2,}/)[0]?.trim() ?? ''
}

function formatFrequency(articles: number, sources: number): string {
  if (articles === 0) return 'Not yet seen in any article'
  const a = articles === 1 ? '1 article' : `${articles} articles`
  if (sources <= 0) return `Seen in ${a}`
  const s = sources === 1 ? '1 company' : `${sources} companies`
  return `Seen in ${a} across ${s}`
}
