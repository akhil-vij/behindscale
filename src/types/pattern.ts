import type { Figure } from './figure'

export interface PatternReference {
  slug: string
  note: string
}

export interface PatternDefinition {
  slug: string
  name: string
  definition: string
  whenItApplies: string[]
  tradeoffs: string[]
  category?: string
  // Optional inline figures, placed in `definition` via {{figure:<slug>}}
  // markers -- the same mechanism as Article.figures. Zero-to-many;
  // same word bands and count ceiling. Stored at
  // content/figures/<pattern-slug>/<figure-slug>.svg. See
  // docs/figures-design.md and scripts/figure-hosts.ts.
  figures?: Figure[]
}
