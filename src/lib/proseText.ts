// Shared helper for consumers of Article.problem / Article.solution
// prose (docs/figures-design.md §0.3 addition #2, resolved 2026-08-10).
//
// The figures feature introduced inline {{figure:<slug>}} markers in
// prose fields. Every code path that reads problem/solution for
// MEASUREMENT, INDEXING, or DESCRIPTION-BUILDING must call
// `proseText()` first, so marker characters don't inflate counts or
// leak into card labels, search indexes, or JSON-LD descriptions.
// The renderer (and only the renderer) uses `proseRaw()` because it
// needs the marker to know where to inline the figure.
//
// Contributor checklist rule (also in the taste doc): any NEW reader
// of problem/solution for measurement, indexing, or description must
// call proseText(). proseRaw() is for rendering only.
//
// Today's consumers wired in:
//   - scripts/checks/stats-value-in-prose.ts -> proseText()
//   - src/components/Prose.tsx                -> proseRaw()
//
// Forward-looking guards (safe today, safe forever if the rule holds):
//   - scripts/prerender.ts JSON-LD descriptions currently use
//     article.summary / article.crux, not problem/solution. If a
//     future revision starts building descriptions from body prose,
//     it must call proseText().
//   - src/pages/Catalog.tsx search currently indexes cruxSummary,
//     crux, title, source, company, patternNames -- not body prose.
//     If a future revision starts indexing body prose, it must call
//     proseText().

// The marker syntax accepted in prose fields. Locked at:
//   {{figure:<kebab-case-slug>}}
// on its own line, blank-line delimited. The marker itself is what
// the renderer looks for; validators enforce the placement rules
// (marker-placement-legal).
const FIGURE_MARKER_RE = /\{\{figure:[a-z0-9]+(?:-[a-z0-9]+)*\}\}/g

// Strip figure markers and collapse the whitespace they leave behind
// to a single blank-line paragraph break. Two callers that count
// characters against the taste doc bands (problem 1300-3000, solution
// 2400-4500) MUST receive the marker-stripped string; otherwise a
// marker's raw characters inflate the count.
//
// Example:
//   Input:  "First paragraph.\n\n{{figure:foo}}\n\nSecond paragraph."
//   Output: "First paragraph.\n\nSecond paragraph."
export function proseText(field: string): string {
  return field
    .replace(FIGURE_MARKER_RE, '')
    // A marker on its own line, with blank lines both sides, leaves
    // three consecutive newlines after removal (`\n\n` + `` + `\n\n`
    // -> `\n\n\n\n`). Collapse any run of 3+ newlines down to the
    // canonical `\n\n` paragraph delimiter so the split still yields
    // the correct paragraph count and no spurious empty ones.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Return the prose unchanged, including markers. Renderer only --
// the Prose component splits on the same paragraph delimiter as
// today, then treats any chunk matching FIGURE_MARKER_EXACT as a
// figure-inline directive rather than a paragraph.
export function proseRaw(field: string): string {
  return field
}

// The renderer's per-chunk marker matcher: a paragraph chunk is a
// figure directive iff it consists SOLELY of {{figure:slug}} (after
// trimming). This mirrors marker-placement-legal's "own line, blank-
// line delimited" rule at the renderer level.
export const FIGURE_MARKER_EXACT =
  /^\{\{figure:([a-z0-9]+(?:-[a-z0-9]+)*)\}\}$/

// Extract every figure slug referenced by markers in the given prose,
// preserving order of appearance and NOT deduplicating. Used by
// orphan-figure-markers (checks each reference resolves) and
// unused-figure-defs (checks the set covers figures[]).
export function extractFigureMarkers(field: string): string[] {
  const out: string[] = []
  const re = /\{\{figure:([a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(field)) !== null) {
    out.push(m[1])
  }
  return out
}
