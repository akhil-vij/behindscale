import { Component } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { articles, cruxtags } from '../content'
import { canonicalCompanies, catalogGroups } from '../lib/catalogGroups'

// Landing page: the conversion billboard. Structure (design-spec §3):
//
//   Hero (two-col, wraps text-first-then-artifact on narrow screens)
//     └── Left: eyebrow + Newsreader H1 (italic-gold-underline crux
//         emphasis) + crawlable lede
//     └── Right: dark-in-light seam frame around the sandboxed iframe
//         at /artifacts/_hero/index.html, with a light caption bar
//         above and hint below
//   Trust band (#F4F2EE) — DISSECTED FROM FIRST-PARTY BLOGS + 12
//     canonical company wordmarks
//   Catalog preview — top-3 multi-company problem-classes, each row
//     linking to /catalog#term-<slug>
//   CTA — "Browse all N breakdowns →" (N derived at build time)
//   Footer — wordmark + Catalog / Patterns / Sources + FIRST-PARTY
//
// No <input> element anywhere on this page (acceptance criterion #2).
// The Navbar Search button navigates to /catalog and focuses the
// catalog's #catalog-search input.
//
// Isolation: an ErrorBoundary wraps the iframe. A boundary failure
// renders the caption + a muted "unavailable" message so the landing
// still reads normally. The iframe's own load failure is invisible to
// the parent (the sandboxed frame has opaque origin so a load error
// there doesn't reach the boundary) -- for that path we accept the
// same "muted frame" outcome the article artifact embed uses.

const HERO_IFRAME_PATH = '/artifacts/_hero/index.html'
const HERO_IFRAME_HEIGHT_PX = 560

export default function Landing() {
  const articleCount = articles.length
  const companies = canonicalCompanies(articles)

  // Recurring problem-classes for the catalog preview: every group
  // whose crux has landed on two or more companies. Reuses the same
  // grouping module the catalog uses -- if the sort changes there,
  // the preview follows automatically. Filter to count >= 2
  // (multi-company classes only; the cross-company payoff is the
  // point of the preview and the point of the "Bottlenecks that show
  // up more than once" header, which asserts completeness). If the
  // list grows past what fits above the fold on a target viewport,
  // the fix is not to truncate silently -- it's to either land the
  // recurrence in the catalog directly or cap-and-signal the header
  // deliberately. Not a problem today at 4 groups; revisit at 6+.
  const preview = catalogGroups({
    articles,
    registry: cruxtags,
  }).filter((g) => g.count >= 2)

  return (
    <main>
      <Hero />
      <TrustBand companies={companies} />
      <PreviewSection preview={preview} />
      <CtaSection articleCount={articleCount} />
      <Footer />
    </main>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-16 lg:pt-20">
      <div className="flex flex-wrap items-center gap-12">
        <div className="w-full basis-full lg:flex-1 lg:basis-0 lg:min-w-[380px]">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
            System design, dissected
          </p>
          <h1 className="mb-6 font-serif text-[clamp(2.4rem,5.2vw,3.7rem)] font-medium leading-[1.03] tracking-[-0.02em] text-text-primary">
            Real systems, taken apart down to the{' '}
            <em className="italic underline decoration-brand-gold decoration-[2px] underline-offset-[6px]">
              one bottleneck
            </em>{' '}
            that defines them.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-text-secondary">
            behindscale dissects top engineering blog posts into structured
            summaries and interactive artifacts you can break. Every article
            names its <em className="not-italic font-medium">crux</em> — the
            bottleneck that made the problem hard — and groups with every
            other system that hit the same wall.
          </p>
        </div>
        <div className="w-full basis-full lg:flex-[1.15] lg:basis-0 lg:min-w-[380px]">
          <HeroArtifactFrame />
        </div>
      </div>
    </section>
  )
}

function HeroArtifactFrame() {
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: '#30a46c' }}
          aria-hidden="true"
        />
        Live artifact · Priority-blind load shedding
      </div>
      <HeroErrorBoundary>
        <div
          className="relative rounded-[14px]"
          style={{
            /* Dark-in-light seam per design-spec §4:
               - gold hairline ring (outermost 1px)
               - floating jewel shadow (main lift)
               - gold underglow (soft radial below the frame) */
            boxShadow: [
              '0 0 0 1px rgba(245, 184, 65, 0.22)',
              '0 34px 70px -28px rgba(11, 13, 18, 0.55)',
              '0 2px 4px rgba(11, 13, 18, 0.12)',
            ].join(', '),
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 bottom-[-28px] h-[64px] rounded-full"
            style={{
              background: 'rgba(245, 184, 65, 0.22)',
              filter: 'blur(34px)',
            }}
          />
          <iframe
            src={HERO_IFRAME_PATH}
            sandbox="allow-scripts"
            title="Priority-blind load shedding — interactive demo"
            className="relative block w-full rounded-[14px] border-0"
            style={{ height: `${HERO_IFRAME_HEIGHT_PX}px` }}
          />
        </div>
      </HeroErrorBoundary>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        Drag TRAFFIC past capacity, then flip SHED SMART — watch payments hold
        while batch jobs get shed first.
      </p>
    </div>
  )
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Parent-side ErrorBoundary. The iframe itself runs in a sandbox with an
// opaque origin, so a *render* exception inside the artifact bundle is
// caught by the bundle's own ErrorBoundary (injected by
// scripts/compile-artifacts.ts) -- the parent never sees it. What THIS
// boundary catches is a React exception thrown by the wrapper markup
// (e.g. a runtime bug in the frame styling). Belt-and-suspenders: a
// broken hero should never break the landing page's other sections.
class HeroErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[hero] wrapper render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center rounded-[14px] border border-art-border bg-art-bg"
          style={{ minHeight: `${HERO_IFRAME_HEIGHT_PX}px` }}
        >
          <p className="font-mono text-sm text-art-text-muted">
            The live demo is temporarily unavailable.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

function TrustBand({ companies }: { companies: readonly string[] }) {
  return (
    <section className="border-y border-border-default bg-bg-subtle">
      <div className="mx-auto max-w-[1200px] px-6 py-10 text-center">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          Dissected from first-party blogs
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {companies.map((company) => (
            <li
              key={company}
              className="font-serif text-lg tracking-tight text-text-muted transition-colors hover:text-text-primary"
            >
              {company}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

interface PreviewGroup {
  slug: string
  label: string
  count: number
  companies: readonly string[]
}

function PreviewSection({ preview }: { preview: PreviewGroup[] }) {
  if (preview.length === 0) return null
  return (
    <section className="mx-auto max-w-[1080px] px-6 py-14">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-block h-[2px] w-6 bg-brand-gold" />
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          What's inside
        </span>
      </div>
      <h2 className="mb-8 max-w-2xl font-serif text-[clamp(1.6rem,3vw,2.1rem)] font-medium leading-tight tracking-tight text-text-primary">
        Bottlenecks that show up more than once.
      </h2>
      <ul className="flex flex-col gap-6">
        {preview.map((g) => (
          <li key={g.slug}>
            <Link
              to={`/catalog#term-${g.slug}`}
              className="group block border-t-2 border-text-primary pt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="font-serif text-[clamp(1.2rem,2.2vw,1.4rem)] font-semibold tracking-[-0.01em] text-text-primary transition-colors group-hover:text-accent-primary">
                  {g.label}
                </span>
                <span className="whitespace-nowrap font-mono text-xs text-text-muted">
                  {g.count} systems
                </span>
              </div>
              <div className="mt-2 font-mono text-xs text-cat-amber">
                SEEN AT {g.companies.join(' · ')}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CtaSection({ articleCount }: { articleCount: number }) {
  return (
    <section className="mx-auto max-w-[1080px] px-6 pb-20 text-center">
      <Link
        to="/catalog"
        className="inline-block rounded-md bg-text-primary px-7 py-3.5 font-mono text-sm text-bg-base transition-colors hover:bg-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
      >
        Browse all {articleCount} breakdowns →
      </Link>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-subtle">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-8">
        <Link
          to="/"
          className="flex items-center gap-2 font-sans font-semibold tracking-tight text-text-primary"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-gold"
            aria-hidden="true"
          />
          behindscale
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/catalog" className="text-sm text-text-secondary hover:text-text-primary">
            Catalog
          </Link>
          <Link to="/patterns" className="text-sm text-text-secondary hover:text-text-primary">
            Patterns
          </Link>
          <Link to="/sources" className="text-sm text-text-secondary hover:text-text-primary">
            Sources
          </Link>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
          First-party engineering blogs only
        </span>
      </div>
    </footer>
  )
}
