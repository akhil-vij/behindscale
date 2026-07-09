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
// landing/navigation phase). Consumed by the catalog page's group
// headers, the landing preview, and the article-page lateral chip;
// serves as the source for the `DefinedTermSet` JSON-LD emitted on
// /catalog. Same glob shape as `feeds` -- one literal path, one entry.
const cruxtagsModules = import.meta.glob<CruxTagRegistry>(
  '/content/cruxtags.json',
  { eager: true, import: 'default' },
)
export const cruxtags: CruxTagRegistry =
  Object.values(cruxtagsModules)[0] ?? {}

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
}

function buildPatternStats(): Map<string, PatternStatsEntry> {
  const stats = new Map<string, PatternStatsEntry>()
  for (const article of articles) {
    const sourceSlug = article.source.slug
    for (const ref of article.patterns) {
      let entry = stats.get(ref.slug)
      if (!entry) {
        entry = { frequency: 0, articleSlugs: [], sourceSlugs: [] }
        stats.set(ref.slug, entry)
      }
      entry.frequency += 1
      entry.articleSlugs.push(article.slug)
      if (!entry.sourceSlugs.includes(sourceSlug)) {
        entry.sourceSlugs.push(sourceSlug)
      }
    }
  }
  return stats
}

export const patternStats: ReadonlyMap<string, PatternStatsEntry> =
  buildPatternStats()
