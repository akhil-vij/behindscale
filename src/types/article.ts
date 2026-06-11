import type { Source } from './source'
import type { PatternReference } from './pattern'

export interface Article {
  slug: string
  title: string
  url: string
  // ISO YYYY-MM-DD. The date this article was originally published on
  // the source engineering blog -- distinct from the date behindscale
  // published the dissection (see `addedAt` below). Used for the
  // visible source-attribution byline and for JSON-LD
  // isBasedOn.datePublished.
  publishedAt: string
  // ISO YYYY-MM-DD. The date this article first appeared on
  // behindscale's production deploy. Used for sitemap `lastmod`,
  // JSON-LD `datePublished` and `dateModified`, and any future
  // recently-added surface. Leave room for an `updatedAt` field on the
  // day an article is materially revised post-publish; until then,
  // JSON-LD `dateModified` mirrors `addedAt`.
  addedAt: string
  source: Source
  summary: string
  problem: string
  solution: string
  tradeoffs: string[]
  tags: string[]
  patterns: PatternReference[]
  relatedArticles?: string[]
  generatedAt?: string
  artifact: { path: string } | null
}
