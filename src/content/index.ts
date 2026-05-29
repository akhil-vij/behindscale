// Build-time content indexer. Every page and component reads content from
// here so file paths and glob patterns live in exactly one place. Vite's
// import.meta.glob bundles all matched JSON into the JS bundle at build
// time — no runtime network fetching (invariant 1).
//
// Schemas are type-only imports from src/types/ (the single permitted
// cross-boundary surface per invariant 3). Runtime validation of these
// JSON files is enforced by the build-time validator in Unit 4; this
// module trusts the schema.

import type { Article, PatternDefinition } from '../types'

const articleModules = import.meta.glob<Article>(
  '/content/articles/*.json',
  { eager: true, import: 'default' },
)

const patternModules = import.meta.glob<PatternDefinition>(
  '/content/patterns/*.json',
  { eager: true, import: 'default' },
)

// content/patterns/index.json is reserved for the derived aggregated
// pattern library (architecture.md). It is NOT a pattern definition file
// and must be excluded if/when it appears.
function isPatternDefinitionPath(path: string): boolean {
  return !path.endsWith('/index.json')
}

export const articles: Article[] = Object.values(articleModules).sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
)

export const articleBySlug: ReadonlyMap<string, Article> = new Map(
  articles.map((a) => [a.slug, a]),
)

export const patterns: PatternDefinition[] = Object.entries(patternModules)
  .filter(([path]) => isPatternDefinitionPath(path))
  .map(([, def]) => def)
  .sort((a, b) => a.name.localeCompare(b.name))

export const patternBySlug: ReadonlyMap<string, PatternDefinition> = new Map(
  patterns.map((p) => [p.slug, p]),
)
