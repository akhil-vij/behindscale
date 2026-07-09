// 2026-07-08 landing/navigation phase check. The `cruxSummary` field is
// the one-line crux compression rendered on catalog cards and in the
// landing preview -- a hand-authored ~10-16 word crisping of `crux` for
// browse surfaces. Two rules:
//
//   1. Missing or empty is an error (checked by the schema predicate
//      already; this check exists so the schema section's message and
//      this section's message agree, and so a future validator
//      refactor that decouples them still catches the same case).
//   2. Longer than ~20 words is a warning. The card layout assumes a
//      single line at desktop and two lines at mobile widths; longer
//      copy wraps to three lines and starts colliding with the pattern
//      chips. Threshold is a soft rule -- authors sometimes need one
//      extra clause -- so this stays a warning, not an error.
//
// The schema predicate (checkArticle in src/types/predicates.ts) also
// requires cruxSummary to be a non-empty string. When a file passes
// schema it reaches this check; when it fails schema the article is
// skipped from the ContentSet (loader behavior) and this check never
// sees it, so the belt-and-suspenders overlap is harmless.

import type { Check, CheckError } from '../types'

const SOFT_MAX_WORDS = 20

function wordCount(s: string): number {
  const trimmed = s.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

export const cruxSummaryLength: Check = {
  name: 'crux-summary-length',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      const value = article.cruxSummary

      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push({
          articleSlug: article.slug,
          message: '`cruxSummary` missing or empty',
          fix: [
            'add a one-line hand-authored crux compression (~10-16 words)',
            'positioned between `cruxTag` and `problem` in the JSON',
          ],
        })
        continue
      }

      const words = wordCount(value)
      if (words > SOFT_MAX_WORDS) {
        errors.push({
          articleSlug: article.slug,
          message: `\`cruxSummary\` is ${words} words (soft max ${SOFT_MAX_WORDS}); the catalog card assumes one line`,
          fix: [
            `tighten to ~10-16 words -- current copy: "${value}"`,
            'the full `crux` (2-4 sentences) carries the depth; `cruxSummary` is the crisping',
          ],
          // Soft rule -- authors sometimes need one extra clause. Flag,
          // don't block.
          severity: 'warning',
        })
      }
    }

    return errors
  },
}
