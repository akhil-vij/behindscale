// A "figure host" is any content entity that can carry inline figures:
// articles (markers in problem/solution) and pattern definitions
// (markers in definition). The figures feature was article-only at
// first (docs/figures-design.md); this abstraction extends it to
// patterns with minimal per-check change -- every figure validator
// iterates figureHosts() instead of content.articles, so the
// article/pattern difference lives in exactly one place.
//
// Storage/URL convention is unchanged and host-agnostic:
//   content/figures/<host-slug>/<figure-slug>.svg
//   -> /figures/<host-slug>/<figure-slug>.svg
// where <host-slug> is the article slug OR the pattern slug.

import type { ContentSet } from './types'
import type { Figure } from '../src/types'

export interface FigureHost {
  // Article slug OR pattern slug; drives the figures dir + public URL.
  readonly slug: string
  // 'article' | 'pattern' -- used for host-aware error wording.
  readonly kind: 'article' | 'pattern'
  readonly figures: readonly Figure[]
  // Fields where {{figure:...}} markers are ALLOWED: [displayName, text].
  readonly markerFields: ReadonlyArray<readonly [string, string]>
  // Fields where markers are FORBIDDEN: [displayName, text].
  readonly forbiddenFields: ReadonlyArray<readonly [string, string]>
  // CheckError locator for this host (spread into pushed errors).
  readonly ref: { articleSlug: string } | { patternSlug: string }
}

export function figureHosts(content: ContentSet): FigureHost[] {
  const hosts: FigureHost[] = []

  for (const a of content.articles) {
    const forbidden: Array<readonly [string, string]> = [
      ['summary', a.summary],
      ['crux', a.crux],
      ['cruxSummary', a.cruxSummary],
    ]
    for (const t of a.tradeoffs) forbidden.push(['tradeoffs[]', t])
    for (const p of a.patterns) {
      forbidden.push([`patterns["${p.slug}"].note`, p.note])
    }
    hosts.push({
      slug: a.slug,
      kind: 'article',
      figures: a.figures ?? [],
      markerFields: [
        ['problem', a.problem],
        ['solution', a.solution],
      ],
      forbiddenFields: forbidden,
      ref: { articleSlug: a.slug },
    })
  }

  for (const p of content.patterns) {
    const forbidden: Array<readonly [string, string]> = []
    for (const w of p.whenItApplies) forbidden.push(['whenItApplies[]', w])
    for (const t of p.tradeoffs) forbidden.push(['tradeoffs[]', t])
    hosts.push({
      slug: p.slug,
      kind: 'pattern',
      figures: p.figures ?? [],
      markerFields: [['definition', p.definition]],
      forbiddenFields: forbidden,
      ref: { patternSlug: p.slug },
    })
  }

  return hosts
}
