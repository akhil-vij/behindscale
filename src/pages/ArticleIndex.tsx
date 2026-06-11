import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Source } from '../types'
import { articles } from '../content'
import ArticleCard from '../components/ArticleCard'
import SourceFilterChip from '../components/SourceFilterChip'

// Source filter chips derive from articles[*].source, not from
// content/feeds.json. Realized-content principle (Unit 6 architecture
// decision): navigation surfaces filter by realized content;
// informational surfaces describe intended scope. A chip for a source
// the library hasn't covered yet would read as broken at small library
// sizes; content/feeds.json is the upstream truth for a future
// "Sources we track" page.
//
// Sort alphabetically by display name (deterministic). Count-based
// ordering creates visual jitter when a new article from a less-
// represented source reorders chips; iteration order isn't
// deterministic.
function uniqueSourcesByName(): Source[] {
  const seen = new Map<string, Source>()
  for (const article of articles) {
    if (!seen.has(article.source.slug)) {
      seen.set(article.source.slug, article.source)
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

export default function ArticleIndex() {
  const [searchParams] = useSearchParams()

  // Two-pass hydration (Unit 9, architecture.md Rendering section).
  // There is one dist/index.html for all source-filter arrivals;
  // SSG emits the unfiltered article list. To match that on first
  // paint -- and avoid React 18 hydration mismatches when a visitor
  // lands directly at /?source=foo via a shared link -- we read the
  // URL param in a useEffect rather than during render. First paint
  // matches the server-rendered unfiltered list; the filter resolves
  // immediately after mount.
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  useEffect(() => {
    setSourceFilter(searchParams.get('source'))
  }, [searchParams])

  const availableSources = useMemo(uniqueSourcesByName, [])

  const filtered = sourceFilter
    ? articles.filter((a) => a.source.slug === sourceFilter)
    : articles

  // Resolve filter slug -> display name for empty-state messaging.
  // Out-of-allowlist filters (e.g. ?source=garbage) fall through to
  // the raw slug -- invariant 6 (skip + flag, never crash).
  const activeSource = availableSources.find((s) => s.slug === sourceFilter)
  const filterLabel = activeSource?.name ?? sourceFilter ?? ''

  if (articles.length === 0) {
    return (
      <main className="max-w-[960px] mx-auto px-6 py-12">
        <p className="text-text-secondary">No articles yet.</p>
      </main>
    )
  }

  return (
    <main className="max-w-[960px] mx-auto px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <SourceFilterChip label="All" href="/" active={!sourceFilter} />
        {availableSources.map((source) => (
          <SourceFilterChip
            key={source.slug}
            label={source.name}
            href={`/?source=${source.slug}`}
            active={sourceFilter === source.slug}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary">
          No articles from {filterLabel} yet.{' '}
          <Link
            to="/"
            className="text-accent-primary hover:text-accent-hover underline underline-offset-2"
          >
            Show all articles
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {filtered.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
