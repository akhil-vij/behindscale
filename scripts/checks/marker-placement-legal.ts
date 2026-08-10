// marker-placement-legal: enforces where and how {{figure:slug}}
// markers may appear.
//
// Rules (docs/figures-design.md §0.1 Q3, Q4, §3.5):
//   - Markers may appear ONLY inside `problem` or `solution` prose
//     -- never in summary, crux, cruxSummary, tradeoffs[],
//     patterns[].note, or any other field.
//   - Each marker must be on its OWN LINE (blank-line delimited),
//     i.e. it splits cleanly on the paragraph delimiter. A marker
//     embedded inside a paragraph is illegal.
//   - Duplicate slug references inside the same article are illegal
//     (a figure appears at exactly one position).
//
// A marker with a non-kebab-case slug (e.g. {{figure:Bad_Slug}})
// is not matched by the marker regex at all and therefore does not
// resolve to any figures[] entry -- caught by orphan-figure-markers
// only if the regex matches. This check refuses malformed marker
// syntax specifically so authors get a targeted error instead of a
// confusing "orphan" report.

import type { Check, CheckError } from '../types'

// Any {{...}} construct that starts with `figure:` -- broader than
// the kebab-case slug regex used by proseText/extractFigureMarkers.
// Match failure surfaces here instead of hiding as "no marker found".
// Two variants: LOOSE_MARKER_G with the global flag for iteration
// (used via .exec() in scanField and reset between uses because
// each call is a fresh field), and LOOSE_MARKER_ANY without the
// global flag for boolean membership tests -- .test() with a
// global regex would carry lastIndex state across loop iterations.
const LOOSE_MARKER_G = /\{\{figure:([^}]*)\}\}/g
const LOOSE_MARKER_ANY = /\{\{figure:[^}]*\}\}/
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Legal marker: appears as a whole line surrounded by blank lines
// (or at the very start/end of the field with a blank line adjacent).
// The check for "own line" is: the marker's occurrence, when the
// field is split on \n{2,}, produces a chunk that equals exactly
// the marker text (after trim).
function scanField(field: string, fieldName: string): Array<{
  slug: string
  fieldName: string
  reason: string
}> {
  const violations: Array<{
    slug: string
    fieldName: string
    reason: string
  }> = []

  // First: any marker with a non-kebab-case slug is a syntax error.
  // Reset lastIndex defensively; the same regex instance is used
  // across multiple fields per article.
  LOOSE_MARKER_G.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = LOOSE_MARKER_G.exec(field)) !== null) {
    const slug = m[1] ?? ''
    if (!KEBAB_CASE.test(slug)) {
      violations.push({
        slug,
        fieldName,
        reason: `marker slug "${slug}" is not kebab-case (allowed: [a-z0-9]+(-[a-z0-9]+)*)`,
      })
    }
  }

  // Second: every marker that IS kebab-case must sit as its own
  // paragraph. Split the field on \n{2,} (matches the Prose
  // renderer's contract); any chunk that both CONTAINS a marker
  // and is not EQUAL to the marker is an inside-paragraph offense.
  const paragraphs = field.split(/\n{2,}/)
  for (const p of paragraphs) {
    const trimmed = p.trim()
    // Extract any well-formed markers in this paragraph.
    const paragraphMarkers: string[] = []
    let mm: RegExpExecArray | null
    const localRe = /\{\{figure:([a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g
    while ((mm = localRe.exec(trimmed)) !== null) {
      paragraphMarkers.push(mm[1] ?? '')
    }
    if (paragraphMarkers.length === 0) continue

    // Legal paragraph: exactly one marker AND the paragraph body
    // equals just that marker (after trim). Anything else is
    // "marker embedded in prose" and errors.
    if (paragraphMarkers.length > 1) {
      violations.push({
        slug: paragraphMarkers.join(', '),
        fieldName,
        reason:
          'multiple markers share a paragraph (each figure must be its own paragraph, blank-line delimited)',
      })
      continue
    }
    const soleMarker = `{{figure:${paragraphMarkers[0]}}}`
    if (trimmed !== soleMarker) {
      violations.push({
        slug: paragraphMarkers[0] ?? '',
        fieldName,
        reason:
          'marker is embedded inside a paragraph (marker must be on its own line, blank-line delimited)',
      })
    }
  }

  return violations
}

export const markerPlacementLegal: Check = {
  name: 'marker-placement-legal',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      // Fields where markers are ALLOWED.
      const allowed: Array<[string, string]> = [
        ['problem', article.problem],
        ['solution', article.solution],
      ]
      for (const [name, field] of allowed) {
        for (const v of scanField(field, name)) {
          errors.push({
            articleSlug: article.slug,
            message: `[${v.fieldName}] ${v.reason}`,
            fix: [
              'place each figure marker on its own line with blank lines above and below, e.g.:\n\n{{figure:slug}}\n\n',
            ],
          })
        }
      }

      // Fields where markers are FORBIDDEN. Any occurrence errors.
      const forbidden: Array<[string, string]> = [
        ['summary', article.summary],
        ['crux', article.crux],
        ['cruxSummary', article.cruxSummary],
      ]
      for (const tradeoff of article.tradeoffs) {
        forbidden.push(['tradeoffs[]', tradeoff])
      }
      for (const patternRef of article.patterns) {
        forbidden.push([`patterns["${patternRef.slug}"].note`, patternRef.note])
      }
      for (const [name, field] of forbidden) {
        if (LOOSE_MARKER_ANY.test(field)) {
          errors.push({
            articleSlug: article.slug,
            message: `[${name}] contains a {{figure:...}} marker -- markers are allowed ONLY in problem/solution`,
            fix: [
              `remove the marker from ${name}; if the figure is genuinely relevant here, decide whether it belongs in problem or solution instead`,
            ],
          })
        }
      }

      // Duplicate slugs: same {{figure:X}} referenced more than once
      // across the article's problem+solution.
      const seen = new Map<string, number>()
      const scan = (s: string) => {
        const re = /\{\{figure:([a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g
        let mm: RegExpExecArray | null
        while ((mm = re.exec(s)) !== null) {
          const slug = mm[1] ?? ''
          seen.set(slug, (seen.get(slug) ?? 0) + 1)
        }
      }
      scan(article.problem)
      scan(article.solution)
      for (const [slug, count] of seen) {
        if (count > 1) {
          errors.push({
            articleSlug: article.slug,
            message: `{{figure:${slug}}} appears ${count} times across problem+solution (each figure is placed at exactly one position)`,
            fix: [
              `remove ${count - 1} of the {{figure:${slug}}} references, keeping only the one at the intended position`,
            ],
          })
        }
      }
    }

    return errors
  },
}
