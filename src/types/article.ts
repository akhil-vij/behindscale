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
  // behindscale's production deploy. Used for sitemap `lastmod` (when
  // `updatedAt` is absent), JSON-LD `datePublished`, and any future
  // recently-added surface.
  addedAt: string
  // ISO YYYY-MM-DD. The date of the last material post-publish revision
  // to this article (rewrite to source, corrections, pattern reattribution).
  // Sources JSON-LD `dateModified` and sitemap `lastmod` when present;
  // when absent, both fall back to `addedAt`.
  updatedAt?: string
  source: Source
  summary: string
  problem: string
  solution: string
  tradeoffs: string[]
  tags: string[]
  patterns: PatternReference[]
  relatedArticles?: string[]
  generatedAt?: string
  // Artifact pointer. `path` resolves to the compiled bundle at
  // /artifacts/<slug>/index.html. Optional `teaser` is an editorial
  // one-line description of what the reader can DO inside the
  // artifact, surfaced by `ArtifactTeaser` between summary and Problem.
  // Specificity principle (Unit 10): no generic fallback copy -- the
  // teaser card renders only when `teaser` is present; a vague hook is
  // worse than none.
  artifact: { path: string; teaser?: string } | null
  // Pull-stat callouts (Unit 10). Max 3 per article, editorially
  // enforced by the stats-value-in-prose validator check. Each value
  // must appear in this article's own prose (problem/solution/
  // tradeoffs) -- the field is a lift, not a source of new claims.
  // `placement` controls which prose section the callout renders
  // after.
  stats?: ArticleStat[]
}

export interface ArticleStat {
  value: string
  label: string
  placement: 'problem' | 'solution' | 'tradeoffs'
}
