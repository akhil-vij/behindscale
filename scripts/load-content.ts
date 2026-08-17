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

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  checkArticle,
  checkCruxTagRegistry,
  checkPatternDefinition,
  checkProblemEssay,
} from '../src/types/predicates'
import type {
  Article,
  CruxTagRegistry,
  PatternDefinition,
  ProblemEssay,
} from '../src/types'
import type { CheckError, ContentSet } from './types'

const ARTICLES_DIR = 'content/articles'
const PATTERNS_DIR = 'content/patterns'
const CRUXTAGS_PATH = 'content/cruxtags.json'
const PROBLEMS_DIR = 'content/problems'
const FIGURES_DIR = 'content/figures'

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
  const problemEssays: ProblemEssay[] = []
  let cruxTagRegistry: CruxTagRegistry = {}
  const articlePaths = new Map<string, string>()
  const patternPaths = new Map<string, string>()
  const problemEssayPaths = new Map<string, string>()

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

  // cruxTag registry -- a single file. Missing is treated as an empty
  // registry (the loader logs a schema error, and the
  // cruxtag-registry-coverage check will then flag every article's
  // cruxTag as uncovered, which is the correct signal). A file that
  // exists but fails schema is a schema error and downstream checks
  // see the same empty registry.
  if (existsSync(CRUXTAGS_PATH)) {
    const parsed = readJson(CRUXTAGS_PATH, schemaErrors)
    if (parsed !== undefined) {
      const result = checkCruxTagRegistry(parsed)
      if (!result.ok) {
        schemaErrors.push({
          file: CRUXTAGS_PATH,
          message: result.reason,
          fix: ['shape file as CruxTagRegistry (see src/types/cruxtag.ts)'],
        })
        skippedFileCount += 1
      } else {
        cruxTagRegistry = parsed as CruxTagRegistry
      }
    } else {
      skippedFileCount += 1
    }
  } else {
    schemaErrors.push({
      file: CRUXTAGS_PATH,
      message: 'cruxTag registry file does not exist',
      fix: [
        'create content/cruxtags.json (map of cruxTag slug -> { label, definition })',
      ],
    })
  }

  // Problem essays -- OPTIONAL per-class authored content
  // (content/problems/<cruxTag>.json). The directory need not exist (the
  // normal state today: every class renders fully derived). Schema failures
  // are reported and the file skipped, like articles/patterns. Cross-
  // references (cruxTag resolves, filename match, uniqueness) are the
  // problem-essay check's job.
  if (existsSync(PROBLEMS_DIR)) {
    const problemFiles = readdirSync(PROBLEMS_DIR)
      .filter((name) => name.endsWith('.json'))
      .sort()
    for (const name of problemFiles) {
      const path = join(PROBLEMS_DIR, name)
      const parsed = readJson(path, schemaErrors)
      if (parsed === undefined) {
        skippedFileCount += 1
        continue
      }
      const result = checkProblemEssay(parsed)
      if (!result.ok) {
        schemaErrors.push({
          file: path,
          message: result.reason,
          fix: ['shape file as ProblemEssay (see src/types/problemEssay.ts)'],
        })
        skippedFileCount += 1
        continue
      }
      const essay = parsed as ProblemEssay
      problemEssays.push(essay)
      problemEssayPaths.set(essay.cruxTag, path)
    }
  }

  // Preload figure SVGs for every declared figure on every figure host
  // (articles AND patterns -- both store figures at
  // content/figures/<host-slug>/<figure-slug>.svg). Missing files are
  // stored with `contents: null` so figure-svg-exists can report them
  // consistently; present files are read once and made available to
  // figure-svg-safe + figure-text-vocabulary.
  const figureSvgs = new Map<
    string,
    { path: string; contents: string | null }
  >()
  const figureHostList: Array<{ slug: string; figures: { slug: string }[] }> = [
    ...articles.map((a) => ({ slug: a.slug, figures: a.figures ?? [] })),
    ...patterns.map((p) => ({ slug: p.slug, figures: p.figures ?? [] })),
  ]
  for (const host of figureHostList) {
    for (const figure of host.figures) {
      const key = `${host.slug}/${figure.slug}`
      const path = join(FIGURES_DIR, host.slug, `${figure.slug}.svg`)
      if (!existsSync(path)) {
        figureSvgs.set(key, { path, contents: null })
        continue
      }
      try {
        const raw = readFileSync(path, 'utf8')
        figureSvgs.set(key, { path, contents: raw })
      } catch (err) {
        schemaErrors.push({
          file: path,
          message: `could not read figure SVG: ${(err as Error).message}`,
        })
        figureSvgs.set(key, { path, contents: null })
      }
    }
  }

  return {
    content: {
      articles,
      patterns,
      problemEssays,
      problemEssayPaths,
      cruxTagRegistry,
      articlePaths,
      patternPaths,
      figureSvgs,
    },
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
