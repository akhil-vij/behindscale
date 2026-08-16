// figure-svg-exists: every figures[i].slug declared on a figure host
// (article OR pattern) must have a matching SVG file at
//   content/figures/<host-slug>/<figure-slug>.svg
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
import { figureHosts } from '../figure-hosts'

export const figureSvgExists: Check = {
  name: 'figure-svg-exists',
  run: (content) => {
    const errors: CheckError[] = []

    // Collision guard: an article and a pattern that share a slug would
    // both resolve to content/figures/<slug>/, silently serving each
    // other's SVGs. Flag it rather than mis-serve. Only matters when
    // both hosts actually declare figures.
    const figuredSlugKind = new Map<string, 'article' | 'pattern'>()

    for (const host of figureHosts(content)) {
      if (host.figures.length === 0) continue

      const prior = figuredSlugKind.get(host.slug)
      if (prior !== undefined && prior !== host.kind) {
        errors.push({
          ...host.ref,
          message: `figure host slug "${host.slug}" is used by both an article and a pattern; they would share content/figures/${host.slug}/`,
          fix: ['rename one so their figure directories never collide'],
        })
      }
      figuredSlugKind.set(host.slug, host.kind)

      for (const fig of host.figures) {
        const key = `${host.slug}/${fig.slug}`
        const entry = content.figureSvgs.get(key)
        if (entry === undefined || entry.contents === null) {
          const expected =
            entry?.path ?? `content/figures/${host.slug}/${fig.slug}.svg`
          errors.push({
            ...host.ref,
            message: `figures[].slug "${fig.slug}" has no SVG file at ${expected}`,
            fix: [
              `create ${expected} (drawn in the site palette; see docs/figures-design.md)`,
              `or remove the { "slug": "${fig.slug}", ... } entry from this ${host.kind}'s figures[]`,
            ],
          })
        }
      }
    }

    return errors
  },
}
