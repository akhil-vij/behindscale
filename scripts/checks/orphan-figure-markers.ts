// orphan-figure-markers: every {{figure:X}} marker appearing in a
// figure host's marker-bearing prose (an article's problem/solution,
// or a pattern's definition) must resolve to a figures[] entry with
// slug X. (docs/figures-design.md §4)

import type { Check, CheckError } from '../types'
import { extractFigureMarkers } from '../../src/lib/proseText'
import { figureHosts } from '../content-hosts'

export const orphanFigureMarkers: Check = {
  name: 'orphan-figure-markers',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of figureHosts(content)) {
      const declaredSlugs = new Set(host.figures.map((f) => f.slug))
      const markerSlugs = host.markerFields.flatMap(([, text]) =>
        extractFigureMarkers(text),
      )
      const alreadyReported = new Set<string>()
      for (const slug of markerSlugs) {
        if (declaredSlugs.has(slug)) continue
        if (alreadyReported.has(slug)) continue
        alreadyReported.add(slug)
        errors.push({
          ...host.ref,
          message: `prose contains marker {{figure:${slug}}} but no matching figures[] entry`,
          fix: [
            `add { "slug": "${slug}", "eyebrow": "...", "caption": "...", "ariaLabel": "..." } to this ${host.kind}'s figures[]`,
            `and create content/figures/${host.slug}/${slug}.svg`,
            `or remove the {{figure:${slug}}} marker from the prose`,
          ],
        })
      }
    }

    return errors
  },
}
