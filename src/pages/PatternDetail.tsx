import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { patternBySlug, patternDetail } from '../content'
import type { PatternMember } from '../content'
import { patternCategoryById } from '../lib/patternCategories'
import Prose from '../components/Prose'
import ArtifactEmbed from '../components/ArtifactEmbed'

// The pattern detail page (/patterns/:slug). One template, progressive
// authoring (the ProblemDetail model): registry prose + derived relations are
// the floor every pattern renders from; authored richness — the lede
// (`oneLineDefinition`), inline figures, and the artifact mechanism section —
// is render-when-present and lands per-pattern over time. This build ships the
// derived floor + the lede; the artifact mechanism section is deferred to the
// per-pattern enrich pass (see docs/pattern-artifacts-design.md, nav-IA v1.4).
//
// Every section renders-when-present: sections with no derived content are
// omitted rather than shown empty. All evidence derives from the FULL
// article<->pattern relations via `patternDetail`, never catalog-card chips.

// Above this many strip members the tail collapses to compact one-line rows
// behind SHOW ALL (a client enhancement — the prerendered HTML always carries
// every row, so crawlers and no-JS readers see the complete strip).
const STRIP_FULL_MAX = 8
const STRIP_LEAD_ROWS = 4

export default function PatternDetail() {
  const { slug } = useParams<{ slug: string }>()
  const pattern = slug ? patternBySlug.get(slug) : undefined

  // Skip + flag on missing entry per invariant 6 — never crash.
  if (!pattern) {
    return (
      <main className="max-w-[680px] mx-auto px-5 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Pattern not found
        </h1>
        <p className="mt-4 text-text-secondary">
          No pattern with slug{' '}
          <code className="font-mono text-text-primary">{slug ?? '(missing)'}</code>{' '}
          exists in the library.
        </p>
        <p className="mt-6">
          <Link
            to="/patterns"
            className="text-accent-primary transition-colors hover:text-accent-hover"
          >
            ← Back to patterns
          </Link>
        </p>
      </main>
    )
  }

  const detail = patternDetail.get(pattern.slug)
  const breakdownCount = detail?.breakdownCount ?? 0
  const companyCount = detail?.companyCount ?? 0
  const members = detail?.members ?? []
  const coOccurrences = detail?.coOccurrences ?? []
  const problemsDoor = detail?.problemsDoor ?? []
  const category = pattern.category
    ? patternCategoryById.get(pattern.category)
    : undefined

  return (
    <main className="mx-auto max-w-[680px] px-5 pb-20 pt-10">
      {/* Header */}
      {breakdownCount > 0 && (
        <p className="mb-2.5 font-mono text-xs uppercase tracking-wide text-text-muted">
          Pattern · seen in {breakdownCount}{' '}
          {plural(breakdownCount, 'breakdown')} across {companyCount}{' '}
          {plural(companyCount, 'company', 'companies')}
        </p>
      )}
      <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.02em] text-text-primary">
        {pattern.name}
      </h1>
      {/* Lede — render-when-present (oneLineDefinition); header collapses with
          no reserved gap when absent. */}
      {pattern.oneLineDefinition && (
        <p className="mt-2.5 text-[17.5px] leading-[1.55] text-text-secondary [text-wrap:pretty]">
          {pattern.oneLineDefinition}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2.5 border-b border-border-default pb-4">
        {category && (
          <Link
            to={`/patterns#cat-${category.id}`}
            className="inline-flex items-center gap-[7px] rounded-md border border-border-default px-2.5 py-[3px] font-mono text-xs text-text-secondary no-underline transition-colors hover:bg-bg-subtle hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <span className={`h-[7px] w-[7px] rounded-full ${category.dotClass}`} />
            {category.label.toLowerCase()}
          </Link>
        )}
      </div>

      {/* The mechanism — the artifact, mounted ABOVE the definition
          (show-then-tell). Render-when-present: only patterns with an authored
          artifact reach it. */}
      {pattern.artifact && (
        <MechanismSection
          artifact={pattern.artifact}
          mechanism={pattern.mechanism}
          hostSlug={pattern.slug}
          hostTitle={pattern.name}
        />
      )}

      {/* Definition — registry prose, verbatim; inline figures when authored. */}
      <Section title="Definition">
        <Prose slug={pattern.slug} figures={pattern.figures}>
          {pattern.definition}
        </Prose>
      </Section>

      {/* When it applies — numbered cards. */}
      {pattern.whenItApplies.length > 0 && (
        <Section title="When it applies">
          <div className="mt-3 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {pattern.whenItApplies.map((item, i) => (
              <div
                key={i}
                className="flex gap-[11px] rounded-xl border border-border-default bg-bg-surface px-[15px] py-[13px]"
              >
                <span className="flex-none pt-0.5 font-mono text-[11px] text-text-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14.5px] leading-[1.6] text-text-primary">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tradeoffs — bold-lead rendering rule; prose itself is never edited. */}
      {pattern.tradeoffs.length > 0 && (
        <Section title="Tradeoffs">
          <div className="mt-3 flex flex-col gap-2.5">
            {pattern.tradeoffs.map((item, i) => {
              const { lead, rest } = boldLead(item)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border-default bg-bg-surface px-4 py-3.5 text-[15px] leading-[1.65] text-text-primary"
                >
                  {lead && <strong className="font-semibold">{lead}</strong>}
                  {rest}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* The same move, N ways — the evidence strip. */}
      {members.length > 0 && (
        <SameMoveStrip count={breakdownCount} members={members} />
      )}

      {/* Often used together — co-occurrence chips (>=2 shared). */}
      {coOccurrences.length > 0 && (
        <Section title="Often used together" tight>
          <p className="mb-3 text-sm text-text-muted">
            Patterns sharing breakdowns with this one — derived from
            co-occurrence, threshold ≥2 shared.
          </p>
          <div className="flex flex-wrap gap-2">
            {coOccurrences.map((c) => (
              <Link
                key={c.slug}
                to={`/patterns/${c.slug}`}
                className="inline-flex items-baseline gap-2 rounded-md border border-border-strong px-[11px] py-1 font-mono text-xs text-text-secondary no-underline transition-colors hover:bg-bg-subtle hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                {c.slug}{' '}
                <span className="text-[10.5px] text-text-muted">×{c.count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Problems this pattern answers — the class door. */}
      {problemsDoor.length > 0 && (
        <Section title="Problems this pattern answers" tight>
          <p className="mb-3 text-sm text-text-muted">
            The walls where its breakdowns live — each opens the cross-company
            comparison.
          </p>
          <div className="flex flex-col">
            {problemsDoor.map((row) => (
              <Link
                key={row.cruxTag}
                to={
                  row.urlSlug
                    ? `/problems/${row.urlSlug}`
                    : `/problems#term-${row.cruxTag}`
                }
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2.5 border-t border-border-default px-1 py-[11px] text-text-primary no-underline transition-colors hover:bg-bg-subtle hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary last:border-b"
              >
                <span className="text-[15px] font-semibold">{row.label}</span>
                <span className="font-mono text-[10.5px] tracking-[0.03em] text-cat-amber">
                  {row.companies.map((c) => c.toUpperCase()).join(' · ')} →
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Interview door: silently absent until a question's patterns[] cites
          this pattern (Phase 4 reverse index; no questions authored yet). */}
    </main>
  )
}

// The evidence strip. <=8 members render as all full rows; >8 render the lead
// rows full then the tail as compact one-liners, collapsed behind SHOW ALL as a
// post-hydration enhancement. `mounted` gates the collapse so the SSR markup
// (and first client render) carries every row — no hydration mismatch, and
// no-JS / crawlers see the complete strip.
function SameMoveStrip({
  count,
  members,
}: {
  count: number
  members: PatternMember[]
}) {
  const [mounted, setMounted] = useState(false)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => setMounted(true), [])

  const collapsible = members.length > STRIP_FULL_MAX
  const fullCount = collapsible ? STRIP_LEAD_ROWS : members.length
  const fullRows = members.slice(0, fullCount)
  const compactRows = collapsible ? members.slice(fullCount) : []
  const collapsed = mounted && collapsible && !showAll

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-xl font-semibold tracking-[-0.01em] text-text-primary">
        The same move, {count} ways
      </h2>
      <p className="mb-3 text-sm italic text-text-secondary">
        Every row is a production system that bet on this pattern — the note
        says how, in that system&apos;s own terms.
      </p>

      <div
        className={`overflow-hidden border border-border-default bg-bg-surface ${
          compactRows.length > 0 ? 'rounded-t-xl' : 'rounded-xl'
        }`}
      >
        {fullRows.map((m, i) => (
          <div
            key={m.articleSlug}
            className={`grid grid-cols-[150px_1fr] ${
              i < fullRows.length - 1 || compactRows.length > 0
                ? 'border-b border-border-default'
                : ''
            }`}
          >
            <div className="border-r border-border-default bg-bg-subtle p-[15px]">
              <div className="text-[15px] font-semibold text-text-primary">
                {m.company}
              </div>
              <div className="mt-[3px] font-mono text-[10px] uppercase leading-[1.5] tracking-[0.05em] text-text-muted">
                {m.sourceName}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-text-muted">
                {m.year}
              </div>
            </div>
            <div className="p-[15px] text-[14.5px] leading-[1.62] text-text-primary">
              {m.note}{' '}
              <Link
                to={`/articles/${m.articleSlug}`}
                className="whitespace-nowrap text-[13px] text-accent-primary no-underline hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                Read the breakdown →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {compactRows.length > 0 && (
        <div className="rounded-b-xl border border-t-0 border-border-default bg-bg-base">
          {compactRows.map((m) => (
            <Link
              key={m.articleSlug}
              to={`/articles/${m.articleSlug}`}
              style={collapsed ? { display: 'none' } : undefined}
              className="grid grid-cols-[150px_1fr_auto] items-baseline gap-3 border-t border-border-default px-[15px] py-2.5 text-text-primary no-underline transition-colors hover:bg-bg-subtle hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <span className="text-[13.5px] font-semibold">{m.company}</span>
              <span className="text-[13.5px] text-text-secondary">{m.title}</span>
              <span className="whitespace-nowrap font-mono text-[10.5px] text-text-muted">
                {m.year}
              </span>
            </Link>
          ))}
          {collapsed && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full cursor-pointer border-t border-border-default bg-transparent py-[11px] font-mono text-[11.5px] tracking-[0.05em] text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              SHOW ALL {members.length} BREAKDOWNS ↓
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// The mechanism section: the artifact in a dark shell with a caption bar, a
// collapsible context row, and a light hint line below. Every authored slot
// (caption/blurb/idea/whatToTry/teaser) is render-when-present. The artifact
// mounts via ArtifactEmbed in `bare` mode — the shell owns the frame + the
// OPEN FULL SCREEN link, ArtifactEmbed keeps the HEAD-probe failure isolation
// (invariant 2) and the view/interact analytics.
function MechanismSection({
  artifact,
  mechanism,
  hostSlug,
  hostTitle,
}: {
  artifact: { path: string; teaser?: string }
  mechanism?: {
    caption?: string
    blurb?: string
    idea?: string
    whatToTry?: string
  }
  hostSlug: string
  hostTitle: string
}) {
  const [contextOpen, setContextOpen] = useState(false)
  const hasContext = Boolean(mechanism?.idea || mechanism?.whatToTry)

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xl font-semibold tracking-[-0.01em] text-text-primary">
        The mechanism
      </h2>
      {mechanism?.blurb && (
        <p className="mb-3 text-sm italic text-text-secondary">
          {mechanism.blurb}
        </p>
      )}

      <div className="rounded-xl border border-art-border bg-art-bg px-3.5 pb-4 pt-3.5">
        {/* Caption bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 pb-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-art-text-muted">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-art-live ring-[3px] ring-art-live/20" />
            LIVE ARTIFACT
            {mechanism?.caption && (
              <>
                <span aria-hidden="true">·</span>
                <span>{mechanism.caption}</span>
              </>
            )}
          </span>
          <a
            href={artifact.path}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-[0.05em] text-art-text-muted no-underline transition-colors hover:text-brand-gold hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            OPEN FULL SCREEN ↗
          </a>
        </div>

        {/* Collapsible context row */}
        {hasContext && (
          <>
            <button
              type="button"
              onClick={() => setContextOpen((o) => !o)}
              aria-expanded={contextOpen}
              className="mb-3 w-full cursor-pointer rounded-lg border border-art-border bg-art-surface-2 px-3 py-2.5 text-left font-mono text-[11px] tracking-[0.06em] text-art-text-muted transition-colors hover:text-art-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              {contextOpen ? '▾' : '▸'} THE IDEA · WHAT TO TRY
            </button>
            {contextOpen && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-art-border bg-art-surface-2 px-3.5 py-3">
                {mechanism?.idea && (
                  <div className="text-[13px] leading-[1.65] text-art-text">
                    <span className="mr-2 font-mono text-[10px] tracking-[0.1em] text-art-text-muted">
                      THE IDEA
                    </span>
                    {mechanism.idea}
                  </div>
                )}
                {mechanism?.whatToTry && (
                  <div className="text-[13px] leading-[1.65] text-art-text">
                    <span className="mr-2 font-mono text-[10px] tracking-[0.1em] text-art-text-muted">
                      WHAT TO TRY
                    </span>
                    {mechanism.whatToTry}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* The artifact itself */}
        <ArtifactEmbed
          artifactPath={artifact.path}
          hostSlug={hostSlug}
          hostTitle={hostTitle}
          bare
          heightPx={470}
        />
      </div>

      {/* Light hint line below the shell */}
      {artifact.teaser && (
        <p className="mx-0.5 mt-2.5 text-[13px] leading-[1.5] text-text-secondary">
          {artifact.teaser}
        </p>
      )}
    </section>
  )
}

function Section({
  title,
  children,
  tight,
}: {
  title: string
  children: ReactNode
  tight?: boolean
}) {
  return (
    <section className="mt-10">
      <h2
        className={`text-xl font-semibold tracking-[-0.01em] text-text-primary ${
          tight ? 'mb-1' : ''
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// Bold-lead rendering rule (tradeoffs): bold the lead clause — the text up to
// and including the first colon, else the first sentence — leaving the prose
// itself untouched (we split for display, never edit).
function boldLead(text: string): { lead: string; rest: string } {
  const colon = text.indexOf(':')
  const sentence = text.search(/\.\s/)
  if (colon !== -1 && (sentence === -1 || colon < sentence)) {
    return { lead: text.slice(0, colon + 1), rest: text.slice(colon + 1) }
  }
  if (sentence !== -1) {
    return { lead: text.slice(0, sentence + 1), rest: text.slice(sentence + 1) }
  }
  return { lead: '', rest: text }
}

function plural(n: number, one: string, many?: string): string {
  return n === 1 ? one : (many ?? `${one}s`)
}
