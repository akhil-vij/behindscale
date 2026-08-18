// Pattern-category guard (nav-IA v1.2 / /patterns rebuild). The listing page
// groups every pattern under one of the five known categories; a pattern with
// a missing or unknown category would silently vanish from /patterns. This
// check makes that a build failure instead: every pattern has a `category`,
// and it is one of the five registry-sanctioned ids. (The schema keeps
// `category` optional; this check enforces the stronger listing-page contract
// against registry truth, per the build request's "verified against registry
// truth" instruction.)

import { PATTERN_CATEGORY_IDS } from '../../src/lib/patternCategories'
import type { Check, CheckError, ContentSet } from '../types'

const KNOWN = new Set(PATTERN_CATEGORY_IDS)

export const patternCategory: Check = {
  name: 'pattern-category',
  run(content: ContentSet): readonly CheckError[] {
    const errors: CheckError[] = []
    for (const pattern of content.patterns) {
      if (pattern.category === undefined) {
        errors.push({
          patternSlug: pattern.slug,
          message: `pattern "${pattern.slug}" has no category (required for the /patterns grouping)`,
          fix: [`set category to one of: ${PATTERN_CATEGORY_IDS.join(', ')}`],
        })
        continue
      }
      if (!KNOWN.has(pattern.category)) {
        errors.push({
          patternSlug: pattern.slug,
          message: `pattern "${pattern.slug}" has unknown category "${pattern.category}"`,
          fix: [`use one of: ${PATTERN_CATEGORY_IDS.join(', ')}`],
        })
      }
    }
    return errors
  },
}
