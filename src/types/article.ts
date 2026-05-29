import type { Source } from './source'
import type { PatternReference } from './pattern'

export interface Article {
  slug: string
  title: string
  url: string
  publishedAt: string
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
