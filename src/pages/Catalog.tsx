import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { articles, cruxtags, patternBySlug } from '../content'
import PatternChip from '../components/PatternChip'
import SourceAttribution from '../components/SourceAttribution'
import {
  catalogGroups,
  canonicalCompanies,
  companySourceSlugMap,
} from '../lib/catalogGroups'
import type { Article } from '../types'

// Catalog page: the browsable workbench. Grouped primarily by
// problem-class (cruxTag), count-desc; secondary axis = company
// filter; client-side search over title / company / source /
// cruxSummary / crux / cruxTag label / pattern names, with cruxTag
// matches surfaced as their own result group above article matches.
//
// Two-pass hydration for ?source= arrivals: SSG renders the
// unfiltered grouped catalog on first paint, then a useEffect reads
// the URL param and applies the filter. Same pattern the deleted
// ArticleIndex used -- see architecture.md Rendering section.
//
// Every group header carries `id="term-<slug>"` -- the same anchor is
// the target for (a) the article-page cruxTag chip's lateral link
// (Commit 7), (b) the landing preview's row link (Commit 5), and (c)
// the JSON-LD @id references (Commit 4 emits the taxonomy
// DefinedTermSet + CollectionPage; Commit 6 emits article-page
// TechArticle references by @id). One DOM anchor serving three jobs.

const MAX_CHIPS_PER_CARD = 3

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

interface SearchMatch {
  articleSlug: string
  score: number
}

// Weighted-substring search over the article's browse-surface fields.
// Weights are ordered by editorial signal strength: cruxSummary +
// title carry the most because those are what the reader sees on the
// card and what a search query usually names; company/source carry
// less (those already have their own filter chip); pattern names
// carry the least (a "shard" query should surface the sharding
// articles but not swamp them with every article that mentions a
// pattern in passing).
function articleMatchScore(article: Article, q: string): number {
  if (!q) return 1
  const summary = normalize(article.cruxSummary)
  const title = normalize(article.title)
  const crux = normalize(article.crux)
  const source = normalize(article.source.name)
  const company = normalize(article.source.company)
  const patternNames = article.patterns
    .map((p) => normalize(patternBySlug.get(p.slug)?.name ?? p.slug))
    .join(' ')

  let score = 0
  if (summary.includes(q)) score += 8
  if (title.includes(q)) score += 8
  if (company.includes(q)) score += 4
  if (source.includes(q)) score += 3
  if (crux.includes(q)) score += 3
  if (patternNames.includes(q)) score += 2
  return score
}

// Match a cruxTag *label* or *definition* against the query. When it
// matches, the entire group surfaces as its own result cluster above
// article matches -- search is a door into the taxonomy, not a text
// grep (spec §7).
function cruxTagMatches(
  slug: string,
  label: string,
  definition: string,
  q: string,
): boolean {
  if (!q) return false
  const nlab = normalize(label)
  const ndef = normalize(definition)
  const nslug = normalize(slug)
  return nlab.includes(q) || ndef.includes(q) || nslug.includes(q)
}

export default function Catalog() {
  const [searchParams] = useSearchParams()
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setSourceFilter(searchParams.get('source'))
  }, [searchParams])

  const companies = useMemo(() => canonicalCompanies(articles), [])
  const companySlug = useMemo(() => companySourceSlugMap(articles), [])

  // Filter the article set by the company chip, then by search.
  // Groups re-derive from the filtered set every render so counts +
  // SEEN AT rows stay honest against the current filter.
  const q = normalize(query)

  const companyFiltered = sourceFilter
    ? articles.filter((a) => a.source.slug === sourceFilter)
    : articles

  const matchedArticleSlugs = useMemo(() => {
    if (!q) return null
    const matches: SearchMatch[] = []
    for (const article of companyFiltered) {
      const score = articleMatchScore(article, q)
      if (score > 0) matches.push({ articleSlug: article.slug, score })
    }
    matches.sort((a, b) => b.score - a.score)
    return new Set(matches.map((m) => m.articleSlug))
  }, [q, companyFiltered])

  const filteredArticles = matchedArticleSlugs
    ? companyFiltered.filter((a) => matchedArticleSlugs.has(a.slug))
    : companyFiltered

  const groups = catalogGroups({
    articles: filteredArticles,
    registry: cruxtags,
  })

  const totalShown = filteredArticles.length
  const totalCount = articles.length

  // CruxTag-first matches: a query that hits a tag label/definition
  // surfaces the group as a top-of-list result cluster. Renders the
  // entire group unfiltered by the query (a taxonomy hit means the
  // reader wants to see everything in the class, not just the
  // article rows whose prose also happens to include the query).
  const taxonomyMatches = useMemo(() => {
    if (!q) return [] as string[]
    const hits: string[] = []
    for (const slug of Object.keys(cruxtags)) {
      const entry = cruxtags[slug]
      if (!entry) continue
      if (cruxTagMatches(slug, entry.label, entry.definition, q))
        hits.push(slug)
    }
    return hits
  }, [q])

  // For taxonomy-hit groups, re-derive without the query narrowing
  // (but keep the company filter respected).
  const taxonomyGroups = useMemo(() => {
    if (taxonomyMatches.length === 0) return [] as ReturnType<typeof catalogGroups>
    const hitSet = new Set(taxonomyMatches)
    return catalogGroups({
      articles: companyFiltered.filter((a) => hitSet.has(a.cruxTag)),
      registry: cruxtags,
    })
  }, [taxonomyMatches, companyFiltered])

  const hasResults = groups.length > 0 || taxonomyGroups.length > 0

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

      <div className="mb-8 flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search systems, companies, patterns</span>
          <SearchIcon />
          <input
            id="catalog-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search systems, companies, patterns…"
            className="w-full rounded-lg border border-border-default bg-bg-surface py-3 pl-11 pr-4 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-xs uppercase tracking-[0.10em] text-text-muted">
            Company
          </span>
          <FilterChip label="All" href="/catalog" active={!sourceFilter} />
          {companies.map((company) => {
            const slug = companySlug.get(company)
            if (!slug) return null
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

        <p className="font-mono text-xs text-text-muted">
          Showing {totalShown} of {totalCount} breakdowns across{' '}
          {groups.length} problem {groups.length === 1 ? 'class' : 'classes'}
          {taxonomyGroups.length > 0 && q
            ? ` (plus ${taxonomyGroups.length} taxonomy match${taxonomyGroups.length === 1 ? '' : 'es'})`
            : ''}
          .
        </p>
      </div>

      {hasResults ? (
        <div className="flex flex-col gap-14">
          {taxonomyGroups.length > 0 && (
            <section aria-labelledby="taxonomy-matches">
              <h2
                id="taxonomy-matches"
                className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-text-muted"
              >
                Problem-class matches
              </h2>
              <div className="flex flex-col gap-14">
                {taxonomyGroups.map((g) => (
                  <GroupSection key={`tax-${g.slug}`} group={g} />
                ))}
              </div>
            </section>
          )}
          {groups.map((g) => (
            <GroupSection key={g.slug} group={g} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
          <p className="font-mono text-sm text-text-secondary">
            No breakdowns match{' '}
            {query ? (
              <>
                “<span className="text-text-primary">{query}</span>”
              </>
            ) : (
              'this filter'
            )}
            {sourceFilter ? ` at ${sourceFilter}` : ''}.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSourceFilter(null)
            }}
            className="mt-3 font-mono text-xs text-accent-primary hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            clear filters
          </button>
        </div>
      )}
    </main>
  )
}

interface GroupSectionProps {
  group: {
    slug: string
    label: string
    definition: string
    count: number
    companies: readonly string[]
    articles: readonly Article[]
  }
}

function GroupSection({ group }: GroupSectionProps) {
  const anchorId = `term-${group.slug}`
  return (
    <section aria-labelledby={`${anchorId}-heading`}>
      <div
        id={anchorId}
        className="mb-5 border-t-2 border-text-primary pt-4"
        style={{ scrollMarginTop: '4.5rem' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2
            id={`${anchorId}-heading`}
            className="font-serif text-[clamp(1.4rem,2.6vw,1.75rem)] font-semibold leading-tight tracking-[-0.015em] text-text-primary"
          >
            {group.label}
          </h2>
          <span className="whitespace-nowrap font-mono text-xs text-text-muted">
            {group.count} {group.count === 1 ? 'system' : 'systems'}
          </span>
        </div>
        {group.definition && (
          <p className="mt-2 max-w-3xl text-[0.96rem] leading-relaxed text-text-secondary">
            {group.definition}
          </p>
        )}
        {group.companies.length > 0 && (
          <div className="mt-2 font-mono text-xs text-cat-amber">
            SEEN AT {group.companies.join(' · ')}
          </div>
        )}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4">
        {group.articles.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  )
}

interface ArticleCardProps {
  article: Article
}

function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5 transition-shadow hover:border-border-strong hover:shadow-md">
      <SourceAttribution
        source={article.source}
        publishedAt={article.publishedAt}
        variant="card"
      />
      <h3 className="font-serif text-xl font-semibold leading-tight tracking-tight">
        <Link
          to={`/articles/${article.slug}`}
          className="text-text-primary transition-colors hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          {article.title}
        </Link>
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {article.cruxSummary}
      </p>
      {article.patterns.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {article.patterns.slice(0, MAX_CHIPS_PER_CARD).map((ref) => {
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
