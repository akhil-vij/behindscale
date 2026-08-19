// Build-time content indexer. Every page and component reads content from
// here so file paths and glob patterns live in exactly one place. Vite's
// import.meta.glob bundles all matched JSON into the JS bundle at build
// time — no runtime network fetching (invariant 1).
//
// Schemas are type-only imports from src/types/ (the single permitted
// cross-boundary surface per invariant 3). Runtime validation of these
// JSON files is enforced by the build-time validator in Unit 4; this
// module trusts the schema.

import type {
  Article,
  CruxTagRegistry,
  PatternDefinition,
  ProblemEssay,
  Source,
} from '../types'

const articleModules = import.meta.glob<Article>(
  '/content/articles/*.json',
  { eager: true, import: 'default' },
)

// content/patterns/index.json is reserved for the derived aggregated
// pattern library (architecture.md). It is NOT a pattern definition file
// and must never enter this glob. The negation in the pattern array
// excludes it at the glob level — Vite skips loading the module entirely
// rather than loading-then-filtering at runtime, so the bundle stays clean
// and the exclusion can never silently lapse.
const patternModules = import.meta.glob<PatternDefinition>(
  ['/content/patterns/*.json', '!/content/patterns/index.json'],
  { eager: true, import: 'default' },
)

export const articles: Article[] = Object.values(articleModules).sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
)

export const articleBySlug: ReadonlyMap<string, Article> = new Map(
  articles.map((a) => [a.slug, a]),
)

export const patterns: PatternDefinition[] = Object.values(patternModules).sort(
  (a, b) => a.name.localeCompare(b.name),
)

export const patternBySlug: ReadonlyMap<string, PatternDefinition> = new Map(
  patterns.map((p) => [p.slug, p]),
)

// The source allowlist (invariant 7). Moved from pipeline/feeds.json to
// content/feeds.json in Unit 6 -- the website reads it to support a
// future "Sources we track" page, and the pipeline reads it to gate
// discovery. The article-index filter chips do NOT derive from this
// list; they derive from articles[*].source so empty sources don't
// surface as broken chips (Unit 6 architecture decision: navigation
// surfaces filter by realized content; informational surfaces describe
// intended scope).
//
// Read via import.meta.glob so the loading mechanism matches articles
// and patterns -- no separate `resolveJsonModule` configuration, no
// cross-include path concerns from `import` of a file outside src/.
// The glob targets a single literal path; the resulting record has
// exactly one entry.
const feedsModules = import.meta.glob<Source[]>('/content/feeds.json', {
  eager: true,
  import: 'default',
})
export const feeds: readonly Source[] = Object.values(feedsModules)[0] ?? []

// The cruxTag registry (invariant-level content from the 2026-07-08
// landing/navigation phase). Consumed by the problems workbench's group
// headers, the landing preview, and the article-page lateral chip;
// serves as the source for the `DefinedTermSet` JSON-LD emitted on
// /problems. Same glob shape as `feeds` -- one literal path, one entry.
const cruxtagsModules = import.meta.glob<CruxTagRegistry>(
  '/content/cruxtags.json',
  { eager: true, import: 'default' },
)
export const cruxtags: CruxTagRegistry =
  Object.values(cruxtagsModules)[0] ?? {}

// urlSlug resolvers for the `/problems/<urlSlug>` class pages (nav-IA
// Phase 3, D2/D3). The registry's `urlSlug` is the public, human-facing
// slug for a problem class; `cruxTag` stays the frozen join key. These
// two maps are the single place the key<->urlSlug correspondence lives:
// `cruxTagByUrlSlug` powers ProblemDetail (route param -> cruxTag) and
// `urlSlugByCruxTag` powers the article crux links (cruxTag -> class-page
// href). Only entries carrying a urlSlug are mapped; the
// `cruxtag-urlslug` validator guarantees every real entry has one, so the
// maps are total over every cruxTag an article uses (asserted by
// src/content/__tests__/problem-routes.test.ts). An unmapped cruxTag
// degrades to the workbench anchor rather than crashing (invariant 6).
export const urlSlugByCruxTag: ReadonlyMap<string, string> = new Map(
  Object.entries(cruxtags)
    .filter(([, entry]) => typeof entry.urlSlug === 'string')
    .map(([key, entry]) => [key, entry.urlSlug as string]),
)

export const cruxTagByUrlSlug: ReadonlyMap<string, string> = new Map(
  Array.from(urlSlugByCruxTag, ([key, urlSlug]) => [urlSlug, key]),
)

// Per-class authored problem essays (nav-IA progressive-authoring model).
// OPTIONAL and keyed by the frozen `cruxTag`: a class with no file renders
// fully derived (minimal state); a file's present blocks replace their
// derived placeholders on ProblemDetail. Same glob shape as articles;
// zero files today, so every class is minimal until authored. See
// src/types/problemEssay.ts.
const problemEssayModules = import.meta.glob<ProblemEssay>(
  '/content/problems/*.json',
  { eager: true, import: 'default' },
)
export const problemEssayByCruxTag: ReadonlyMap<string, ProblemEssay> = new Map(
  Object.values(problemEssayModules).map((essay) => [essay.cruxTag, essay]),
)

// patternStats is the aggregated counts surface that the pattern library
// renders (frequency, articles, companies). Consumers (PatternCard,
// PatternIndex, PatternDetail) read by slug and never know how the stats
// were computed.
//
// 3d implementation (here): walk the in-memory `articles` array at module
// load and aggregate. Cheap, fine while the library has few articles.
//
// Unit 4+ swap point: this implementation will be replaced by a read from
// `content/patterns/index.json` (the pipeline-generated aggregated pattern
// library) -- shape stays identical, the swap is the body of
// buildPatternStats() and the const that follows it. No consumer changes.
export interface PatternStatsEntry {
  frequency: number
  articleSlugs: string[]
  sourceSlugs: string[]
  // Distinct `source.company` names across the pattern's articles (the
  // canonical company, so Amazon/AWS collapse to one). Feeds the /patterns
  // card evidence row ("SEEN AT …") and the distinct-company count. Derived
  // from the FULL article<->pattern relations, never a display cap.
  companies: string[]
}

function buildPatternStats(): Map<string, PatternStatsEntry> {
  const stats = new Map<string, PatternStatsEntry>()
  for (const article of articles) {
    const sourceSlug = article.source.slug
    const company = article.source.company
    for (const ref of article.patterns) {
      let entry = stats.get(ref.slug)
      if (!entry) {
        entry = { frequency: 0, articleSlugs: [], sourceSlugs: [], companies: [] }
        stats.set(ref.slug, entry)
      }
      entry.frequency += 1
      entry.articleSlugs.push(article.slug)
      if (!entry.sourceSlugs.includes(sourceSlug)) {
        entry.sourceSlugs.push(sourceSlug)
      }
      if (!entry.companies.includes(company)) {
        entry.companies.push(company)
      }
    }
  }
  return stats
}

export const patternStats: ReadonlyMap<string, PatternStatsEntry> =
  buildPatternStats()

// patternDetail is the per-pattern derived surface the /patterns/:slug page
// renders — everything below the registry prose. Like patternStats it derives
// from the FULL article<->pattern relations (article.patterns[]), never from
// catalog-card chips (the 3-chip cap). This is the single place the detail
// derivations live so the page component stays declarative. See
// docs/nav-ia-decisions.md (v1.4) and the pattern-detail handoff.
//
// - members: one row per breakdown (article embodying the pattern), date desc.
// - breakdownCount / companyCount: the eyebrow counts (distinct companies).
// - coOccurrences: other patterns sharing >=2 breakdowns, count desc.
// - problemsDoor: each problem class holding >=1 breakdown, with THIS
//   pattern's companies in that class, company-count desc.
export interface PatternMember {
  articleSlug: string
  title: string
  company: string
  sourceName: string
  year: string
  note: string
}

export interface PatternCoOccurrence {
  slug: string
  count: number
}

export interface PatternProblemDoor {
  cruxTag: string
  label: string
  // Present when the class has a live /problems/<urlSlug> page; absent →
  // the page falls back to the workbench anchor (/problems#term-<cruxTag>).
  urlSlug?: string
  // THIS pattern's distinct companies in that class, sorted A→Z.
  companies: string[]
}

export interface PatternDetailData {
  breakdownCount: number
  companyCount: number
  members: PatternMember[]
  coOccurrences: PatternCoOccurrence[]
  problemsDoor: PatternProblemDoor[]
}

const CO_OCCURRENCE_MIN_SHARED = 2

function buildPatternDetail(): Map<string, PatternDetailData> {
  const detail = new Map<string, PatternDetailData>()

  for (const [slug, stats] of patternStats) {
    const memberArticles = stats.articleSlugs
      .map((s) => articleBySlug.get(s))
      .filter((a): a is Article => a !== undefined)
      // Date descending; slug as a stable tie-break for same-day articles.
      .sort(
        (a, b) =>
          b.publishedAt.localeCompare(a.publishedAt) ||
          a.slug.localeCompare(b.slug),
      )

    const members: PatternMember[] = memberArticles.map((a) => ({
      articleSlug: a.slug,
      title: a.title,
      company: a.source.company,
      sourceName: a.source.name,
      year: a.publishedAt.slice(0, 4),
      note: a.patterns.find((p) => p.slug === slug)?.note ?? '',
    }))

    // Co-occurrence: walk each member's OTHER patterns.
    const shared = new Map<string, number>()
    for (const a of memberArticles) {
      for (const ref of a.patterns) {
        if (ref.slug === slug) continue
        shared.set(ref.slug, (shared.get(ref.slug) ?? 0) + 1)
      }
    }
    const coOccurrences: PatternCoOccurrence[] = Array.from(shared, ([s, count]) => ({
      slug: s,
      count,
    }))
      .filter((c) => c.count >= CO_OCCURRENCE_MIN_SHARED)
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))

    // Problems door: group members by their (single) cruxTag class.
    const byClass = new Map<string, Set<string>>()
    for (const a of memberArticles) {
      const tag = a.cruxTag
      if (!tag) continue
      let companies = byClass.get(tag)
      if (!companies) {
        companies = new Set<string>()
        byClass.set(tag, companies)
      }
      companies.add(a.source.company)
    }
    const problemsDoor: PatternProblemDoor[] = Array.from(byClass, ([cruxTag, companies]) => ({
      cruxTag,
      label: cruxtags[cruxTag]?.label ?? cruxTag,
      urlSlug: urlSlugByCruxTag.get(cruxTag),
      companies: Array.from(companies).sort((a, b) => a.localeCompare(b)),
    })).sort(
      (a, b) => b.companies.length - a.companies.length || a.label.localeCompare(b.label),
    )

    detail.set(slug, {
      breakdownCount: stats.frequency,
      companyCount: stats.companies.length,
      members,
      coOccurrences,
      problemsDoor,
    })
  }

  return detail
}

export const patternDetail: ReadonlyMap<string, PatternDetailData> =
  buildPatternDetail()
