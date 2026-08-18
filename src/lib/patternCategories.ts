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
// Colours map 1:1 to existing light-shell category tokens (src/index.css):
// full class strings so Tailwind's content scan keeps them.

export interface PatternCategoryMeta {
  id: string
  label: string
  gloss: string
  dotClass: string
}

export const PATTERN_CATEGORIES: readonly PatternCategoryMeta[] = [
  {
    id: 'resilience',
    label: 'Resilience',
    gloss:
      'Surviving failure — containing it, shedding around it, retrying through it, recovering from it.',
    dotClass: 'bg-cat-blue',
  },
  {
    id: 'throughput',
    label: 'Throughput',
    gloss:
      'Getting past a ceiling — sharding, splitting, migrating, and multiplexing capacity.',
    dotClass: 'bg-cat-orange',
  },
  {
    id: 'consistency',
    label: 'Consistency',
    gloss:
      'Making outcomes agree — exactly-once effects, single owners, one source of truth.',
    dotClass: 'bg-cat-purple',
  },
  {
    id: 'observability',
    label: 'Observability',
    gloss: 'Seeing the system — independently of the thing being watched.',
    dotClass: 'bg-cat-cyan',
  },
  {
    id: 'performance',
    label: 'Performance',
    gloss:
      'Making the fast path faster — placement and policy chosen on evidence.',
    dotClass: 'bg-cat-green',
  },
]

export const PATTERN_CATEGORY_IDS: readonly string[] = PATTERN_CATEGORIES.map(
  (c) => c.id,
)

export const patternCategoryById: ReadonlyMap<string, PatternCategoryMeta> =
  new Map(PATTERN_CATEGORIES.map((c) => [c.id, c]))
