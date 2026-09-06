import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  articles,
  articleBySlug,
  cruxtags,
  cruxTagByUrlSlug,
  patternBySlug,
  problemEssayByCruxTag,
  problemSvgByKey,
} from '../content'
import { newsletterSignupUrl } from '../config/site'
import type { Article, PatternDefinition, ProblemEssay } from '../types'
import StationNav from './problem/StationNav'
import WallSection from './problem/WallSection'
import MissionSection from './problem/MissionSection'
import ComparisonSection from './problem/ComparisonSection'
import {
  DecideSection,
  InterviewSection,
  StealSection,
} from './problem/GuideSections'
import { pp } from './problem/inline'
import { MISSION_WRAPPER_ID, TRYIT_WRAPPER_ID, useWallHost } from './problem/useWallHost'
import { wallBySlug } from '../walls'
import './problem-page.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// "Feb 2017" from an ISO date, parsed textually so no timezone can shift the
// month (the card meta on the rich page).
function formatMonthYear(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})/)
  if (!m) return iso
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`
}

// Problem-class page (nav-IA). ONE template that renders every class:
// fully derived by default (the "minimal" state, matching the
// problem-queue-backlog design handoff), with each authored block from a
// per-class ProblemEssay REPLACING its derived placeholder as the owner
// authors it over time. The full state (the v7.3 ambiguous-timeouts port,
// 2026-09-06) is this same page with every optional block filled in -- no
// separate template, no binary starter/full gate.
//
// Rich blocks (render-when-present): stations nav · wall (prose + try-it
// artifact + no-JS figure + stats) · mission artifact + stop block · the
// hint sheet (spectrum, diagram strip with the YOU row, matrix with the YOU
// column, full answers) · decide · steal · interview (live ticks) ·
// patterns intro/order · article cards with break-it teasers · sources.
// The shell hard-codes none of a wall's mechanics; per-wall code is the
// youMapping() in src/walls, looked up by cruxTag.
//
// Host logic (the mission<->page protocol, persistence, scroll-spy) is
// client-side and lives in a hook; every string on the page is prerendered.
//
// Newsletter furniture from the design (the "essay upcoming" strip and the
// "The weekly" subscribe card) is intentionally deferred to the Phase-6
// /newsletter surface -- it renders-when-present once that route exists, so
// this page never links to a 404.
export default function ProblemDetail() {
  const { urlSlug } = useParams<{ urlSlug: string }>()
  const cruxTag = urlSlug ? cruxTagByUrlSlug.get(urlSlug) : undefined
  const essayForHost = cruxTag ? problemEssayByCruxTag.get(cruxTag) : undefined

  // The host side of the mission protocol (client-only effects; a class
  // without a mission gets an inert hook). Called before the not-found
  // branch so the hook order is stable.
  const host = useWallHost({
    cruxTag: cruxTag ?? '',
    wall: cruxTag ? wallBySlug.get(cruxTag) : undefined,
    stations: essayForHost?.stations,
    hasMission: essayForHost?.mission !== undefined,
    hasTryIt: essayForHost?.tryIt !== undefined,
    missionWrapperId: MISSION_WRAPPER_ID,
  })

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
  // moves into the eyebrow; otherwise the label is the H1. The year range
  // derives from the members' source dates ("2017–2022"; one year when
  // they all share it).
  const headline = essay?.headline ?? label
  const eyebrow = [
    'Problem',
    essay?.headline ? label : null,
    `seen at ${companyLabel}`,
    yearRange(members),
  ]
    .filter(Boolean)
    .join(' · ')

  // Patterns embodied by this class's members: union of members'
  // patterns[], deduped, resolved against the library. Alphabetised by
  // default; an authored `patterns.order` puts named slugs first.
  const classPatterns = orderPatterns(
    Array.from(new Set(members.flatMap((a) => a.patterns.map((p) => p.slug))))
      .map((slug) => patternBySlug.get(slug))
      .filter((p): p is PatternDefinition => p !== undefined),
    essay?.patterns?.order,
  )

  const svg = (name: string) => problemSvgByKey.get(`${cruxTag}/${name}`)
  const wallFigure = essay?.figures?.find((f) => f.slug === essay.wall?.figureSlug)
  const you = host.you

  return (
    <main className="problem-page max-w-[680px] mx-auto px-5 pt-10 pb-[72px]">
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-3xl font-bold leading-tight tracking-tight text-text-primary">
        {headline}
      </h1>
      {essay?.lede && <p className="lede mt-3">{essay.lede}</p>}

      {essay?.stations !== undefined && (
        <StationNav
          stations={essay.stations}
          current={host.currentStation}
          deckAnchor={essay.mission !== undefined ? MISSION_WRAPPER_ID : undefined}
          deckJumpVisible={host.touched}
        />
      )}

      {intro && intro.length > 0 && (
        <div className="mt-4">
          {intro.map((para, i) => (
            <p key={i} className="pp-p">
              {pp(para)}
            </p>
          ))}
        </div>
      )}

      {essay?.wall !== undefined ? (
        <WallSection
          wall={essay.wall}
          tryIt={essay.tryIt}
          figure={wallFigure}
          hostSlug={cruxTag}
          hostTitle={label}
          tryItWrapperId={TRYIT_WRAPPER_ID}
          tryItHeight={host.tryItHeight}
          onTryItMessage={host.onTryItMessage}
        />
      ) : (
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
      )}

      {essay?.mission !== undefined && (
        <MissionSection
          mission={essay.mission}
          hostSlug={cruxTag}
          hostTitle={label}
          wrapperId={MISSION_WRAPPER_ID}
          height={host.missionHeight}
          onMessage={host.onMissionMessage}
        />
      )}

      {essay?.comparison !== undefined ? (
        <ComparisonSection comparison={essay.comparison} svg={svg} you={you} />
      ) : (
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
      )}

      {essay?.decide !== undefined && <DecideSection decide={essay.decide} />}
      {essay?.steal !== undefined && <StealSection steal={essay.steal} />}
      {essay?.interview !== undefined && (
        <InterviewSection interview={essay.interview} you={you} />
      )}

      {classPatterns.length > 0 && (
        <Section title="Patterns in this class" id="patterns">
          {essay?.patterns !== undefined && (
            <p className="pp-p">{pp(essay.patterns.intro)}</p>
          )}
          <ul className="chips">
            {classPatterns.map((pattern) => (
              <li key={pattern.slug}>
                <Link to={`/patterns/${pattern.slug}`} className="chip">
                  {pattern.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {members.length > 0 &&
        (essay?.cards !== undefined ? (
          <RichCards essay={essay} members={members} />
        ) : (
          <Section title="Every breakdown" id="cards">
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
        ))}

      {essay?.sources !== undefined && (
        <p className="sources">
          {pp(essay.sources.intro)}{' '}
          {essay.sources.items.map((item, i) => {
            const article = articleBySlug.get(item.articleSlug)
            return (
              <span key={item.articleSlug}>
                {i > 0 && ' · '}
                {article !== undefined ? (
                  <a href={article.url} className="pp-link">
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </span>
            )
          })}
        </p>
      )}

      <SubscribeCard />
    </main>
  )
}

// "2017–2022" from the members' source dates; a single year when they share
// it; empty when there are no members.
function yearRange(members: readonly Article[]): string | null {
  const years = members
    .map((a) => a.publishedAt.slice(0, 4))
    .filter((y) => /^\d{4}$/.test(y))
    .sort()
  if (years.length === 0) return null
  const first = years[0]!
  const last = years[years.length - 1]!
  return first === last ? first : `${first}–${last}`
}

// Authored order first (in the given sequence), then the rest A-Z by name.
function orderPatterns(
  patterns: PatternDefinition[],
  order: readonly string[] | undefined,
): PatternDefinition[] {
  const byName = patterns
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  if (order === undefined) return byName
  const rank = new Map(order.map((slug, i) => [slug, i]))
  return byName.sort((a, b) => {
    const ra = rank.get(a.slug) ?? Number.POSITIVE_INFINITY
    const rb = rank.get(b.slug) ?? Number.POSITIVE_INFINITY
    return ra - rb
  })
}

// The rich "Every article" cards: chronological (the reference build's
// order), source + month, title, and the break-it line (authored override,
// else the article's own artifact teaser).
function RichCards({
  essay,
  members,
}: {
  essay: ProblemEssay
  members: readonly Article[]
}) {
  const cards = essay.cards!
  const ordered = members
    .slice()
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
  return (
    <Section title={cards.title ?? 'Every breakdown'} id="cards">
      <p className="pp-p">{pp(cards.intro)}</p>
      <div className="cards">
        {ordered.map((article) => {
          const teaser =
            cards.teasers?.[article.slug] ?? article.artifact?.teaser
          return (
            <div key={article.slug} className="card">
              <div className="meta">
                {article.source.name} · {formatMonthYear(article.publishedAt)}
              </div>
              <div className="t">
                <Link to={`/articles/${article.slug}`}>{article.title}</Link>
              </div>
              {teaser !== undefined && <div className="teaser">{teaser}</div>}
            </div>
          )
        })}
      </div>
    </Section>
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

function Section({
  title,
  id,
  children,
}: {
  title: string
  id?: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="pp-h2" id={id}>
        {title}
      </h2>
      {children}
    </section>
  )
}
