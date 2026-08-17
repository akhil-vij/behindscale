// Per-class authored content for a problem page (nav-IA progressive-
// authoring model). Every field is OPTIONAL: a class with no essay file
// renders fully derived (the "minimal" state, matching the
// problem-queue-backlog design handoff); authoring a class fills in blocks
// that each REPLACE their derived placeholder. The full state (the
// problem-ambiguous-timeouts handoff) is just this record with every block
// present -- there is no separate "full" template, only more blocks filled.
//
// Keyed by `cruxTag` (the frozen join key), so an editorial urlSlug rename
// never orphans the file. Stored at content/problems/<cruxTag>.json.
//
// Renderers land incrementally (per the owner's "minimal now, expand each
// page over time" direction). Today ProblemDetail renders `headline`,
// `lede`, and `intro`; the richer blocks in the full design (metric grid,
// "the wall" diagram, hand-written vantage rows, deep dive, number charts,
// what-to-steal, simulator CTA) are added as the first class authoring
// each one lands. Adding a block is a reviewed schema change, and each new
// block ships with its validator + renderer together.
export interface ProblemEssay {
  // The frozen cruxTag this essay authors. Must resolve to a registry
  // entry (enforced by the problem-essay validator when it lands).
  cruxTag: string
  // Replaces the class label as the page H1 (the label then moves into the
  // eyebrow). A reader-facing hook line, e.g. "Your payment API timed out.
  // Did the charge go through?"
  headline?: string
  // One-line italic teaser shown under the title.
  lede?: string
  // Opening prose paragraphs shown above "The wall". Plain paragraphs for
  // now (no figure markers until essay figures land).
  intro?: string[]
}
