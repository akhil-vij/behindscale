// Shared list classifier for body prose (docs/lists-design.md).
//
// SINGLE SOURCE OF TRUTH for both the renderer
// (src/components/Prose.tsx) and the build-time validator
// (scripts/checks/list-block-well-formed.ts), so what ships and what
// is validated can never diverge.
//
// A "list chunk" is a blank-line-delimited prose chunk (the same unit
// Prose.tsx splits on) whose every non-empty line is a homogeneous
// list item. Supported, strictly:
//   - unordered: every line matches `- <text>`
//   - ordered:   every line matches `<int>. <text>`
// No nesting (no leading indentation), no `*` / `+` bullets, no `1)`
// ordered form, minimum two items, homogeneous markers within a chunk.
// The renderer trusts parseList() because the validator has already
// rejected every malformed shape at build time (§0.4). This is a
// strict subset of CommonMark, so the eventual Unit 7+ markdown
// adoption renders today's list content byte-identically (§0.2).

export interface ParsedList {
  readonly ordered: boolean
  readonly items: readonly string[] // marker-stripped item text
}

// A line that IS a supported list item (no leading indentation).
const STRICT_UL = /^- (\S.*)$/
const STRICT_OL = /^(\d+)\. (\S.*)$/

// A line that LOOKS like it was meant to be a list item -- including
// the unsupported/near-miss forms (`*`/`+` bullets, `1)` ordered,
// indented/nested). The validator uses this to reject malformed lists
// instead of letting the renderer silently treat them as a paragraph.
const LOOSE_LIST = /^(\s*)([-*+]|\d+[.)])\s+\S/

export function isListLikeLine(line: string): boolean {
  return LOOSE_LIST.test(line)
}

function nonEmptyLines(chunk: string): string[] {
  return chunk.split('\n').filter((l) => l.trim().length > 0)
}

// Strict parse used by the RENDERER. Returns a ParsedList only for a
// fully well-formed homogeneous list of >= 2 items; anything else is
// null (render as <p>). Defense-in-depth: an unclear shape falls
// through to a paragraph, never crashes.
export function parseList(chunk: string): ParsedList | null {
  const lines = nonEmptyLines(chunk)
  if (lines.length < 2) return null

  if (lines.every((l) => STRICT_UL.test(l))) {
    return { ordered: false, items: lines.map((l) => l.replace(STRICT_UL, '$1')) }
  }
  if (lines.every((l) => STRICT_OL.test(l))) {
    return { ordered: true, items: lines.map((l) => l.replace(STRICT_OL, '$2')) }
  }
  return null
}

// Strip leading list markers ("- ", "N. ") from every line, keeping
// the item text. For proseText() -- counters and indexers must see
// item prose, not the marker characters. Non-list lines pass through
// untouched. Mirrors why proseText() strips figure markers.
export function stripListMarkers(field: string): string {
  return field
    .split('\n')
    .map((line) => {
      const ul = line.match(STRICT_UL)
      if (ul) return ul[1]
      const ol = line.match(STRICT_OL)
      if (ol) return ol[2]
      return line
    })
    .join('\n')
}

// ---- Validator support -------------------------------------------------
// analyzeChunk() classifies one chunk for the build-time check. The
// renderer never calls this; it only needs the strict parseList().

export type ChunkClass =
  | { readonly kind: 'not-list' }
  | { readonly kind: 'valid'; readonly ordered: boolean }
  | { readonly kind: 'single'; readonly ordered: boolean }
  | { readonly kind: 'malformed'; readonly reason: string; readonly fix: string }

interface LineClass {
  readonly list: boolean
  readonly indented: boolean
  readonly dashFamily: boolean // '-', '*', '+'
  readonly supportedUl: boolean
  readonly supportedOl: boolean
  readonly marker: string
}

function classifyLine(line: string): LineClass {
  const m = line.match(LOOSE_LIST)
  if (!m) {
    return {
      list: false,
      indented: false,
      dashFamily: false,
      supportedUl: false,
      supportedOl: false,
      marker: '',
    }
  }
  const marker = m[2]
  const dashFamily = marker === '-' || marker === '*' || marker === '+'
  return {
    list: true,
    indented: m[1].length > 0,
    dashFamily,
    supportedUl: STRICT_UL.test(line),
    supportedOl: STRICT_OL.test(line),
    marker,
  }
}

export function analyzeChunk(chunk: string): ChunkClass {
  const lines = nonEmptyLines(chunk)
  const cls = lines.map(classifyLine)

  // Nothing looks like a list -> ordinary paragraph, not our concern.
  if (!cls.some((c) => c.list)) return { kind: 'not-list' }

  // Homogeneous, fully supported lists (the happy path).
  if (cls.every((c) => c.supportedUl)) {
    return lines.length < 2
      ? { kind: 'single', ordered: false }
      : { kind: 'valid', ordered: false }
  }
  if (cls.every((c) => c.supportedOl)) {
    return lines.length < 2
      ? { kind: 'single', ordered: true }
      : { kind: 'valid', ordered: true }
  }

  // Malformed. Report the most specific reason first.
  const listLines = cls.filter((c) => c.list)

  if (listLines.some((c) => c.indented)) {
    return {
      kind: 'malformed',
      reason: 'a list item is indented; nested lists are not supported',
      fix: 'remove the leading whitespace so every item starts at column 0',
    }
  }
  if (listLines.some((c) => c.dashFamily && c.marker !== '-')) {
    return {
      kind: 'malformed',
      reason: `unsupported bullet marker "${listLines.find((c) => c.dashFamily && c.marker !== '-')!.marker}"`,
      fix: 'use "- " for every unordered item',
    }
  }
  if (listLines.some((c) => !c.dashFamily && !c.supportedOl)) {
    return {
      kind: 'malformed',
      reason: 'unsupported ordered marker (only "N. " is supported, not "N)" )',
      fix: 'use "1. ", "2. ", ... for ordered items',
    }
  }
  const hasDash = listLines.some((c) => c.dashFamily)
  const hasNum = listLines.some((c) => !c.dashFamily)
  if (hasDash && hasNum) {
    return {
      kind: 'malformed',
      reason: 'a single list block mixes "- " and "N. " markers',
      fix: 'make every item the same type -- all "- " or all "N. "',
    }
  }
  // Some lines are list items, some are plain prose -> almost always a
  // missing blank line between a lead-in sentence and its list.
  return {
    kind: 'malformed',
    reason: 'a block mixes list items with non-list prose lines',
    fix: 'put a blank line between the lead-in sentence and the list',
  }
}
