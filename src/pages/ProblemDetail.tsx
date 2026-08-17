import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  articles,
  cruxtags,
  cruxTagByUrlSlug,
  patternBySlug,
  problemEssayByCruxTag,
} from '../content'
import { newsletterSignupUrl } from '../config/site'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Problem-class page (nav-IA). ONE template that renders every class:
// fully derived by default (the "minimal" state, matching the
// problem-queue-backlog design handoff), with each authored block from a
// per-class ProblemEssay REPLACING its derived placeholder as the owner
// authors it over time. The full state (problem-ambiguous-timeouts) is
// this same page with every optional block filled in -- no separate
// template, no binary starter/full gate.
//
// Newsletter furniture from the design (the "essay upcoming" strip and the
// "The weekly" subscribe card) is intentionally deferred to the Phase-6
// /newsletter surface -- it renders-when-present once that route exists, so
// this page never links to a 404.
//
// Rich authored blocks (metric grid, "the wall" diagram, hand-written
// vantage rows, deep dive, number charts, what-to-steal, simulator) land
// incrementally; today the authored hooks are headline / lede / intro.
export default function ProblemDetail() {
  const { urlSlug } = useParams<{ urlSlug: string }>()
  const cruxTag = urlSlug ? cruxTagByUrlSlug.get(urlSlug) : undefined

  if (!cruxTag) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Problem class not found
        </h1>
        <p className="mt-4 text-text-secondary">
          No problem class with slug{' '}
          <code className="font-mono text-text-primary">
            {urlSlug ?? '(missing)'}
          </code>{' '}
          exists.
        </p>
        <p className="mt-6">
          <Link
            to="/problems"
            className="text-accent-primary hover:text-accent-hover transition-colors"
          >
            ← Back to problems
          </Link>
        </p>
      </main>
    )
  }

  const entry = cruxtags[cruxTag]
  const label = entry?.label ?? cruxTag
  const definition = entry?.definition ?? ''
  const essay = problemEssayByCruxTag.get(cruxTag)

  // Members are already sorted publishedAt-desc (src/content/index.ts),
  // which matches the design's row/card order.
  const members = articles.filter((a) => a.cruxTag === cruxTag)
  const companyCount = new Set(members.map((a) => a.source.company)).size
  const companyLabel = `${companyCount} ${companyCount === 1 ? 'company' : 'companies'}`
  const systemLabel = `${members.length} ${members.length === 1 ? 'system' : 'systems'}`
  const intro = Array.isArray(essay?.intro) ? essay?.intro : undefined

  // Authored headline (when present) becomes the H1 and the class label
  // moves into the eyebrow; otherwise the label is the H1.
  const headline = essay?.headline ?? label
  const eyebrow = [
    'Problem',
    essay?.headline ? label : null,
    `seen at ${companyLabel}`,
  ]
    .filter(Boolean)
    .join(' · ')

  // Patterns embodied by this class's members: union of members'
  // patterns[], deduped, resolved against the library, alphabetised.
  const classPatterns = Array.from(
    new Set(members.flatMap((a) => a.patterns.map((p) => p.slug))),
  )
    .map((slug) => patternBySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main className="max-w-[680px] mx-auto px-5 pt-10 pb-[72px]">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-3xl font-bold leading-tight tracking-tight text-text-primary">
        {headline}
      </h1>
      {essay?.lede && (
        <p className="mt-3 text-[17px] italic text-text-secondary">
          {essay.lede}
        </p>
      )}

      {intro && intro.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {intro.map((para, i) => (
            <p key={i} className="leading-relaxed text-text-primary">
              {para}
            </p>
          ))}
        </div>
      )}

      <Section title="The wall">
        <p className="mt-3 leading-relaxed text-text-primary">
          {definition}
          {companyCount > 1 && (
            <>
              {' '}
              {companyCount} teams hit this wall; the breakdowns below are the
              evidence.
            </>
          )}
        </p>
      </Section>

      <Section title={`Same wall, ${systemLabel}`}>
        {members.length === 0 ? (
          <p className="mt-3 text-text-secondary">
            No systems in this class yet.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
            {members.map((article, i) => (
              <div
                key={article.slug}
                className={`grid grid-cols-[150px_1fr] ${
                  i < members.length - 1
                    ? 'border-b border-border-default'
                    : ''
                }`}
              >
                <div className="border-r border-border-default bg-bg-subtle p-[15px]">
                  <div className="text-[15px] font-semibold text-text-primary">
                    {article.source.company}
                  </div>
                  <div className="mt-[3px] font-mono text-[10px] uppercase leading-relaxed tracking-wide text-text-muted">
                    {article.source.name}
                  </div>
                </div>
                <div className="p-[15px] text-[14.5px] leading-relaxed text-text-primary">
                  {article.cruxSummary}{' '}
                  <Link
                    to={`/articles/${article.slug}`}
                    className="whitespace-nowrap text-[13px] text-accent-primary hover:text-accent-hover"
                  >
                    Read the breakdown →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {classPatterns.length > 0 && (
        <Section title="Patterns in this class">
          <ul className="mt-3 flex flex-wrap gap-[7px]">
            {classPatterns.map((pattern) => (
              <li key={pattern.slug}>
                <Link
                  to={`/patterns/${pattern.slug}`}
                  className="inline-flex items-center rounded-md border border-border-strong px-2.5 py-[3px] font-mono text-xs text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {pattern.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {members.length > 0 && (
        <Section title="Every breakdown">
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {members.map((article) => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="flex flex-col gap-[7px] rounded-xl border border-border-default bg-bg-surface p-[15px] text-text-primary no-underline transition-colors hover:border-border-strong hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-text-muted">
                  {article.source.name} · {formatDate(article.publishedAt)}
                </span>
                <span className="text-[15.5px] font-semibold leading-snug text-text-primary">
                  {article.title}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <SubscribeCard />
    </main>
  )
}

// The "The weekly" subscribe card. Config-gated (design §5b): renders only when
// a newsletter signup URL is set -- external hosted page now, /newsletter at
// Phase 6. Empty config => nothing renders, so this page never links to a 404.
function SubscribeCard() {
  if (!newsletterSignupUrl) return null
  const external = /^https?:\/\//.test(newsletterSignupUrl)
  const ctaClass =
    'shrink-0 rounded-md bg-accent-primary px-4 py-2 font-mono text-xs font-semibold text-bg-surface transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'
  return (
    <section className="mt-9 rounded-xl border border-border-default bg-bg-surface px-5 py-[18px]">
      <div className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
        The weekly
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm text-text-secondary">
          This wall&rsquo;s essay lands in an upcoming edition — one problem
          class per edition, every claim linked to the company&rsquo;s own post.
        </span>
        {external ? (
          <a
            href={newsletterSignupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            Subscribe
          </a>
        ) : (
          <Link to={newsletterSignupUrl} className={ctaClass}>
            Subscribe
          </Link>
        )}
      </div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}
