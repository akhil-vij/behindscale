// Pattern category display metadata for the /patterns listing page. This is
// UI copy + presentation (labels, glosses, colour), NOT registry content — the
// registry owns each pattern's `category` id; this module owns how the five
// categories are shown. Glosses are approved verbatim from the design handoff.
//
// Canonical order = pattern-count descending across the full corpus
// (resilience 25 · throughput 14 · consistency 9 · observability 3 ·
// performance 1). The page re-sorts groups by live count under active filters;
// this order is the stable tie-break and the category-chip order.
//
// Colours map 1:1 to existing light-shell category tokens (src/index.css),
// per docs/design-spec.md §2. Each entry carries both the listing dot and the
// pattern chip's classes so the two can't drift apart; full class strings so
// Tailwind's content scan keeps them.

export interface PatternCategoryMeta {
  id: string
  label: string
  gloss: string
  dotClass: string
  chipClass: string
}

export const PATTERN_CATEGORIES: readonly PatternCategoryMeta[] = [
  {
    id: 'resilience',
    label: 'Resilience',
    gloss:
      'Surviving failure — containing it, shedding around it, retrying through it, recovering from it.',
    dotClass: 'bg-cat-blue',
    chipClass: 'text-cat-blue border-cat-blue/30 bg-cat-blue/10',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    gloss:
      "Getting past a limit — sharding data and splitting work so that one machine's limit doesn't define the system's limit.",
    dotClass: 'bg-cat-green',
    chipClass: 'text-cat-green border-cat-green/30 bg-cat-green/10',
  },
  {
    id: 'consistency',
    label: 'Consistency',
    gloss:
      'Making things happen exactly once — and keeping every copy of the truth in agreement.',
    dotClass: 'bg-cat-purple',
    chipClass: 'text-cat-purple border-cat-purple/30 bg-cat-purple/10',
  },
  {
    id: 'observability',
    label: 'Observability',
    gloss:
      "Knowing what's happening — even while the thing you're watching is failing.",
    dotClass: 'bg-cat-cyan',
    chipClass: 'text-cat-cyan border-cat-cyan/30 bg-cat-cyan/10',
  },
  {
    id: 'performance',
    label: 'Performance',
    gloss:
      'Making the fast path faster — placement and policy chosen on evidence.',
    dotClass: 'bg-cat-orange',
    chipClass: 'text-cat-orange border-cat-orange/30 bg-cat-orange/10',
  },
]

export const PATTERN_CATEGORY_IDS: readonly string[] = PATTERN_CATEGORIES.map(
  (c) => c.id,
)

export const patternCategoryById: ReadonlyMap<string, PatternCategoryMeta> =
  new Map(PATTERN_CATEGORIES.map((c) => [c.id, c]))
