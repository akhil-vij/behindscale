// Unit 10 stats-value-in-prose check. Enforces two editorial
// constraints on Article.stats[]:
//
//   1. At most 3 stats per article. Zero is a fine number -- an
//      article without strong figures ships without callouts rather
//      than with weak ones. Hard error.
//   2. Every stat.value must already appear in this article's own
//      prose (problem / solution / tradeoffs / summary). The stats
//      field is a lift, not a source of new claims. Normalization is
//      intentional best-effort -- a fuzzy miss might mean the prose
//      phrases the figure differently, not that the stat is
//      fabricated, so this is a `severity: 'warning'` (architecture.md
//      Content Contract: "flag, don't block, on fuzzy misses"). The
//      max-3 rule stays a hard error -- that's structural, not
//      phrasing-sensitive.
//
// Normalization (Unit 11 sprint pt 2):
//
//   - Strip '+', '%', ',' (the chars that vary between stat-display
//     and prose-display of the same figure: "+80%" vs "80 percent").
//   - Strip '<', '>', '~', '≈' (the chars by which composite stat
//     halves typically diverge from their prose form: "<100ms" in the
//     stat vs "under 100ms" or "100ms" in prose; "~3.1s" in the stat
//     vs "3.1s" or "3.1 s" in prose). Comparator/approximation chars
//     are display devices on the stat side; prose carries the same
//     numeric core in different English.
//   - Collapse whitespace, lowercase.
//
// Composite values: stats authors write "before → after" shapes
// (e.g. "3.1s → 1.0s", "500ms → <100ms") and the prose
// phrases them out longhand ("from 3.1s to 1.0s", "from 500ms to
// under 100ms"). Match strategy: try the full normalized monolithic
// substring first; if that fails AND the value contains '→',
// split on the arrow, normalize each half, and require every half to
// appear as a substring in the prose. Both halves carry separately.
//
// Fits the same shape as the other three checks (orphan-pattern-
// slugs, minimum-pattern-coverage, artifact-path-matches-slug):
// per-article CheckError with articleSlug, message, fix; max-3 is an
// error, value-in-prose miss is a warning.

import type { Check, CheckError } from '../types'

const MAX_STATS = 3

function normalize(s: string): string {
  // Strip the chars that vary between prose and stat values; collapse
  // whitespace; lowercase. Intentionally minimal -- aggressive
  // normalization (e.g. removing all non-alphanumerics) would lose
  // the digit boundaries that make substring matching meaningful.
  return s
    .replace(/[+%,<>~≈]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function valueAppearsInProse(value: string, prose: string): boolean {
  const haystack = normalize(prose)
  const needle = normalize(value)
  if (needle.length === 0) return true // empty value matches trivially
  // Also try the no-space form: "3.1 s" -> "3.1s"
  const compactNeedle = needle.replace(/\s+/g, '')
  if (haystack.includes(needle) || haystack.includes(compactNeedle)) {
    return true
  }
  // Composite fallback: "before → after" split on the arrow.
  // Normalize each half through the same pipeline as the haystack
  // (the top-level normalize already ran on the full value, but the
  // split happens on the original string so we don't lose the
  // arrow's position to lowercasing edge cases). Every half must
  // appear independently.
  if (value.includes('→')) {
    const halves = value
      .split('→')
      .map((h) => normalize(h))
      .filter((h) => h.length > 0)
    if (halves.length >= 2 && halves.every((h) => haystack.includes(h))) {
      return true
    }
  }
  return false
}

export const statsValueInProse: Check = {
  name: 'stats-value-in-prose',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      const stats = article.stats
      if (!stats || stats.length === 0) continue

      // (1) Max-3 rule.
      if (stats.length > MAX_STATS) {
        errors.push({
          articleSlug: article.slug,
          message: `has ${stats.length} stats; max is ${MAX_STATS}`,
          fix: [
            `remove ${stats.length - MAX_STATS} entries from \`stats\` (zero stats is a fine number)`,
          ],
        })
      }

      // (2) Value-in-prose rule. Concatenate the prose fields once
      // per article (a stat can appear in any of them, not just its
      // declared `placement` section -- placement controls where the
      // callout *renders*, not where the value is sourced from).
      const prose = [
        article.problem,
        article.solution,
        ...article.tradeoffs,
        article.summary,
      ].join('\n\n')

      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i]
        if (!stat) continue
        if (!valueAppearsInProse(stat.value, prose)) {
          errors.push({
            articleSlug: article.slug,
            message: `stat[${i}].value \`${stat.value}\` (label: "${stat.label}") does not appear in the article's prose`,
            fix: [
              `add the value to one of the article's prose fields (problem/solution/tradeoffs/summary)`,
              `or remove this stat entry (no new numbers should enter via stats; the field is a lift, not a source)`,
            ],
            // Normalization is intentionally best-effort; a miss might
            // mean the prose phrases the figure differently rather than
            // that the stat is fabricated. Surface, don't block.
            severity: 'warning',
          })
        }
      }
    }

    return errors
  },
}
