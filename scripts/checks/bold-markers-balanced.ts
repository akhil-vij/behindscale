// bold-markers-balanced: every `**bold**` marker in a Prose field must be
// balanced and well-formed. The renderer (src/components/Prose.tsx) turns
// `**text**` into <strong> via a non-nested matcher (`\*\*[^*]+\*\*`); an
// odd or malformed marker would fall through and ship literal asterisks
// into the reading surface. This is the build-time enforcement of the
// "no literal markdown leak" invariant for bold, the sibling of
// `inline-link-targets` for links.
//
// Scope: the Prose-rendered fields -- pattern definitions and article
// problem/solution. whenItApplies/tradeoffs are NOT Prose-rendered
// (tradeoffs use boldLead, whenItApplies is a plain grid), so `**` there
// would never render as bold; this check flags it in those fields too so
// stray markers don't slip in unrendered.

import type { Check, CheckError } from '../types'

const WELL_FORMED_BOLD = /\*\*[^*]+\*\*/g

export const boldMarkersBalanced: Check = {
  name: 'bold-markers-balanced',
  run: (content) => {
    const errors: CheckError[] = []

    const scan = (
      where: string,
      text: string,
      ref: { patternSlug: string } | { articleSlug: string },
    ) => {
      // Remove every well-formed `**text**` pair, then any surviving `**`
      // is unbalanced or malformed (empty, or wrapping a `*`).
      const residue = text.replace(WELL_FORMED_BOLD, '')
      if (residue.includes('**')) {
        errors.push({
          ...ref,
          message: `${where}: unbalanced or malformed bold marker \`**\` -- every bold span must be \`**text**\` (non-empty, no nested \`*\`), or it ships literal asterisks`,
          fix: [
            `balance the \`**\` markers, or drop them if bold was not intended`,
          ],
        })
      }
    }

    for (const p of content.patterns) {
      scan('definition', p.definition, { patternSlug: p.slug })
    }
    for (const a of content.articles) {
      scan('problem', a.problem, { articleSlug: a.slug })
      scan('solution', a.solution, { articleSlug: a.slug })
    }

    return errors
  },
}
