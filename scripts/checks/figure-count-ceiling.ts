// figure-count-ceiling: soft-warn / hard-error on figures[] length
// (docs/figures-design.md §0.1 Q7).
//
//   len == 0-3 -> ok
//   len == 4-5 -> warning (soft-warn: figures should usually be 0-2)
//   len >= 6   -> error (hard ceiling)

import type { Check, CheckError } from '../types'
import { figureHosts } from '../figure-hosts'

const SOFT_WARN_ABOVE = 3
const HARD_ERROR_ABOVE = 5

export const figureCountCeiling: Check = {
  name: 'figure-count-ceiling',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of figureHosts(content)) {
      const n = host.figures.length
      if (n <= SOFT_WARN_ABOVE) continue

      if (n > HARD_ERROR_ABOVE) {
        errors.push({
          ...host.ref,
          message: `${host.kind} declares ${n} figures (hard-error ceiling: ${HARD_ERROR_ABOVE})`,
          fix: [
            `consolidate related figures, or split the ${host.kind} -- ${HARD_ERROR_ABOVE}+ figures on one page fragments the read`,
          ],
        })
      } else {
        errors.push({
          ...host.ref,
          message: `${host.kind} declares ${n} figures (soft-warn above ${SOFT_WARN_ABOVE}; usually 0-2)`,
          fix: [
            'confirm each figure adds real value; usual count is 0-2 per host (docs/figures-design.md §0.1 Q7)',
          ],
          severity: 'warning',
        })
      }
    }

    return errors
  },
}
