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
  // The article's named bottleneck. Two to four sentences in
  // near-source language, stating the ONE hard problem the system
  // exists to solve -- never the topic, never the solution.
  // Rendered as the "THE CRUX" callout on the article page between
  // `summary` and the artifact teaser (architecture.md Article
  // Reading Arc). Also compressed into the artifact's context
  // block's PROBLEM line. Required (Taste Doc §3.5; schema'd
  // 2026-07-05).
  crux: string
  // The bottleneck *class* the crux belongs to (kebab-case).
  // e.g. `ambiguous-failure-under-retry`,
  // `priority-blind-load-shedding`. The library's second taxonomy
  // axis -- patterns name solutions, cruxTags name problems.
  // **Reuse across articles is the point** so uniqueness is NOT
  // enforced. There are no cruxTag definition files; recurrence is
  // derived by grouping articles on equal tags. Since the
  // 2026-07-08 landing/navigation phase the catalog page groups
  // articles by `cruxTag` and the cruxTag *registry* at
  // `content/cruxtags.json` supplies the display label + class
  // definition (checked by the `cruxtag-registry-coverage`
  // validator).
  cruxTag: string
  // The one-line crux compression rendered on catalog cards, in
  // problem-class group previews on the landing page, and in
  // search results. Hand-authored, ~10-16 words, in the same
  // source-faithful register as `crux`. This is the browse-surface
  // label; the full `crux` (2-4 sentences) remains the reading-arc
  // callout on the article page. Added 2026-07-08 in the landing/
  // navigation phase and backfilled across all pre-existing
  // articles in the same change. Validator: missing/empty is an
  // error; word-count above ~20 warns (the card assumes one line).
  cruxSummary: string
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
