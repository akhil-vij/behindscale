// figure-svg-exists: every figures[i].slug declared on an article
// must have a matching SVG file at
//   content/figures/<article-slug>/<figure-slug>.svg
//
// The loader (scripts/load-content.ts) preloads each declared
// figure. Present files land in ContentSet.figureSvgs with a
// non-null `contents`; missing files land with `contents: null`.
// This check reports the null entries as errors, so authors see
// exact path + article/figure identifier in one line.
//
// Per docs/figures-design.md §4 -- error-severity (missing SVG
// means the article page fails to render the figure).

import type { Check, CheckError } from '../types'

export const figureSvgExists: Check = {
  name: 'figure-svg-exists',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      if (article.figures === undefined) continue
      for (const fig of article.figures) {
        const key = `${article.slug}/${fig.slug}`
        const entry = content.figureSvgs.get(key)
        if (entry === undefined || entry.contents === null) {
          const expected =
            entry?.path ??
            `content/figures/${article.slug}/${fig.slug}.svg`
          errors.push({
            articleSlug: article.slug,
            message: `figures[].slug "${fig.slug}" has no SVG file at ${expected}`,
            fix: [
              `create ${expected} (drawn in the site palette; see docs/figures-design.md)`,
              `or remove the { "slug": "${fig.slug}", ... } entry from this article's figures[]`,
            ],
          })
        }
      }
    }

    return errors
  },
}
