import { Link } from 'react-router-dom'
import type { Source } from '../types'

interface SourceAttributionProps {
  source: Source
  publishedAt: string
  variant: 'card' | 'header'
  // Only meaningful for variant="header" -- the canonical URL of the
  // original article, surfaced as a "Read original" link.
  articleUrl?: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SourceAttribution({
  source,
  publishedAt,
  variant,
  articleUrl,
}: SourceAttributionProps) {
  if (variant === 'card') {
    // Compact eyebrow used on article cards (index) and pattern-detail
    // back-link cards. The source-name link uses the
    // /?source=<slug> URL shape locked in for Unit 6's source filter;
    // the query string is currently inert (no filter logic reads it
    // yet) and becomes effective when Unit 6 wires the filter on the
    // article index. No further changes to this component for Unit 6.
    return (
      <div className="font-mono text-xs uppercase tracking-wide text-text-muted">
        <Link
          to={`/?source=${source.slug}`}
          className="hover:text-text-primary transition-colors"
        >
          {source.name}
        </Link>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <span>{formatDate(publishedAt)}</span>
      </div>
    )
  }

  // header variant -- article page header row. External links open in a
  // new tab so the reader doesn't lose their place on the article.
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-text-primary transition-colors"
      >
        {source.name} <span aria-hidden="true">↗</span>
      </a>
      <span aria-hidden="true">·</span>
      <span>{formatDate(publishedAt)}</span>
      {articleUrl && (
        <>
          <span aria-hidden="true">·</span>
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            <span aria-hidden="true">↗ </span>Read original
          </a>
        </>
      )}
    </div>
  )
}
