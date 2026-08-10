// unused-figure-defs: every entry in an article's figures[] must be
// referenced by at least one {{figure:slug}} marker in the article's
// problem or solution prose. Catches figures that got declared but
// never placed, or markers that were removed while the definition
// stayed. (docs/figures-design.md §4)

import type { Check, CheckError } from '../types'
import { extractFigureMarkers } from '../../src/lib/proseText'

export const unusedFigureDefs: Check = {
  name: 'unused-figure-defs',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      if (article.figures === undefined || article.figures.length === 0) {
        continue
      }
      const markerSlugs = new Set([
        ...extractFigureMarkers(article.problem),
        ...extractFigureMarkers(article.solution),
      ])
      for (const fig of article.figures) {
        if (markerSlugs.has(fig.slug)) continue
        errors.push({
          articleSlug: article.slug,
          message: `figures[] declares "${fig.slug}" but no {{figure:${fig.slug}}} marker appears in problem or solution`,
          fix: [
            `add {{figure:${fig.slug}}} on its own line inside problem or solution where the figure belongs`,
            `or remove the { "slug": "${fig.slug}", ... } entry from figures[] (and delete content/figures/${article.slug}/${fig.slug}.svg if unused elsewhere)`,
          ],
        })
      }
    }

    return errors
  },
}
