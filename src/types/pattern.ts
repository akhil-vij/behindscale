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
  // Optional one-line definition (nav-IA v1.4): a single plain sentence that
  // renders as the pattern-detail lede and, when present, the SEO meta
  // description. Authored incrementally via the owner's per-pattern review;
  // absent → the detail header collapses with no reserved gap and SEO falls
  // back to its derivation. Zero authored today (progressive authoring, same
  // as `aliases`/`figures`/`artifact`). See docs/pattern-detail-design or the
  // nav-ia-decisions sanctioned-additions ledger.
  oneLineDefinition?: string
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
  // docs/figures-design.md and scripts/content-hosts.ts.
  figures?: Figure[]
  // Optional interactive artifact -- the same contract as Article.artifact.
  // When present (non-null), `path` resolves to the compiled bundle at
  // /artifacts/<pattern-slug>/index.html and `teaser` (if given) is a
  // non-empty one-line hook. Absent/null ⇒ the pattern page renders no
  // artifact section. Source lives at content/artifacts/<pattern-slug>.jsx
  // under the flat namespace (Approach A). See
  // docs/pattern-artifacts-design.md and scripts/content-hosts.ts.
  artifact?: { path: string; teaser?: string } | null
}
