// unused-figure-defs: every entry in a figure host's figures[] must be
// referenced by at least one {{figure:slug}} marker in that host's
// marker-bearing prose (an article's problem/solution, or a pattern's
// definition). Catches figures that got declared but never placed, or
// markers that were removed while the definition stayed.
// (docs/figures-design.md §4)

import type { Check, CheckError } from '../types'
import { extractFigureMarkers } from '../../src/lib/proseText'
import { figureHosts } from '../figure-hosts'

export const unusedFigureDefs: Check = {
  name: 'unused-figure-defs',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of figureHosts(content)) {
      if (host.figures.length === 0) continue
      const markerSlugs = new Set(
        host.markerFields.flatMap(([, text]) => extractFigureMarkers(text)),
      )
      const where = host.markerFields.map(([name]) => name).join(' or ')
      for (const fig of host.figures) {
        if (markerSlugs.has(fig.slug)) continue
        errors.push({
          ...host.ref,
          message: `figures[] declares "${fig.slug}" but no {{figure:${fig.slug}}} marker appears in ${where}`,
          fix: [
            `add {{figure:${fig.slug}}} on its own line inside ${where} where the figure belongs`,
            `or remove the { "slug": "${fig.slug}", ... } entry from figures[] (and delete content/figures/${host.slug}/${fig.slug}.svg if unused elsewhere)`,
          ],
        })
      }
    }

    return errors
  },
}
