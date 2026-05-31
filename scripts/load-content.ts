// Schema-validating content loader. Walks content/articles/ and
// content/patterns/, parses each JSON, validates against the schema
// predicates from src/types/predicates.ts, and assembles the
// ContentSet that downstream checks consume. Errors collected here
// are reported under the [schema] section of the validator output --
// the SCHEMA_SECTION_NAME export below is grep-able as the label
// producer.
//
// Files that fail schema validation are skipped from the ContentSet
// (and from subsequent checks for that file). All schema errors are
// reported in one pass -- the loader doesn't stop at the first.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { checkArticle, checkPatternDefinition } from '../src/types/predicates'
import type { Article, PatternDefinition } from '../src/types'
import type { CheckError, ContentSet } from './types'

const ARTICLES_DIR = 'content/articles'
const PATTERNS_DIR = 'content/patterns'

// The [schema] section label is owned here so a future renamer can
// grep this constant for the producer + every consumer in one shot.
export const SCHEMA_SECTION_NAME = 'schema'

export interface LoadResult {
  readonly content: ContentSet
  readonly schemaErrors: readonly CheckError[]
  readonly skippedFileCount: number
}

/**
 * Excludes `content/patterns/index.json` -- that file is reserved for
 * the future derived aggregated pattern library (architecture.md,
 * Content Contract section). Mirrors the exclusion in
 * src/content/index.ts's pattern glob negation. **Both must stay in
 * sync** -- once Unit 4+ starts writing index.json, the website indexer
 * and this validator both have to refuse to treat it as a
 * PatternDefinition.
 */
export function isPatternDefinitionFile(name: string): boolean {
  return name.endsWith('.json') && name !== 'index.json'
}

export function loadContent(): LoadResult {
  const schemaErrors: CheckError[] = []
  let skippedFileCount = 0
  const articles: Article[] = []
  const patterns: PatternDefinition[] = []
  const articlePaths = new Map<string, string>()
  const patternPaths = new Map<string, string>()

  // Articles
  const articleFiles = readdirSync(ARTICLES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
  for (const name of articleFiles) {
    const path = join(ARTICLES_DIR, name)
    const parsed = readJson(path, schemaErrors)
    if (parsed === undefined) {
      skippedFileCount += 1
      continue
    }
    const result = checkArticle(parsed)
    if (!result.ok) {
      schemaErrors.push({
        file: path,
        message: result.reason,
        fix: ['shape file as Article (see src/types/article.ts)'],
      })
      skippedFileCount += 1
      continue
    }
    // checkArticle verified shape above; the cast carries that
    // guarantee through TS's type system, which can't narrow from a
    // Result return alone.
    const article = parsed as Article
    articles.push(article)
    articlePaths.set(article.slug, path)
  }

  // Patterns -- excludes index.json via isPatternDefinitionFile.
  const patternFiles = readdirSync(PATTERNS_DIR)
    .filter(isPatternDefinitionFile)
    .sort()
  for (const name of patternFiles) {
    const path = join(PATTERNS_DIR, name)
    const parsed = readJson(path, schemaErrors)
    if (parsed === undefined) {
      skippedFileCount += 1
      continue
    }
    const result = checkPatternDefinition(parsed)
    if (!result.ok) {
      schemaErrors.push({
        file: path,
        message: result.reason,
        fix: ['shape file as PatternDefinition (see src/types/pattern.ts)'],
      })
      skippedFileCount += 1
      continue
    }
    // checkPatternDefinition verified shape above; the cast carries
    // that guarantee through TS's type system.
    const pattern = parsed as PatternDefinition
    patterns.push(pattern)
    patternPaths.set(pattern.slug, path)
  }

  return {
    content: { articles, patterns, articlePaths, patternPaths },
    schemaErrors,
    skippedFileCount,
  }
}

function readJson(path: string, schemaErrors: CheckError[]): unknown {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (err) {
    schemaErrors.push({
      file: path,
      message: `could not read file: ${(err as Error).message}`,
    })
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch (err) {
    schemaErrors.push({
      file: path,
      message: `JSON parse failed: ${(err as Error).message}`,
      fix: ['fix the JSON syntax in this file'],
    })
    return undefined
  }
}
