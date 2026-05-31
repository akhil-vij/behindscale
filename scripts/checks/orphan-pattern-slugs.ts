// Enforces the orphan-references half of invariant 8: every
// patterns[].slug on an article must have a matching pattern definition
// file in content/patterns/. Orphan references fail the build.

import type { Check, CheckError } from '../types'

export const orphanPatternSlugs: Check = {
  name: 'orphan-pattern-slugs',
  run: (content) => {
    const errors: CheckError[] = []
    const definedSlugs = new Set(content.patterns.map((p) => p.slug))

    for (const article of content.articles) {
      for (const ref of article.patterns) {
        if (definedSlugs.has(ref.slug)) continue
        errors.push({
          articleSlug: article.slug,
          message: `references pattern \`${ref.slug}\` with no definition`,
          fix: [
            `add content/patterns/${ref.slug}.json (PatternDefinition shape)`,
            `or remove the \`${ref.slug}\` reference from this article`,
          ],
        })
      }
    }

    return errors
  },
}
