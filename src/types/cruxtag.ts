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
// - `urlSlug` — the plain-words page address for this class's future
//   /problems/<urlSlug> page (docs/nav-ia-decisions.md D1). Distinct
//   from the registry key (the `cruxTag`), which stays the frozen join
//   key + anchor id and is never displayed. Optional in the type; the
//   `cruxtag-urlslug` validator requires it on every real entry
//   (present, kebab-case, unique across the registry).
//
// Consumed by the problems-workbench group headers, the article-page
// lateral chip linking to `/problems#term-<slug>`, and the
// `DefinedTermSet` JSON-LD on `/problems`. Validator: every distinct
// `cruxTag` used by
// any article must have a registry entry; label + definition must be
// non-empty. No orphan rule the other direction — a registry entry with
// zero articles is allowed (supports future article removals).

export interface CruxTagEntry {
  label: string
  definition: string
  urlSlug?: string
}

export type CruxTagRegistry = Record<string, CruxTagEntry>
