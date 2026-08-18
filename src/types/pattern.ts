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
  // Optional search aliases (nav-IA v1.2): 1-3 lowercase industry-vocabulary
  // terms that bridge a reader's arrival vocabulary to the house-coined name
  // (e.g. "partitioning" -> Application-Layer Sharding). Search data only,
  // surfaced on the /patterns card's `matches:` line when an alias hits.
  // Authored incrementally via the owner's per-pattern review; never generated.
  aliases?: string[]
  // Optional inline figures, placed in `definition` via {{figure:<slug>}}
  // markers -- the same mechanism as Article.figures. Zero-to-many;
  // same word bands and count ceiling. Stored at
  // content/figures/<pattern-slug>/<figure-slug>.svg. See
  // docs/figures-design.md and scripts/figure-hosts.ts.
  figures?: Figure[]
}
