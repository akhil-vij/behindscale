// Enforces the minimum-coverage half of invariant 8: every article must
// reference at least 2 patterns. behindscale's mission is
// transferable-patterns synthesis across companies; single-pattern
// articles are case studies, not library entries. The rationale lives
// in architecture.md's invariant 8.

import type { Check, CheckError } from '../types'

const MIN_PATTERN_COUNT = 2

export const minimumPatternCoverage: Check = {
  name: 'minimum-pattern-coverage',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      const count = article.patterns.length
      if (count >= MIN_PATTERN_COUNT) continue
      errors.push({
        articleSlug: article.slug,
        message: `references ${count} pattern${count === 1 ? '' : 's'} (minimum ${MIN_PATTERN_COUNT})`,
        fix: [
          'add another canonical pattern reference to patterns[]',
          'or move the article to the Proposed Pattern Queue (see architecture.md)',
        ],
      })
    }

    return errors
  },
}
