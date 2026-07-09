import { Link } from 'react-router-dom'
import { articles } from '../content'

// Landing page scaffold. Full content -- the dark-in-light seam hero
// frame, the trust band, the top-3 problem-class preview reusing the
// catalog grouping module, the derived-count CTA -- lands in Commit 5
// alongside the JSON-LD WebSite/Organization/SearchAction. This
// commit's job is only to establish the route + a real crawlable
// text body (so /'s prerendered dist/index.html carries something
// meaningful the moment the route swap is live) and let the SSG
// pipeline emit `dist/index.html` with correct head tags.
//
// The /`s new role: conversion landing (billboard, no filters). The
// old article-index behavior moved to `/catalog`.
//
// Deliberately no <input> search element on this page -- the search
// affordance lives only on /catalog per design-spec §3 and the
// no-search-on-landing acceptance criterion (spec §11 #2).

export default function Landing() {
  const articleCount = articles.length

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          System design, dissected
        </p>
        <h1 className="mb-6 font-serif text-[clamp(2.4rem,5.2vw,3.7rem)] font-medium leading-[1.03] tracking-[-0.02em] text-text-primary">
          Real systems, taken apart down to the{' '}
          <em className="italic underline decoration-brand-gold decoration-[2px] underline-offset-[6px]">
            one bottleneck
          </em>{' '}
          that defines them.
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-text-secondary">
          behindscale dissects top engineering blog posts into structured
          summaries and interactive artifacts you can break. Every article
          names its crux — the bottleneck that made the problem hard — and
          groups with every other system that hit the same wall.
        </p>
        <div className="mt-10">
          <Link
            to="/catalog"
            className="inline-block rounded-md bg-text-primary px-6 py-3 font-mono text-sm text-bg-base transition-colors hover:bg-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
          >
            Browse all {articleCount} breakdowns →
          </Link>
        </div>
      </div>
    </main>
  )
}
