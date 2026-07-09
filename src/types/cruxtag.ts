// The cruxTag registry (`content/cruxtags.json`) — one hand-authored
// entry per cruxTag slug used across the article library. Landed in the
// 2026-07-08 landing/navigation phase because the catalog page groups
// articles by cruxTag and needs a display label + a class definition to
// render the group header + the definition line + the JSON-LD
// `DefinedTerm` for structured data.
//
// - `label` — the display form. Controls capitalization and hyphenation
//   exactly; do not humanize the slug.
// - `definition` — one sentence naming the bottleneck *class*, not any
//   one company's incident. Company-neutral, sentence-case, ~12-20 words.
//
// Consumed by the catalog group headers, the article-page lateral chip
// linking to `/catalog#term-<slug>`, and the `DefinedTermSet` JSON-LD
// on `/catalog`. Validator (Commit 1): every distinct `cruxTag` used by
// any article must have a registry entry; label + definition must be
// non-empty. No orphan rule the other direction — a registry entry with
// zero articles is allowed (supports future article removals).

export interface CruxTagEntry {
  label: string
  definition: string
}

export type CruxTagRegistry = Record<string, CruxTagEntry>
