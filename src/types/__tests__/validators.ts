import type { Source } from '../source'
import type { PatternReference, PatternDefinition } from '../pattern'
import type { Article } from '../article'
import type {
  PatternLibrary,
  PatternLibraryEntry,
  PatternLibraryArticleRef,
} from '../pattern-library'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export function isSource(value: unknown): value is Source {
  if (!isObject(value)) return false
  return (
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.company === 'string' &&
    typeof value.url === 'string' &&
    typeof value.feed === 'string'
  )
}

export function isPatternReference(value: unknown): value is PatternReference {
  if (!isObject(value)) return false
  return typeof value.slug === 'string' && typeof value.note === 'string'
}

export function isPatternDefinition(value: unknown): value is PatternDefinition {
  if (!isObject(value)) return false
  return (
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    typeof value.definition === 'string' &&
    isStringArray(value.whenItApplies) &&
    isStringArray(value.tradeoffs) &&
    (value.category === undefined || typeof value.category === 'string')
  )
}

export function isArticle(value: unknown): value is Article {
  if (!isObject(value)) return false
  if (typeof value.slug !== 'string') return false
  if (typeof value.title !== 'string') return false
  if (typeof value.url !== 'string') return false
  if (typeof value.publishedAt !== 'string') return false
  if (!isSource(value.source)) return false
  if (typeof value.summary !== 'string') return false
  if (typeof value.problem !== 'string') return false
  if (typeof value.solution !== 'string') return false
  if (!isStringArray(value.tradeoffs)) return false
  if (!isStringArray(value.tags)) return false
  if (!Array.isArray(value.patterns) || !value.patterns.every(isPatternReference)) return false
  if (value.relatedArticles !== undefined && !isStringArray(value.relatedArticles)) return false
  if (value.generatedAt !== undefined && typeof value.generatedAt !== 'string') return false
  if (!('artifact' in value)) return false
  const a = value.artifact
  if (a !== null) {
    if (!isObject(a)) return false
    if (typeof a.path !== 'string') return false
  }
  return true
}

export function isPatternLibraryArticleRef(
  value: unknown,
): value is PatternLibraryArticleRef {
  if (!isObject(value)) return false
  return (
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    isSource(value.source) &&
    typeof value.note === 'string'
  )
}

export function isPatternLibraryEntry(value: unknown): value is PatternLibraryEntry {
  if (!isObject(value)) return false
  if (!isPatternDefinition(value.definition)) return false
  if (typeof value.frequency !== 'number') return false
  if (!Array.isArray(value.articles) || !value.articles.every(isPatternLibraryArticleRef)) {
    return false
  }
  if (!isStringArray(value.companies)) return false
  return true
}

export function isPatternLibrary(value: unknown): value is PatternLibrary {
  if (!isObject(value)) return false
  if (typeof value.generatedAt !== 'string') return false
  if (!Array.isArray(value.entries) || !value.entries.every(isPatternLibraryEntry)) {
    return false
  }
  return true
}
