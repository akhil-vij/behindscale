// figure-fields-nonempty: enforces the Q10 word bands on figure
// metadata. Non-emptiness is caught at schema (checkFigure); this
// check adds the length bands and the eyebrow-is-uppercase rule.
//
// Bands (docs/figures-design.md §0.1 Q10):
//   - eyebrow: 2-6 words, all-uppercase
//   - caption: 12-40 words
//   - ariaLabel: 4-20 words
//
// A miss is a hard error, not a warning -- these are structural
// bands, not fuzzy content-drift signals.

import type { Check, CheckError } from '../types'

const EYEBROW_MIN = 2
const EYEBROW_MAX = 6
const CAPTION_MIN = 12
const CAPTION_MAX = 40
const ARIA_MIN = 4
const ARIA_MAX = 20

function wordCount(s: string): number {
  const trimmed = s.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

// "All caps" means every letter is uppercase. Digits, spaces, and
// punctuation (·, &, hyphens, commas) are allowed. Lowercase letters
// anywhere -> not all caps.
function isAllUppercase(s: string): boolean {
  return !/[a-z]/.test(s)
}

export const figureFieldsNonempty: Check = {
  name: 'figure-fields-nonempty',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      if (article.figures === undefined) continue
      for (const fig of article.figures) {
        const ew = wordCount(fig.eyebrow)
        if (ew < EYEBROW_MIN || ew > EYEBROW_MAX) {
          errors.push({
            articleSlug: article.slug,
            message: `figure "${fig.slug}" eyebrow is ${ew} words (band: ${EYEBROW_MIN}-${EYEBROW_MAX})`,
            fix: [
              `rewrite eyebrow to sit inside ${EYEBROW_MIN}-${EYEBROW_MAX} words (uppercase mono label)`,
            ],
          })
        }
        if (!isAllUppercase(fig.eyebrow)) {
          errors.push({
            articleSlug: article.slug,
            message: `figure "${fig.slug}" eyebrow "${fig.eyebrow}" is not all-uppercase`,
            fix: [
              'uppercase the eyebrow (mono label convention, per docs/figures-design.md Q10)',
            ],
          })
        }
        const cw = wordCount(fig.caption)
        if (cw < CAPTION_MIN || cw > CAPTION_MAX) {
          errors.push({
            articleSlug: article.slug,
            message: `figure "${fig.slug}" caption is ${cw} words (band: ${CAPTION_MIN}-${CAPTION_MAX})`,
            fix: [
              `rewrite caption to sit inside ${CAPTION_MIN}-${CAPTION_MAX} words (plain-English sentence rendered below the SVG)`,
            ],
          })
        }
        const aw = wordCount(fig.ariaLabel)
        if (aw < ARIA_MIN || aw > ARIA_MAX) {
          errors.push({
            articleSlug: article.slug,
            message: `figure "${fig.slug}" ariaLabel is ${aw} words (band: ${ARIA_MIN}-${ARIA_MAX})`,
            fix: [
              `rewrite ariaLabel to sit inside ${ARIA_MIN}-${ARIA_MAX} words (screen-reader label; often shorter/tighter than the caption)`,
            ],
          })
        }
      }
    }

    return errors
  },
}
