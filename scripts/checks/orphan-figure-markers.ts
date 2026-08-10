// orphan-figure-markers: every {{figure:X}} marker appearing in an
// article's problem or solution prose must resolve to a figures[]
// entry with slug X. (docs/figures-design.md §4)

import type { Check, CheckError } from '../types'
import { extractFigureMarkers } from '../../src/lib/proseText'

export const orphanFigureMarkers: Check = {
  name: 'orphan-figure-markers',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      const declaredSlugs = new Set(
        (article.figures ?? []).map((f) => f.slug),
      )
      const markerSlugs = [
        ...extractFigureMarkers(article.problem),
        ...extractFigureMarkers(article.solution),
      ]
      const alreadyReported = new Set<string>()
      for (const slug of markerSlugs) {
        if (declaredSlugs.has(slug)) continue
        if (alreadyReported.has(slug)) continue
        alreadyReported.add(slug)
        errors.push({
          articleSlug: article.slug,
          message: `prose contains marker {{figure:${slug}}} but no matching figures[] entry`,
          fix: [
            `add { "slug": "${slug}", "eyebrow": "...", "caption": "...", "ariaLabel": "..." } to this article's figures[]`,
            `and create content/figures/${article.slug}/${slug}.svg`,
            `or remove the {{figure:${slug}}} marker from the prose`,
          ],
        })
      }
    }

    return errors
  },
}
