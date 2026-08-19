// Runtime schema predicates for the Content Contract types. Two consumer
// surfaces:
// 1. Vitest schema tests (src/types/__tests__/*.test.ts) -- via the
//    boolean isXxx wrappers at the bottom.
// 2. The build-time content validator (scripts/validate-content.ts) --
//    via the checkXxx functions that return Result objects with
//    field-level reasons for the [schema] section of the validator
//    output.
//
// NOT exported from src/types/index.ts. The barrel stays type-only so
// the website's main bundle is unaffected by this runtime code;
// predicate consumers import directly:
//   import { isArticle } from '../predicates'   // tests
//   import { checkArticle } from '../../src/types/predicates'  // scripts
//
// Hand-written rather than Zod-generated; the heavier runtime validator
// arrives when the pipeline's analyze stage needs to validate Claude's
// JSON output before writing (see Architecture Decisions in
// progress-tracker.md).

import type { Source } from './source'
import type { PatternReference, PatternDefinition } from './pattern'
import type { Article } from './article'
import type {
  PatternLibrary,
  PatternLibraryEntry,
  PatternLibraryArticleRef,
} from './pattern-library'
import type { CruxTagEntry, CruxTagRegistry } from './cruxtag'
import type { Figure } from './figure'
import type { ProblemEssay } from './problemEssay'

export type Result = { ok: true } | { ok: false; reason: string }

const ok: Result = { ok: true }
const fail = (reason: string): Result => ({ ok: false, reason })

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export function checkSource(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.name !== 'string') return fail('`name` expected string')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.company !== 'string') return fail('`company` expected string')
  if (typeof value.url !== 'string') return fail('`url` expected string')
  if (typeof value.feed !== 'string') return fail('`feed` expected string')
  return ok
}

export function checkPatternReference(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.note !== 'string') return fail('`note` expected string')
  return ok
}

export function checkFigure(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string (kebab-case, unique within the article)')
  if (value.slug.trim().length === 0) return fail('`slug` expected non-empty string')
  if (!KEBAB_CASE.test(value.slug)) {
    return fail(`\`slug\` expected lowercase-kebab-case (got "${value.slug}"; pattern ^[a-z0-9]+(-[a-z0-9]+)*$)`)
  }
  if (typeof value.eyebrow !== 'string') return fail('`eyebrow` expected string (2-6 words, uppercase mono label)')
  if (value.eyebrow.trim().length === 0) return fail('`eyebrow` expected non-empty string')
  if (typeof value.caption !== 'string') return fail('`caption` expected string (12-40 words, plain-English sentence rendered below the SVG)')
  if (value.caption.trim().length === 0) return fail('`caption` expected non-empty string')
  if (typeof value.ariaLabel !== 'string') return fail('`ariaLabel` expected string (4-20 words, screen-reader label for the SVG)')
  if (value.ariaLabel.trim().length === 0) return fail('`ariaLabel` expected non-empty string')
  return ok
}

// Shared validation for an optional `figures` array on any figure host
// (article or pattern): each entry is a valid Figure and slugs are
// unique within the host. `noun` tunes the duplicate-slug message.
export function checkFiguresField(figures: unknown, noun: string): Result {
  if (!Array.isArray(figures)) return fail('`figures` expected array when present')
  const seenSlugs = new Set<string>()
  for (let i = 0; i < figures.length; i++) {
    const figureResult = checkFigure(figures[i])
    if (!figureResult.ok) return fail(`\`figures[${i}]\`: ` + figureResult.reason)
    const slug = (figures[i] as { slug: string }).slug
    if (seenSlugs.has(slug)) {
      return fail(`\`figures[${i}]\`: duplicate slug "${slug}" (figure slugs must be unique within this ${noun})`)
    }
    seenSlugs.add(slug)
  }
  return ok
}

// Shared shape check for a NON-null artifact object. Article.artifact and
// PatternDefinition.artifact carry the identical shape (the ContentHost
// convergence, docs/pattern-artifacts-design.md §2). `teaser`, when
// present, must be a non-empty string -- optional, but a present-yet-empty
// hook is worse than none (§3, supersedes the "teaser non-empty"
// unconditional rule). Callers own the presence/null policy.
export function checkArtifactShape(value: unknown): Result {
  if (!isObject(value)) return fail('`artifact` expected object or null')
  if (typeof value.path !== 'string') return fail('`artifact.path` expected string')
  if (value.teaser !== undefined) {
    if (typeof value.teaser !== 'string') {
      return fail('`artifact.teaser` expected string when present')
    }
    if (value.teaser.trim().length === 0) {
      return fail('`artifact.teaser` must be non-empty when present')
    }
  }
  return ok
}

export function checkPatternDefinition(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.name !== 'string') return fail('`name` expected string')
  if (typeof value.definition !== 'string') return fail('`definition` expected string')
  if (!isStringArray(value.whenItApplies)) return fail('`whenItApplies` expected string[]')
  if (!isStringArray(value.tradeoffs)) return fail('`tradeoffs` expected string[]')
  if (value.category !== undefined && typeof value.category !== 'string') {
    return fail('`category` expected string when present')
  }
  if (value.oneLineDefinition !== undefined) {
    // Optional (nav-IA v1.4). When present: a non-empty string (a
    // present-yet-empty lede is worse than none). Render-when-present.
    if (typeof value.oneLineDefinition !== 'string') {
      return fail('`oneLineDefinition` expected string when present')
    }
    if (value.oneLineDefinition.trim().length === 0) {
      return fail('`oneLineDefinition` must be non-empty when present')
    }
  }
  if (value.aliases !== undefined) {
    // Optional (nav-IA v1.2). When present: array of non-empty lowercase
    // strings, no duplicates within the pattern. Display-free search data.
    if (!isStringArray(value.aliases)) {
      return fail('`aliases` expected string[] when present')
    }
    for (const alias of value.aliases) {
      if (alias.trim().length === 0) {
        return fail('`aliases` entries must be non-empty')
      }
      if (alias !== alias.toLowerCase()) {
        return fail(`\`aliases\` entries must be lowercase (got "${alias}")`)
      }
    }
    if (new Set(value.aliases).size !== value.aliases.length) {
      return fail('`aliases` must not contain duplicates')
    }
  }
  if (value.figures !== undefined) {
    const figuresResult = checkFiguresField(value.figures, 'pattern')
    if (!figuresResult.ok) return figuresResult
  }
  // Optional artifact (nav-IA v1.3). Absent or null ⇒ no artifact section.
  if (value.artifact !== undefined && value.artifact !== null) {
    const artifactResult = checkArtifactShape(value.artifact)
    if (!artifactResult.ok) return artifactResult
  }
  return ok
}

export function checkArticle(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.title !== 'string') return fail('`title` expected string')
  if (typeof value.url !== 'string') return fail('`url` expected string')
  if (typeof value.publishedAt !== 'string') return fail('`publishedAt` expected string')
  if (typeof value.addedAt !== 'string') return fail('`addedAt` expected string (ISO YYYY-MM-DD; the date this article first appeared on behindscale production)')
  if (value.updatedAt !== undefined && typeof value.updatedAt !== 'string') {
    return fail('`updatedAt` expected string (ISO YYYY-MM-DD) when present')
  }
  const sourceResult = checkSource(value.source)
  if (!sourceResult.ok) return fail('`source`: ' + sourceResult.reason)
  if (typeof value.summary !== 'string') return fail('`summary` expected string')
  if (typeof value.crux !== 'string') return fail('`crux` expected string (Taste Doc §3.5; 2-4 sentences, near-source, names the bottleneck)')
  if (value.crux.trim().length === 0) return fail('`crux` expected non-empty string')
  if (typeof value.cruxTag !== 'string') return fail('`cruxTag` expected string (lowercase-kebab-case slug, e.g. "ambiguous-failure-under-retry")')
  if (!KEBAB_CASE.test(value.cruxTag)) {
    return fail(`\`cruxTag\` expected lowercase-kebab-case (got "${value.cruxTag}"; pattern ^[a-z0-9]+(-[a-z0-9]+)*$)`)
  }
  if (typeof value.cruxSummary !== 'string') return fail('`cruxSummary` expected string (one-line crux compression, ~10-16 words; the card- and browse-surface label)')
  if (value.cruxSummary.trim().length === 0) return fail('`cruxSummary` expected non-empty string')
  if (typeof value.problem !== 'string') return fail('`problem` expected string')
  if (typeof value.solution !== 'string') return fail('`solution` expected string')
  if (!isStringArray(value.tradeoffs)) return fail('`tradeoffs` expected string[]')
  if (!isStringArray(value.tags)) return fail('`tags` expected string[]')
  if (!Array.isArray(value.patterns)) return fail('`patterns` expected array')
  for (let i = 0; i < value.patterns.length; i++) {
    const refResult = checkPatternReference(value.patterns[i])
    if (!refResult.ok) return fail(`\`patterns[${i}]\`: ` + refResult.reason)
  }
  if (value.relatedArticles !== undefined && !isStringArray(value.relatedArticles)) {
    return fail('`relatedArticles` expected string[] when present')
  }
  if (value.generatedAt !== undefined && typeof value.generatedAt !== 'string') {
    return fail('`generatedAt` expected string when present')
  }
  if (!('artifact' in value)) {
    return fail('`artifact` is required (use null for summary-only articles)')
  }
  if (value.artifact !== null) {
    const artifactResult = checkArtifactShape(value.artifact)
    if (!artifactResult.ok) return artifactResult
  }
  if (value.stats !== undefined) {
    if (!Array.isArray(value.stats)) return fail('`stats` expected array when present')
    for (let i = 0; i < value.stats.length; i++) {
      const statResult = checkArticleStat(value.stats[i])
      if (!statResult.ok) return fail(`\`stats[${i}]\`: ` + statResult.reason)
    }
  }
  if (value.figures !== undefined) {
    const figuresResult = checkFiguresField(value.figures, 'article')
    if (!figuresResult.ok) return figuresResult
  }
  return ok
}

// Problem-essay schema (docs/problem-page-design.md §5/§9). Every field
// except `cruxTag` is optional -- an absent field means "render the derived
// placeholder". This predicate validates SHAPE only; cross-references
// (cruxTag resolves to a registry entry, filename match, uniqueness) live in
// the `problem-essay` check. Only the LIVE fields are validated here; richer
// blocks (metricGrid, vantageRows, deepDive, ...) gain their rules when their
// renderers land. `extraSections` is validated shallowly (field stub).
export function checkProblemEssay(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.cruxTag !== 'string') {
    return fail('`cruxTag` expected string (the frozen cruxTag this essay authors)')
  }
  if (!KEBAB_CASE.test(value.cruxTag)) {
    return fail(`\`cruxTag\` expected lowercase-kebab-case (got "${value.cruxTag}")`)
  }
  if (value.headline !== undefined) {
    if (typeof value.headline !== 'string' || value.headline.trim().length === 0) {
      return fail('`headline` expected non-empty string when present')
    }
  }
  if (value.lede !== undefined) {
    if (typeof value.lede !== 'string' || value.lede.trim().length === 0) {
      return fail('`lede` expected non-empty string when present')
    }
  }
  if (value.intro !== undefined) {
    if (!isStringArray(value.intro) || value.intro.some((p) => p.trim().length === 0)) {
      return fail('`intro` expected array of non-empty strings when present')
    }
  }
  if (value.edition !== undefined) {
    if (
      typeof value.edition !== 'number' ||
      !Number.isInteger(value.edition) ||
      value.edition < 1
    ) {
      return fail('`edition` expected positive integer when present')
    }
  }
  if (value.firstSentAt !== undefined && typeof value.firstSentAt !== 'string') {
    return fail('`firstSentAt` expected string (ISO date) when present')
  }
  if (value.extraSections !== undefined) {
    if (!Array.isArray(value.extraSections)) {
      return fail('`extraSections` expected array when present')
    }
    for (let i = 0; i < value.extraSections.length; i++) {
      const section = value.extraSections[i]
      if (!isObject(section)) return fail(`\`extraSections[${i}]\` expected object`)
      if (typeof section.title !== 'string' || section.title.trim().length === 0) {
        return fail(`\`extraSections[${i}].title\` expected non-empty string`)
      }
      if (!Array.isArray(section.blocks)) {
        return fail(`\`extraSections[${i}].blocks\` expected array`)
      }
    }
  }
  return ok
}

const STAT_PLACEMENTS = new Set(['problem', 'solution', 'tradeoffs'])

// Article.cruxTag normalization contract (Taste Doc §3.5 / architecture.md
// Content Contract). Same shape as any other kebab-case slug in the repo
// (article slug, pattern slug, source slug): lowercase alphanumerics
// with single hyphens separating tokens. Not shared with those checks
// because cruxTag has no uniqueness rule -- reuse across articles IS
// the taxonomy demonstrating itself -- and no orphan rule -- there are
// no cruxTag definition files.
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function checkArticleStat(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.value !== 'string') return fail('`value` expected string')
  if (typeof value.label !== 'string') return fail('`label` expected string')
  if (typeof value.placement !== 'string') {
    return fail('`placement` expected string')
  }
  if (!STAT_PLACEMENTS.has(value.placement)) {
    return fail(
      `\`placement\` must be "problem", "solution", or "tradeoffs" (got "${value.placement}")`,
    )
  }
  return ok
}

export function checkPatternLibraryArticleRef(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.title !== 'string') return fail('`title` expected string')
  const sourceResult = checkSource(value.source)
  if (!sourceResult.ok) return fail('`source`: ' + sourceResult.reason)
  if (typeof value.note !== 'string') return fail('`note` expected string')
  return ok
}

export function checkPatternLibraryEntry(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  const defResult = checkPatternDefinition(value.definition)
  if (!defResult.ok) return fail('`definition`: ' + defResult.reason)
  if (typeof value.frequency !== 'number') return fail('`frequency` expected number')
  if (!Array.isArray(value.articles)) return fail('`articles` expected array')
  for (let i = 0; i < value.articles.length; i++) {
    const refResult = checkPatternLibraryArticleRef(value.articles[i])
    if (!refResult.ok) return fail(`\`articles[${i}]\`: ` + refResult.reason)
  }
  if (!isStringArray(value.companies)) return fail('`companies` expected string[]')
  return ok
}

export function checkPatternLibrary(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.generatedAt !== 'string') return fail('`generatedAt` expected string')
  if (!Array.isArray(value.entries)) return fail('`entries` expected array')
  for (let i = 0; i < value.entries.length; i++) {
    const entryResult = checkPatternLibraryEntry(value.entries[i])
    if (!entryResult.ok) return fail(`\`entries[${i}]\`: ` + entryResult.reason)
  }
  return ok
}

export function checkCruxTagEntry(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.label !== 'string') return fail('`label` expected string')
  if (value.label.trim().length === 0) return fail('`label` expected non-empty string')
  if (typeof value.definition !== 'string') return fail('`definition` expected string')
  if (value.definition.trim().length === 0) return fail('`definition` expected non-empty string')
  // urlSlug is optional at the schema level; the `cruxtag-urlslug`
  // validator enforces presence + uniqueness across the registry. Here
  // we only validate its format when present.
  if (value.urlSlug !== undefined) {
    if (typeof value.urlSlug !== 'string') return fail('`urlSlug` expected string when present')
    if (!KEBAB_CASE.test(value.urlSlug)) {
      return fail(`\`urlSlug\` expected lowercase-kebab-case (got "${value.urlSlug}"; pattern ^[a-z0-9]+(-[a-z0-9]+)*$)`)
    }
  }
  return ok
}

export function checkCruxTagRegistry(value: unknown): Result {
  if (!isObject(value)) return fail('expected object (map of cruxTag slug -> entry)')
  for (const [slug, entry] of Object.entries(value)) {
    if (!KEBAB_CASE.test(slug)) {
      return fail(`registry key \`${slug}\` expected lowercase-kebab-case (pattern ^[a-z0-9]+(-[a-z0-9]+)*$)`)
    }
    const entryResult = checkCruxTagEntry(entry)
    if (!entryResult.ok) return fail(`entry \`${slug}\`: ` + entryResult.reason)
  }
  return ok
}

// Boolean wrappers -- the surface vitest tests have always used. Kept so
// the test files don't need to know about the Result shape.
export const isSource = (v: unknown): v is Source => checkSource(v).ok
export const isPatternReference = (v: unknown): v is PatternReference =>
  checkPatternReference(v).ok
export const isPatternDefinition = (v: unknown): v is PatternDefinition =>
  checkPatternDefinition(v).ok
export const isArticle = (v: unknown): v is Article => checkArticle(v).ok
export const isArticleStat = (v: unknown) => checkArticleStat(v).ok
export const isPatternLibraryArticleRef = (v: unknown): v is PatternLibraryArticleRef =>
  checkPatternLibraryArticleRef(v).ok
export const isPatternLibraryEntry = (v: unknown): v is PatternLibraryEntry =>
  checkPatternLibraryEntry(v).ok
export const isPatternLibrary = (v: unknown): v is PatternLibrary => checkPatternLibrary(v).ok
export const isCruxTagEntry = (v: unknown): v is CruxTagEntry => checkCruxTagEntry(v).ok
export const isCruxTagRegistry = (v: unknown): v is CruxTagRegistry => checkCruxTagRegistry(v).ok
export const isFigure = (v: unknown): v is Figure => checkFigure(v).ok
export const isProblemEssay = (v: unknown): v is ProblemEssay =>
  checkProblemEssay(v).ok
