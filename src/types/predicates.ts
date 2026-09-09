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

// Shared validation for an optional `keywords` array (findability Batch 3):
// search-only terms on an Article or a CruxTagEntry. Non-empty strings, no
// duplicates. Case is NOT forced (unlike pattern `aliases`) -- codenames like
// "Orpheus" render in the matched: line in their authored form. `noun` tunes
// the message.
export function checkKeywordsField(keywords: unknown, noun: string): Result {
  if (!isStringArray(keywords)) return fail(`\`keywords\` expected string[] when present`)
  for (const kw of keywords) {
    if (kw.trim().length === 0) return fail(`\`keywords\` entries must be non-empty`)
  }
  if (new Set(keywords).size !== keywords.length) {
    return fail(`\`keywords\` must not contain duplicates (per ${noun})`)
  }
  return ok
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
  // Optional mechanism-section copy (nav-IA v1.5). Object of optional
  // non-empty strings; render-when-present per field.
  if (value.mechanism !== undefined) {
    if (!isObject(value.mechanism)) {
      return fail('`mechanism` expected object when present')
    }
    for (const key of ['caption', 'blurb', 'idea', 'whatToTry'] as const) {
      const v = value.mechanism[key]
      if (v === undefined) continue
      if (typeof v !== 'string') {
        return fail(`\`mechanism.${key}\` expected string when present`)
      }
      if (v.trim().length === 0) {
        return fail(`\`mechanism.${key}\` must be non-empty when present`)
      }
    }
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
  if (value.keywords !== undefined) {
    const keywordsResult = checkKeywordsField(value.keywords, 'article')
    if (!keywordsResult.ok) return keywordsResult
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

// Problem-essay schema (docs/problem-page-design.md §5/§9; v7.3 rich
// blocks 2026-09-06). Every field except `cruxTag` is optional -- an absent
// field means "render the derived placeholder". This predicate validates
// SHAPE only; cross-references (cruxTag resolves to a registry entry,
// filename match, uniqueness, member/pattern/svg/artifact resolution) live
// in the `problem-essay` check. `extraSections` is validated shallowly
// (field stub).
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
  if (value.howItWorks !== undefined) {
    if (!nonEmptyStringArray(value.howItWorks) || value.howItWorks.length === 0) {
      return fail('`howItWorks` expected non-empty array of non-empty strings when present')
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
  if (value.figures !== undefined) {
    const figuresResult = checkFiguresField(value.figures, 'problem essay')
    if (!figuresResult.ok) return figuresResult
  }
  // -- v7.3 rich blocks. Each helper returns the first failure it finds. --
  const richChecks: ReadonlyArray<readonly [string, (v: unknown) => Result]> = [
    ['stations', checkProblemStations],
    ['wall', checkProblemWall],
    ['tryIt', checkProblemTryIt],
    ['mission', checkProblemMission],
    ['comparison', checkProblemComparison],
    ['decide', checkProblemDecide],
    ['steal', checkProblemSteal],
    ['interview', checkProblemInterview],
    ['patterns', checkProblemPatternsSection],
    ['cards', checkProblemCards],
    ['sources', checkProblemSources],
  ]
  for (const [field, check] of richChecks) {
    if (value[field] === undefined) continue
    const result = check(value[field])
    if (!result.ok) return fail(`\`${field}\`: ` + result.reason)
  }
  return ok
}

// -- helpers for the v7.3 rich blocks ------------------------------------

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function nonEmptyStringArray(v: unknown): v is string[] {
  return isStringArray(v) && v.every((s) => s.trim().length > 0)
}

// Fields that must be non-empty strings when present (optional) or always
// (required). Returns the first failing field's reason, else ok.
function checkStringFields(
  obj: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): Result {
  for (const key of required) {
    if (!nonEmptyString(obj[key])) return fail(`\`${key}\` expected non-empty string`)
  }
  for (const key of optional) {
    if (obj[key] !== undefined && !nonEmptyString(obj[key])) {
      return fail(`\`${key}\` expected non-empty string when present`)
    }
  }
  return ok
}

function checkOptionalBool(obj: Record<string, unknown>, key: string): Result {
  if (obj[key] !== undefined && typeof obj[key] !== 'boolean') {
    return fail(`\`${key}\` expected boolean when present`)
  }
  return ok
}

function checkProblemStations(value: unknown): Result {
  if (!Array.isArray(value) || value.length === 0) return fail('expected non-empty array')
  const ids = new Set<string>()
  for (let i = 0; i < value.length; i++) {
    const s = value[i]
    if (!isObject(s)) return fail(`[${i}] expected object`)
    const r = checkStringFields(s, ['id', 'anchor', 'label'])
    if (!r.ok) return fail(`[${i}]: ${r.reason}`)
    if (!KEBAB_CASE.test(s.id as string)) return fail(`[${i}].id expected kebab-case`)
    if (ids.has(s.id as string)) return fail(`[${i}].id "${s.id}" duplicates an earlier station`)
    ids.add(s.id as string)
    if (
      s.minutes !== null &&
      (typeof s.minutes !== 'number' || !Number.isInteger(s.minutes) || s.minutes < 0)
    ) {
      return fail(`[${i}].minutes expected non-negative integer or null`)
    }
    for (const key of ['openEnded', 'estimate']) {
      const b = checkOptionalBool(s, key)
      if (!b.ok) return fail(`[${i}]: ${b.reason}`)
    }
    if (s.estimate === true && s.minutes === null) {
      return fail(`[${i}] counts toward the estimate but has no minutes`)
    }
  }
  return ok
}

function checkProblemWall(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyStringArray(value.prose) || value.prose.length === 0) {
    return fail('`prose` expected non-empty array of non-empty strings')
  }
  const r = checkStringFields(value, [], ['figureSlug', 'statsCaption'])
  if (!r.ok) return r
  if (value.figureSlug !== undefined && !KEBAB_CASE.test(value.figureSlug as string)) {
    return fail('`figureSlug` expected kebab-case')
  }
  if (value.stats !== undefined) {
    if (!Array.isArray(value.stats)) return fail('`stats` expected array when present')
    for (let i = 0; i < value.stats.length; i++) {
      const st = value.stats[i]
      if (!isObject(st)) return fail(`\`stats[${i}]\` expected object`)
      const sr = checkStringFields(st, ['value', 'label', 'source'])
      if (!sr.ok) return fail(`\`stats[${i}]\`: ${sr.reason}`)
    }
  }
  return ok
}

function checkProblemTryIt(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  const r = checkStringFields(value, ['artifactSlug', 'teaser', 'caption'], ['noscript'])
  if (!r.ok) return r
  if (!KEBAB_CASE.test(value.artifactSlug as string)) return fail('`artifactSlug` expected kebab-case')
  return ok
}

// Where the shell composes the "<N> decisions are yours — ... — and the goal
// is a day of traffic, survived." sentence inside `mission.intro`.
const DECISIONS_MARKER = '{{decisions}}'

function checkProblemMission(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  const r = checkStringFields(
    value,
    ['artifactSlug', 'teaser', 'title', 'intro'],
    ['stopblock', 'stuckNote', 'decisionsSummary'],
  )
  if (!r.ok) return r
  if (!KEBAB_CASE.test(value.artifactSlug as string)) return fail('`artifactSlug` expected kebab-case')
  if (value.outline !== undefined) {
    const o = checkProblemMissionOutline(value.outline)
    if (!o.ok) return fail(`\`outline\`: ${o.reason}`)
  }
  const markers = (value.intro as string).split(DECISIONS_MARKER).length - 1
  if (value.decisionsSummary !== undefined) {
    if (value.outline === undefined) {
      return fail('`decisionsSummary` needs `outline` (the sentence counts `outline.decisions`)')
    }
    if (markers !== 1) {
      return fail(`\`intro\` must carry the ${DECISIONS_MARKER} marker exactly once when \`decisionsSummary\` is present (found ${markers})`)
    }
  } else if (markers > 0) {
    return fail(`\`intro\` carries ${DECISIONS_MARKER} but there is no \`decisionsSummary\` to compose`)
  }
  return ok
}

function checkProblemMissionOutline(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!Array.isArray(value.decisions) || value.decisions.length === 0) {
    return fail('`decisions` expected non-empty array')
  }
  for (let i = 0; i < value.decisions.length; i++) {
    const d = value.decisions[i]
    if (!isObject(d) || !nonEmptyString(d.label)) return fail(`\`decisions[${i}]\` expected { label, options[] }`)
    if (!nonEmptyStringArray(d.options) || d.options.length === 0) {
      return fail(`\`decisions[${i}].options\` expected non-empty array of non-empty strings`)
    }
  }
  if (!nonEmptyStringArray(value.events) || value.events.length === 0) {
    return fail('`events` expected non-empty array of non-empty strings')
  }
  if (!Array.isArray(value.attacks) || value.attacks.length === 0) {
    return fail('`attacks` expected non-empty array')
  }
  for (let i = 0; i < value.attacks.length; i++) {
    const a = value.attacks[i]
    if (!isObject(a)) return fail(`\`attacks[${i}]\` expected object`)
    const ar = checkStringFields(a, ['company', 'year', 'text'])
    if (!ar.ok) return fail(`\`attacks[${i}]\`: ${ar.reason}`)
  }
  return ok
}

const LEGEND_KINDS = new Set(['key', 'state', 'reply', 'break'])

function checkProblemComparison(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  const r = checkStringFields(
    value,
    ['title', 'lede', 'diagramTitle'],
    ['stripNote', 'matrixLead', 'matrixCaption'],
  )
  if (!r.ok) return r

  // spectrum
  const sp = value.spectrum
  if (!isObject(sp)) return fail('`spectrum` expected object')
  const spr = checkStringFields(sp, ['eyebrow', 'caption'])
  if (!spr.ok) return fail(`\`spectrum\`: ${spr.reason}`)
  if (!Array.isArray(sp.points) || sp.points.length === 0) {
    return fail('`spectrum.points` expected non-empty array')
  }
  for (let i = 0; i < sp.points.length; i++) {
    const pt = sp.points[i]
    if (!isObject(pt) || !nonEmptyString(pt.label)) {
      return fail(`\`spectrum.points[${i}]\` expected { label, left, up? }`)
    }
    if (typeof pt.left !== 'number' || pt.left < 0 || pt.left > 100) {
      return fail(`\`spectrum.points[${i}].left\` expected number 0-100`)
    }
    const b = checkOptionalBool(pt, 'up')
    if (!b.ok) return fail(`\`spectrum.points[${i}]\`: ${b.reason}`)
  }
  if (!nonEmptyStringArray(sp.ends) || sp.ends.length !== 2) {
    return fail('`spectrum.ends` expected [left, right] non-empty strings')
  }

  // legend
  if (!Array.isArray(value.legend)) return fail('`legend` expected array')
  for (let i = 0; i < value.legend.length; i++) {
    const item = value.legend[i]
    if (!isObject(item) || !nonEmptyString(item.label)) {
      return fail(`\`legend[${i}]\` expected { kind, label }`)
    }
    if (typeof item.kind !== 'string' || !LEGEND_KINDS.has(item.kind)) {
      return fail(`\`legend[${i}].kind\` expected one of key|state|reply|break`)
    }
  }

  // diagram rows
  if (!Array.isArray(value.diagramRows) || value.diagramRows.length === 0) {
    return fail('`diagramRows` expected non-empty array')
  }
  for (let i = 0; i < value.diagramRows.length; i++) {
    const row = value.diagramRows[i]
    if (!isObject(row)) return fail(`\`diagramRows[${i}]\` expected object`)
    const rr = checkStringFields(row, ['company', 'year', 'vantage', 'svg', 'caption'], ['articleSlug'])
    if (!rr.ok) return fail(`\`diagramRows[${i}]\`: ${rr.reason}`)
    if (!KEBAB_CASE.test(row.svg as string)) return fail(`\`diagramRows[${i}].svg\` expected kebab-case`)
    const b = checkOptionalBool(row, 'open')
    if (!b.ok) return fail(`\`diagramRows[${i}]\`: ${b.reason}`)
  }

  // you row
  const you = value.you
  if (!isObject(you)) return fail('`you` expected object')
  const yr = checkStringFields(you, ['name', 'year', 'vantage', 'emptySvg', 'filledSvg'])
  if (!yr.ok) return fail(`\`you\`: ${yr.reason}`)
  for (const key of ['emptySvg', 'filledSvg']) {
    if (!KEBAB_CASE.test(you[key] as string)) return fail(`\`you.${key}\` expected kebab-case`)
  }
  const yb = checkOptionalBool(you, 'open')
  if (!yb.ok) return fail(`\`you\`: ${yb.reason}`)

  // matrix
  if (!nonEmptyStringArray(value.columns) || value.columns.length === 0) {
    return fail('`columns` expected non-empty array of non-empty strings')
  }
  if (!isObject(value.youColumn)) return fail('`youColumn` expected object')
  const ycr = checkStringFields(value.youColumn, ['emptyLabel', 'label'])
  if (!ycr.ok) return fail(`\`youColumn\`: ${ycr.reason}`)
  if (!Array.isArray(value.matrixRows) || value.matrixRows.length === 0) {
    return fail('`matrixRows` expected non-empty array')
  }
  const rowIds = new Set<string>()
  for (let i = 0; i < value.matrixRows.length; i++) {
    const row = value.matrixRows[i]
    if (!isObject(row)) return fail(`\`matrixRows[${i}]\` expected object`)
    const rr = checkStringFields(row, ['id', 'label'], ['qref'])
    if (!rr.ok) return fail(`\`matrixRows[${i}]\`: ${rr.reason}`)
    if (!/^[a-z][a-zA-Z0-9]*$/.test(row.id as string)) {
      return fail(`\`matrixRows[${i}].id\` expected an identifier (matches a youMapping key)`)
    }
    if (rowIds.has(row.id as string)) return fail(`\`matrixRows[${i}].id\` "${row.id}" duplicates an earlier row`)
    rowIds.add(row.id as string)
    if (!Array.isArray(row.cells) || row.cells.length !== value.columns.length) {
      return fail(`\`matrixRows[${i}].cells\` expected ${value.columns.length} entries (one per column)`)
    }
    for (let j = 0; j < row.cells.length; j++) {
      const cell = row.cells[j]
      const okCell =
        nonEmptyString(cell) || (isObject(cell) && nonEmptyString(cell.ns))
      if (!okCell) return fail(`\`matrixRows[${i}].cells[${j}]\` expected string or { ns }`)
    }
    for (const key of ['lead', 'hot']) {
      const b = checkOptionalBool(row, key)
      if (!b.ok) return fail(`\`matrixRows[${i}]\`: ${b.reason}`)
    }
  }

  // questions
  if (!Array.isArray(value.questions) || value.questions.length === 0) {
    return fail('`questions` expected non-empty array')
  }
  const qIds = new Set<string>()
  for (let i = 0; i < value.questions.length; i++) {
    const q = value.questions[i]
    if (!isObject(q)) return fail(`\`questions[${i}]\` expected object`)
    const qr = checkStringFields(q, ['id', 'title'], ['why'])
    if (!qr.ok) return fail(`\`questions[${i}]\`: ${qr.reason}`)
    if (!KEBAB_CASE.test(q.id as string)) return fail(`\`questions[${i}].id\` expected kebab-case`)
    if (qIds.has(q.id as string)) return fail(`\`questions[${i}].id\` "${q.id}" duplicates an earlier question`)
    qIds.add(q.id as string)
    if (q.figure !== undefined) {
      if (!isObject(q.figure) || !nonEmptyString(q.figure.svg) || !KEBAB_CASE.test(q.figure.svg)) {
        return fail(`\`questions[${i}].figure\` expected { svg (kebab-case), caption? }`)
      }
      if (q.figure.caption !== undefined && !nonEmptyString(q.figure.caption)) {
        return fail(`\`questions[${i}].figure.caption\` expected non-empty string when present`)
      }
    }
    if (!Array.isArray(q.answers) || q.answers.length === 0) {
      return fail(`\`questions[${i}].answers\` expected non-empty array`)
    }
    for (let j = 0; j < q.answers.length; j++) {
      const a = q.answers[j]
      if (!isObject(a)) return fail(`\`questions[${i}].answers[${j}]\` expected object`)
      const ar = checkStringFields(a, ['company', 'text'], ['year'])
      if (!ar.ok) return fail(`\`questions[${i}].answers[${j}]\`: ${ar.reason}`)
      const b = checkOptionalBool(a, 'ns')
      if (!b.ok) return fail(`\`questions[${i}].answers[${j}]\`: ${b.reason}`)
    }
    for (const key of ['open', 'hot']) {
      const b = checkOptionalBool(q, key)
      if (!b.ok) return fail(`\`questions[${i}]\`: ${b.reason}`)
    }
  }
  // Every matrix qref must name a question.
  for (const row of value.matrixRows as Record<string, unknown>[]) {
    if (row.qref !== undefined && !qIds.has(row.qref as string)) {
      return fail(`\`matrixRows\` row "${row.id}" qref "${row.qref}" names no question`)
    }
  }
  return ok
}

function checkProblemDecide(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyString(value.intro)) return fail('`intro` expected non-empty string')
  if (!Array.isArray(value.rows) || value.rows.length === 0) return fail('`rows` expected non-empty array')
  for (let i = 0; i < value.rows.length; i++) {
    const row = value.rows[i]
    if (!isObject(row)) return fail(`\`rows[${i}]\` expected object`)
    const r = checkStringFields(row, ['if', 'then'])
    if (!r.ok) return fail(`\`rows[${i}]\`: ${r.reason}`)
    if (row.highlights !== undefined && (!nonEmptyStringArray(row.highlights) || row.highlights.length === 0)) {
      return fail(`\`rows[${i}].highlights\` expected non-empty array of non-empty strings when present`)
    }
  }
  if (value.elsewhere !== undefined) {
    if (!isObject(value.elsewhere)) return fail('`elsewhere` expected object when present')
    const r = checkStringFields(value.elsewhere, ['title', 'text'])
    if (!r.ok) return fail(`\`elsewhere\`: ${r.reason}`)
  }
  return ok
}

function checkProblemSteal(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyString(value.intro)) return fail('`intro` expected non-empty string')
  if (!Array.isArray(value.items) || value.items.length === 0) return fail('`items` expected non-empty array')
  for (let i = 0; i < value.items.length; i++) {
    const item = value.items[i]
    if (!isObject(item)) return fail(`\`items[${i}]\` expected object`)
    const r = checkStringFields(item, ['rule', 'text'], ['qref'])
    if (!r.ok) return fail(`\`items[${i}]\`: ${r.reason}`)
  }
  return ok
}

function checkProblemInterview(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyStringArray(value.asks) || value.asks.length === 0) {
    return fail('`asks` expected non-empty array of non-empty strings')
  }
  const r = checkStringFields(value, ['shape', 'followupsIntro', 'senior', 'staff', 'closing'])
  if (!r.ok) return r
  if (!Array.isArray(value.followups) || value.followups.length === 0) {
    return fail('`followups` expected non-empty array')
  }
  for (let i = 0; i < value.followups.length; i++) {
    const f = value.followups[i]
    if (!isObject(f)) return fail(`\`followups[${i}]\` expected object`)
    const fr = checkStringFields(f, ['ask', 'attack', 'held'])
    if (!fr.ok) return fail(`\`followups[${i}]\`: ${fr.reason}`)
  }
  if (!nonEmptyStringArray(value.redFlags)) {
    return fail('`redFlags` expected array of non-empty strings')
  }
  return ok
}

function checkProblemPatternsSection(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyString(value.intro)) return fail('`intro` expected non-empty string')
  if (value.order !== undefined) {
    if (!nonEmptyStringArray(value.order)) return fail('`order` expected array of pattern slugs when present')
    if (new Set(value.order).size !== value.order.length) return fail('`order` must not repeat a slug')
  }
  return ok
}

function checkProblemCards(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  const r = checkStringFields(value, ['intro'], ['title'])
  if (!r.ok) return r
  if (value.teasers !== undefined) {
    if (!isObject(value.teasers)) return fail('`teasers` expected object (articleSlug -> line) when present')
    for (const [slug, line] of Object.entries(value.teasers)) {
      if (!nonEmptyString(line)) return fail(`\`teasers.${slug}\` expected non-empty string`)
    }
  }
  return ok
}

function checkProblemSources(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (!nonEmptyString(value.intro)) return fail('`intro` expected non-empty string')
  if (!Array.isArray(value.items) || value.items.length === 0) return fail('`items` expected non-empty array')
  for (let i = 0; i < value.items.length; i++) {
    const item = value.items[i]
    if (!isObject(item)) return fail(`\`items[${i}]\` expected object`)
    const r = checkStringFields(item, ['label', 'articleSlug'])
    if (!r.ok) return fail(`\`items[${i}]\`: ${r.reason}`)
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
  if (value.keywords !== undefined) {
    const keywordsResult = checkKeywordsField(value.keywords, 'cruxTag entry')
    if (!keywordsResult.ok) return keywordsResult
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
