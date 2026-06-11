// Unit 10 stats-value-in-prose check. Enforces two editorial
// constraints on Article.stats[]:
//
//   1. At most 3 stats per article. Zero is a fine number -- an
//      article without strong figures ships without callouts rather
//      than with weak ones.
//   2. Every stat.value must already appear in this article's own
//      prose (problem / solution / tradeoffs). The stats field is a
//      lift, not a source of new claims. Normalization is intentional
//      best-effort: strip '+', '%', ',', whitespace; lowercase. So
//      "+80%" matches "80 percent" and "3.1 s" matches "3.1s". Flag
//      (don't block) on fuzzy misses so the check stays helpful
//      rather than annoying.
//
// Fits the same shape as the other three checks (orphan-pattern-
// slugs, minimum-pattern-coverage, artifact-path-matches-slug):
// per-article CheckError with articleSlug, message, fix.

import type { Check, CheckError } from '../types'

const MAX_STATS = 3

function normalize(s: string): string {
  // Strip the chars that vary between prose and stat values; collapse
  // whitespace; lowercase. Intentionally minimal -- aggressive
  // normalization (e.g. removing all non-alphanumerics) would lose
  // the digit boundaries that make substring matching meaningful.
  return s
    .replace(/[+%,]/g, '')
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
  return haystack.includes(needle) || haystack.includes(compactNeedle)
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
          })
        }
      }
    }

    return errors
  },
}
