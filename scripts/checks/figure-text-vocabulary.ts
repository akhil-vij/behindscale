// figure-text-vocabulary: extracts every <text> node's textContent
// from each present figure SVG and runs vocabulary/consistency lints
// on it (docs/figures-design.md §0.3 addition #1).
//
// Purpose. Once a figure lands, its in-diagram labels are prose that
// must stay consistent with the article's prose. If the article
// rewords "tier" to "priority" during a readability pass, a figure
// that still says "tier" has silently rotted. This check catches
// that; it also caches an extractSvgTextNodes() helper for future
// prose lints to reuse.
//
// Rule set (scaffold). The check is intentionally minimal at
// landing: it exercises the extraction path and reports parse
// failures. Concrete rules grow as the prose-side lints they
// mirror get formalized (taste doc P12 spaced-hyphens, banned-
// jargon list, article<->figure label consistency). Every new rule
// gets its own entry in RULES below plus a unit test.
//
// Extraction is regex-based, not a proper XML parse. The
// figure-svg-safe check has already rejected constructs that would
// need real parsing (foreignObject, script). What remains is well-
// formed SVG whose <text> node structure is simple enough to
// regex-extract reliably.

import type { Check, CheckError } from '../types'
import { figureHosts } from '../figure-hosts'

// Matches <text ...>...</text> and captures the inner text. Handles
// attributes on the opening tag. Not nested (SVG does not nest
// <text>). Dot flag (s) so multi-line text nodes are captured.
const TEXT_NODE_RE = /<text\b[^>]*>([\s\S]*?)<\/text>/gi

// Strip nested SVG structural tags that can appear inside <text>
// (<tspan>, <textPath>, <a>) so we get the raw textContent for
// lint purposes. Also decode the small set of XML entities the
// authored SVGs actually use.
const NESTED_TAG_RE = /<\/?(tspan|textpath|a)\b[^>]*>/gi
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
}

// Exposed for the future in-SVG vocabulary rules that consumers
// (e.g. a shared prose-lint runner) will call from other places.
export function extractSvgTextNodes(svgSource: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = TEXT_NODE_RE.exec(svgSource)) !== null) {
    const inner = (m[1] ?? '').replace(NESTED_TAG_RE, '')
    const decoded = decodeEntities(inner).trim()
    if (decoded.length > 0) out.push(decoded)
  }
  return out
}

// Rule shape. Runs against a single <text> node's decoded string
// and returns a violation message (or null). Add new rules by
// appending here and adding a corresponding unit test.
interface Rule {
  readonly id: string
  readonly test: (textContent: string) => string | null
}

const RULES: readonly Rule[] = [
  // (Rules to grow here as prose lints are formalized. See the
  // taste doc's tracked-but-deferred CORRECTIONS items P12
  // "spaced hyphens instead of em-dashes" and the vocabulary
  // discipline discussion. When those become validators, they
  // wire in here too.)
]

export const figureTextVocabulary: Check = {
  name: 'figure-text-vocabulary',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of figureHosts(content)) {
      for (const fig of host.figures) {
        const key = `${host.slug}/${fig.slug}`
        const entry = content.figureSvgs.get(key)
        if (entry === undefined || entry.contents === null) continue

        const texts = extractSvgTextNodes(entry.contents)
        for (const text of texts) {
          for (const rule of RULES) {
            const violation = rule.test(text)
            if (violation !== null) {
              errors.push({
                file: entry.path,
                ...host.ref,
                message: `figure "${fig.slug}" text "${text}": ${violation}`,
                fix: [
                  `edit the in-SVG <text> content to satisfy the ${rule.id} rule`,
                ],
              })
            }
          }
        }
      }
    }

    return errors
  },
}
