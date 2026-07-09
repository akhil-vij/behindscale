import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { articles, patternBySlug } from '../content'
import PatternChip from './../components/PatternChip'
import SourceAttribution from './../components/SourceAttribution'

// Catalog page scaffold. Full grouping logic + client-side search + the
// JSON-LD CollectionPage + DefinedTermSet + the id="term-<slug>" anchors
// land in Commit 4 (via src/lib/catalogGroups.ts, the pure grouping
// module used by both this page and the landing preview).
//
// This commit's job is to establish the route + a real prerendered body
// (an unfiltered card list, source-filter chips derived from canonical
// source.company, no-hydration-shift on ?source= arrivals). It preserves
// every affordance the old /-hosted ArticleIndex.tsx had -- the
// verify-then-delete guardrail from the plan requires the catalog be a
// genuine superset of the old index before ArticleIndex is removed.
//
// Two-pass hydration (same pattern the old ArticleIndex used): SSG
// renders the unfiltered list; ?source= arrivals apply the filter from
// state set in a useEffect immediately after mount, so the hydrated DOM
// matches the server-rendered DOM on first paint. Client-side search
// (Commit 4) narrows further after mount.

function uniqueCompaniesCanonical(): string[] {
  const seen = new Set<string>()
  for (const article of articles) seen.add(article.source.company)
  return Array.from(seen).sort()
}

export default function Catalog() {
  const [searchParams] = useSearchParams()
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  useEffect(() => {
    setSourceFilter(searchParams.get('source'))
  }, [searchParams])

  const availableCompanies = useMemo(uniqueCompaniesCanonical, [])

  const filtered = sourceFilter
    ? articles.filter((a) => a.source.slug === sourceFilter)
    : articles

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-12">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-block h-[2px] w-6 bg-brand-gold" />
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
            The catalog
          </span>
        </div>
        <h1 className="mb-3 font-serif text-[clamp(1.9rem,3.6vw,2.6rem)] font-medium leading-tight tracking-tight text-text-primary">
          Browse by problem class.
        </h1>
        <p className="max-w-2xl text-text-secondary">
          Grouped by the crux — the bottleneck that made each system hard.
          Filter by company to see who else hit the same wall.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs uppercase tracking-[0.10em] text-text-muted">
          Company
        </span>
        <FilterChip label="All" href="/catalog" active={!sourceFilter} />
        {availableCompanies.map((company) => {
          const article = articles.find((a) => a.source.company === company)
          if (!article) return null
          const slug = article.source.slug
          return (
            <FilterChip
              key={slug}
              label={company}
              href={`/catalog?source=${slug}`}
              active={sourceFilter === slug}
            />
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
          <p className="font-mono text-sm text-text-secondary">
            No breakdowns match this filter.
          </p>
          <Link
            to="/catalog"
            className="mt-3 inline-block font-mono text-xs text-accent-primary hover:text-accent-hover"
          >
            clear filters
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4">
          {filtered.map((article) => (
            <li key={article.slug}>
              <article className="flex h-full flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5 transition-shadow hover:border-border-strong hover:shadow-md">
                <SourceAttribution
                  source={article.source}
                  publishedAt={article.publishedAt}
                  variant="card"
                />
                <h2 className="font-serif text-xl font-semibold leading-tight tracking-tight">
                  <Link
                    to={`/articles/${article.slug}`}
                    className="text-text-primary transition-colors hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {article.cruxSummary}
                </p>
                {article.patterns.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {article.patterns.slice(0, 3).map((ref) => {
                      const def = patternBySlug.get(ref.slug)
                      return (
                        <PatternChip
                          key={ref.slug}
                          slug={ref.slug}
                          name={def?.name ?? ref.slug}
                          category={def?.category}
                        />
                      )
                    })}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

interface FilterChipProps {
  label: string
  href: string
  active: boolean
}

function FilterChip({ label, href, active }: FilterChipProps) {
  return (
    <Link
      to={href}
      className={
        active
          ? 'rounded-md border border-text-primary bg-text-primary px-3 py-1.5 font-mono text-xs text-bg-base'
          : 'rounded-md border border-border-default bg-bg-surface px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary'
      }
    >
      {label}
    </Link>
  )
}
