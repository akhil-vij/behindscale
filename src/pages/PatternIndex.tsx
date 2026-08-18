import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { patterns, patternStats } from '../content'
import {
  PATTERN_CATEGORIES,
  patternCategoryById,
} from '../lib/patternCategories'

// /patterns listing page (nav-IA rebuild). Category-grouped browsing with
// evidence, client-side search + single-select category filter, over the FULL
// 52-pattern set. The complete grouped list renders server-side (prerender) so
// crawlers and no-JS readers get everything; search/filter layer on top after
// hydration. URL state (?q=, ?category=) makes filtered views shareable.
//
// Derive-or-die: evidence (breakdown count + distinct companies) comes from the
// full article<->pattern relations via patternStats, never a display cap.
// Category comes from the registry; the five glosses/colours are UI copy in
// src/lib/patternCategories.ts. Slugs are the registry slug (never name-derived).

interface PatternView {
  slug: string
  name: string
  category: string
  oneLine: string
  frequency: number
  companies: readonly string[] // alphabetical, distinct
  aliases: readonly string[] // lowercase
  corpus: string // precomputed lowercase search haystack
}

// Search normalization: lowercase and fold every run of non-alphanumerics to a
// single space, applied to BOTH corpus and query. Keeps the "substring is
// sufficient" model but makes it punctuation-insensitive, so "exactly-once"
// and "exactly once" are the same query. This is required to reconcile the
// approved verbatim glosses (which write "exactly once") with the must-pass
// hyphenated queries ("exactly-once") — and it makes recall robust to how a
// reader hyphenates ("rate-limiting" vs "rate limiting", "at-least-once", ...).
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// First sentence of the definition (strip any figure markers first). The card's
// one-line definition and search corpus layer 1.
function oneLineOf(definition: string): string {
  const clean = definition
    .replace(/\{\{figure:[^}]+\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const m = clean.match(/^(.*?[.!?])(?:\s|$)/)
  return (m ? m[1] : clean).trim()
}

function buildViews(): PatternView[] {
  return patterns.map((p) => {
    const stats = patternStats.get(p.slug)
    const companies = [...(stats?.companies ?? [])].sort((a, b) =>
      a.localeCompare(b),
    )
    const oneLine = oneLineOf(p.definition)
    const aliases = p.aliases ?? []
    const cat = patternCategoryById.get(p.category ?? '')
    // Three-layer corpus (case-insensitive substring):
    //   1 name + one-line definition · 2 category label + gloss · 3 companies + aliases
    const corpus = normalize(
      [p.name, oneLine, cat?.label ?? '', cat?.gloss ?? '', ...companies, ...aliases].join(
        ' ',
      ),
    )
    return {
      slug: p.slug,
      name: p.name,
      category: p.category ?? '',
      oneLine,
      frequency: stats?.frequency ?? 0,
      companies,
      aliases,
      corpus,
    }
  })
}

export default function PatternIndex() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')

  // Read initial URL state once, post-hydration (SSR renders the unfiltered
  // full list; this must not change the first client render).
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setQuery(q)
    const c = searchParams.get('category')
    if (c && patternCategoryById.has(c)) setCat(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const views = useMemo(buildViews, [])

  // Unfiltered per-category totals for the chip counts (never narrow under
  // search/filter — the result line reflects active state instead).
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const v of views) totals.set(v.category, (totals.get(v.category) ?? 0) + 1)
    return totals
  }, [views])

  const q = normalize(query)

  const groups = useMemo(() => {
    const built = PATTERN_CATEGORIES.map((meta, order) => {
      const members = views
        .filter((v) => v.category === meta.id)
        .filter((v) => cat === 'All' || v.category === cat)
        .filter((v) => q === '' || v.corpus.includes(q))
        .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
      const uses = members.reduce((n, v) => n + v.frequency, 0)
      return { meta, order, members, count: members.length, uses }
    }).filter((g) => g.count > 0)
    // Group order: pattern-count descending, canonical order as tie-break.
    built.sort((a, b) => b.count - a.count || a.order - b.order)
    return built
  }, [views, q, cat])

  const shownCount = groups.reduce((n, g) => n + g.count, 0)
  const totalCount = views.length
  const shownCats = groups.length

  function applyUrl(nextQuery: string, nextCat: string) {
    const p = new URLSearchParams()
    if (nextQuery.trim()) p.set('q', nextQuery)
    if (nextCat !== 'All') p.set('category', nextCat)
    setSearchParams(p, { replace: true })
  }
  const onSearch = (v: string) => {
    setQuery(v)
    applyUrl(v, cat)
  }
  const onCat = (c: string) => {
    setCat(c)
    applyUrl(query, c)
  }
  const clearAll = () => {
    setQuery('')
    setCat('All')
    applyUrl('', 'All')
  }

  const activeCatLabel =
    cat !== 'All' ? patternCategoryById.get(cat)?.label ?? cat : null
  const crossHref = `/problems?q=${encodeURIComponent(query.trim())}`

  return (
    <main className="mx-auto max-w-[1020px] px-5 pt-10 pb-[72px]">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
        Patterns
      </p>
      <h1 className="mt-2.5 text-3xl font-bold leading-tight tracking-tight text-text-primary">
        System Design Patterns, grouped by the job they do.
      </h1>
      <p className="mt-2.5 max-w-2xl text-text-secondary">
        Five groups, one per job. Every pattern shows where it&apos;s actually
        used - the breakdowns it appears in and the companies running it.
        Nothing is listed without a real system behind it.
      </p>

      {/* Controls */}
      <div className="mt-6 mb-8 flex flex-col gap-3.5">
        <label className="relative block">
          <span className="sr-only">Search patterns, concepts, companies</span>
          <SearchIcon />
          <input
            id="patterns-search"
            type="text"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search patterns, concepts, companies"
            className="w-full rounded-[10px] border border-border-default bg-bg-surface py-3 pl-10 pr-4 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Category
          </span>
          <CategoryChip
            label="All"
            count={totalCount}
            active={cat === 'All'}
            onClick={() => onCat('All')}
          />
          {PATTERN_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.label}
              count={categoryTotals.get(c.id) ?? 0}
              dotClass={c.dotClass}
              active={cat === c.id}
              onClick={() => onCat(c.id)}
            />
          ))}
        </div>

        <p className="font-mono text-xs text-text-muted">
          Showing {shownCount} of {totalCount} patterns across {shownCats}{' '}
          {shownCats === 1 ? 'category' : 'categories'}.
        </p>
      </div>

      {shownCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong px-5 py-14 text-center">
          <p className="font-mono text-[13px] text-text-secondary">
            No patterns match{' '}
            <span className="text-text-primary">&ldquo;{query}&rdquo;</span>
            {activeCatLabel ? ` in ${activeCatLabel}` : ''}.
          </p>
          <div className="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2.5">
            <Link
              to={crossHref}
              className="font-mono text-xs font-medium text-accent-primary hover:text-accent-hover"
            >
              Search the problems instead →
            </Link>
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer border-none bg-transparent font-mono text-xs text-accent-primary hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[46px]">
          {groups.map((g) => (
            <section key={g.meta.id} id={`cat-${g.meta.id}`}>
              <div className="mb-4 border-t-2 border-text-primary pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3.5">
                  <h2 className="m-0 flex items-center gap-2.5 text-[22px] font-semibold tracking-tight text-text-primary">
                    <span
                      className={`h-2.5 w-2.5 flex-none rounded-full ${g.meta.dotClass}`}
                      aria-hidden="true"
                    />
                    {g.meta.label}
                  </h2>
                  <span className="whitespace-nowrap font-mono text-[11.5px] text-text-muted">
                    {g.count} {g.count === 1 ? 'PATTERN' : 'PATTERNS'} · {g.uses}{' '}
                    USES
                  </span>
                </div>
                <p className="mt-1.5 max-w-[56em] text-[15px] leading-relaxed text-text-secondary">
                  {g.meta.gloss}
                </p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
                {g.members.map((v) => (
                  <PatternListCard key={v.slug} view={v} query={q} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

function PatternListCard({ view, query }: { view: PatternView; query: string }) {
  // Matched-alias line: only when the query hit an alias but NOT the name.
  // `query` here is already normalized; fold the name/aliases the same way.
  const aliasHit =
    query && !normalize(view.name).includes(query)
      ? view.aliases.find((a) => normalize(a).includes(query))
      : undefined

  const shown = view.companies.slice(0, 4).map((c) => c.toUpperCase())
  const overflow = view.companies.length - shown.length
  const seenAt =
    shown.join(' · ') + (overflow > 0 ? ` +${overflow}` : '')

  return (
    <Link
      id={`term-${view.slug}`}
      to={`/patterns/${view.slug}`}
      style={{ scrollMarginTop: '4.5rem' }}
      className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-surface p-4 text-text-primary no-underline transition-[box-shadow,border-color] hover:border-border-strong hover:no-underline hover:shadow-[0_8px_24px_-14px_rgba(26,26,31,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-mono text-[13.5px] font-medium tracking-tight text-text-primary">
          {view.name}
        </span>
        <span className="whitespace-nowrap font-mono text-[10.5px] text-text-muted">
          {view.frequency} {view.frequency === 1 ? 'BREAKDOWN' : 'BREAKDOWNS'}
        </span>
      </div>
      {view.oneLine && (
        <span className="text-sm leading-relaxed text-text-secondary">
          {view.oneLine}
        </span>
      )}
      {aliasHit && (
        <span className="font-mono text-[10.5px] text-text-muted">
          matches: <span className="text-text-primary">{aliasHit}</span>
        </span>
      )}
      {seenAt && (
        <span className="font-mono text-[11px] leading-relaxed tracking-[0.03em] text-cat-amber">
          SEEN AT {seenAt}
        </span>
      )}
    </Link>
  )
}

function CategoryChip({
  label,
  count,
  dotClass,
  active,
  onClick,
}: {
  label: string
  count: number
  dotClass?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary sm:min-h-0 ${
        active
          ? 'border-text-primary bg-text-primary text-bg-base'
          : 'border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary'
      }`}
    >
      {dotClass && (
        <span
          className={`h-[7px] w-[7px] flex-none rounded-full ${dotClass}`}
          aria-hidden="true"
        />
      )}
      {label} ({count})
    </button>
  )
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
