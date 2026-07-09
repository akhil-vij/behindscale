import { Link } from 'react-router-dom'
import { articles, feeds } from '../content'

// The /sources page: the visible, verifiable record of behindscale's
// invariant-7 sourcing policy (official engineering blogs only, no
// aggregators, no third-party summaries). Added 2026-07-09 as a
// trust artifact -- a skeptical reader can click through, see the
// real first-party blogs each dissection comes from, and know
// exactly what they're getting. Same signal helps the AI-citability
// bet: an explicit, machine-readable enumeration of authoritative
// provenance is stronger than an implicit one.
//
// SSG-rendered like every other route; the sources list is the
// content, so it lives in the served HTML on first byte (invariant
// 1 + SEO tier-2). Reads content/feeds.json (the source allowlist,
// canonical for both pipeline discovery and the site) and derives
// per-source article counts from the article set. No new content
// authoring -- the list already exists.
//
// Scope is deliberately narrow: it's a list, not a manifesto. One
// line stating the policy, then the entries. No editorial per
// source, no descriptions of individual blogs.

interface SourceRow {
  name: string
  company: string
  url: string
  slug: string
  articleCount: number
}

function buildRows(): SourceRow[] {
  const counts = new Map<string, number>()
  for (const article of articles) {
    counts.set(article.source.slug, (counts.get(article.source.slug) ?? 0) + 1)
  }
  const rows: SourceRow[] = feeds.map((feed) => ({
    name: feed.name,
    company: feed.company,
    url: feed.url,
    slug: feed.slug,
    articleCount: counts.get(feed.slug) ?? 0,
  }))
  // Sort alphabetically by company for a stable, scannable order --
  // matches the trust band ordering on the landing page.
  rows.sort((a, b) => a.company.localeCompare(b.company))
  return rows
}

export default function Sources() {
  const rows = buildRows()
  const totalArticles = articles.length
  const totalCovered = rows.filter((r) => r.articleCount > 0).length

  return (
    <main className="mx-auto max-w-[880px] px-6 py-12">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-block h-[2px] w-6 bg-brand-gold" />
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
            Sources
          </span>
        </div>
        <h1 className="mb-3 font-serif text-[clamp(1.9rem,3.6vw,2.6rem)] font-medium leading-tight tracking-tight text-text-primary">
          Where every dissection comes from.
        </h1>
        <p className="max-w-2xl leading-relaxed text-text-secondary">
          Every dissection on behindscale is drawn from the official
          engineering blog of the company that built the system — no
          aggregators, no third-party summaries. The full source allowlist:
        </p>
      </div>

      <ul className="flex list-none flex-col divide-y divide-border-default border-y border-border-default">
        {rows.map((row) => (
          <li
            key={row.slug}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-serif text-lg font-semibold tracking-tight text-text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent-primary hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                {row.name}
              </a>
              <span className="font-mono text-xs uppercase tracking-wide text-text-muted">
                {row.company}
              </span>
            </div>
            <ArticleCountBadge count={row.articleCount} slug={row.slug} />
          </li>
        ))}
      </ul>

      <p className="mt-8 font-mono text-xs text-text-muted">
        {totalArticles} dissections across {totalCovered} of {rows.length}{' '}
        allowlisted sources.
      </p>
    </main>
  )
}

function ArticleCountBadge({ count, slug }: { count: number; slug: string }) {
  if (count === 0) {
    return (
      <span className="font-mono text-xs text-text-muted">
        No dissections yet
      </span>
    )
  }
  const label =
    count === 1 ? '1 dissection' : `${count} dissections`
  return (
    <Link
      to={`/catalog?source=${slug}`}
      className="font-mono text-xs text-text-secondary underline decoration-border-default underline-offset-4 transition-colors hover:decoration-accent-primary hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      {label} →
    </Link>
  )
}
