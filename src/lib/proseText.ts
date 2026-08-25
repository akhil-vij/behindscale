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
// List markers (docs/lists-design.md): proseText() also strips the
// leading `- ` / `N. ` from list-item lines, keeping the item text,
// for the same reason it strips figure markers -- the marker
// characters are structure, not prose, and must not inflate length-
// band counts or leak into any future index/description. The renderer
// keeps them (via proseRaw) because it needs to see the list.
//
// Inline links (docs/Corrections_pattern.md PP-54, added Round 4):
// prose fields may carry inline cross-links `[text](/path)` that the
// renderer (Prose.tsx) turns into <Link>s. Like figure/list markers,
// the bracket-and-URL syntax is STRUCTURE, not prose -- it must never
// leak into a measurement, index, or description. proseText() unwraps
// each link to its visible label (`[workflows](/patterns/x)` ->
// `workflows`). This closes the JSON-LD description leak observed in
// Round 9 (embedded-vs-centralized-orchestration), where a link in the
// first definition paragraph shipped raw into the DefinedTerm
// description. The renderer still sees the raw link via proseRaw().
//
// Today's consumers wired in:
//   - scripts/checks/stats-value-in-prose.ts -> proseText()
//   - src/components/Prose.tsx                -> proseRaw()
//   - scripts/prerender.ts pattern JSON-LD    -> proseText()
//     (DefinedTerm + meta description built from pattern.definition's
//     first paragraph; wired Round 9 to strip the inline link chrome)
//
// Forward-looking guards (safe today, safe forever if the rule holds):
//   - scripts/prerender.ts article JSON-LD descriptions use
//     article.summary / article.crux, not problem/solution. If a
//     future revision starts building descriptions from body prose,
//     it must call proseText().
//   - src/pages/Catalog.tsx search currently indexes cruxSummary,
//     crux, title, source, company, patternNames -- not body prose.
//     If a future revision starts indexing body prose, it must call
//     proseText().

import { stripListMarkers } from './proseList'

// The marker syntax accepted in prose fields. Locked at:
//   {{figure:<kebab-case-slug>}}
// on its own line, blank-line delimited. The marker itself is what
// the renderer looks for; validators enforce the placement rules
// (marker-placement-legal).
const FIGURE_MARKER_RE = /\{\{figure:[a-z0-9]+(?:-[a-z0-9]+)*\}\}/g

// Inline internal cross-link syntax `[text](/path)` -- mirrors the
// renderer's INLINE_LINK matcher in src/components/Prose.tsx (internal
// only: the target must start with `/`). proseText() replaces each with
// its visible label so the link chrome never leaks into a description
// or index. Kept in sync with Prose.tsx by construction.
const INLINE_LINK_RE = /\[([^\]]+)\]\(\/[^)\s]+\)/g

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
  return stripListMarkers(field)
    .replace(FIGURE_MARKER_RE, '')
    // Unwrap inline cross-links to their visible label, so link chrome
    // never leaks into a description/index (see header note).
    .replace(INLINE_LINK_RE, '$1')
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
