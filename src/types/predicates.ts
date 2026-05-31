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
  return ok
}

export function checkArticle(value: unknown): Result {
  if (!isObject(value)) return fail('expected object')
  if (typeof value.slug !== 'string') return fail('`slug` expected string')
  if (typeof value.title !== 'string') return fail('`title` expected string')
  if (typeof value.url !== 'string') return fail('`url` expected string')
  if (typeof value.publishedAt !== 'string') return fail('`publishedAt` expected string')
  const sourceResult = checkSource(value.source)
  if (!sourceResult.ok) return fail('`source`: ' + sourceResult.reason)
  if (typeof value.summary !== 'string') return fail('`summary` expected string')
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
    if (!isObject(value.artifact)) return fail('`artifact` expected object or null')
    if (typeof value.artifact.path !== 'string') return fail('`artifact.path` expected string')
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

// Boolean wrappers -- the surface vitest tests have always used. Kept so
// the test files don't need to know about the Result shape.
export const isSource = (v: unknown): v is Source => checkSource(v).ok
export const isPatternReference = (v: unknown): v is PatternReference =>
  checkPatternReference(v).ok
export const isPatternDefinition = (v: unknown): v is PatternDefinition =>
  checkPatternDefinition(v).ok
export const isArticle = (v: unknown): v is Article => checkArticle(v).ok
export const isPatternLibraryArticleRef = (v: unknown): v is PatternLibraryArticleRef =>
  checkPatternLibraryArticleRef(v).ok
export const isPatternLibraryEntry = (v: unknown): v is PatternLibraryEntry =>
  checkPatternLibraryEntry(v).ok
export const isPatternLibrary = (v: unknown): v is PatternLibrary => checkPatternLibrary(v).ok
