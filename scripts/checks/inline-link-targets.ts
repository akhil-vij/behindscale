// inline-link-targets: every inline cross-link `[text](/patterns/<slug>)`
// in a Prose field must resolve to a pattern that exists. Prose renders
// these as internal <Link>s (src/components/Prose.tsx); a link to a
// nonexistent slug would ship a 404 into the reading surface. This is the
// build-time enforcement of the "no link to a 404" invariant and of
// Corrections_pattern.md PP-54 ("link only patterns confirmed to exist;
// never guess a slug").
//
// Scope: `/patterns/<slug>` links (the documented, in-use form) in pattern
// definitions and article problem/solution prose. Other internal paths are
// not resolved here.

import type { Check, CheckError } from '../types'

const PATTERN_LINK = /\[[^\]]+\]\(\/patterns\/([a-z0-9-]+)\)/g

export const inlineLinkTargets: Check = {
  name: 'inline-link-targets',
  run: (content) => {
    const errors: CheckError[] = []
    const patternSlugs = new Set(content.patterns.map((p) => p.slug))

    const scan = (
      where: string,
      text: string,
      ref: { patternSlug: string } | { articleSlug: string },
    ) => {
      PATTERN_LINK.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = PATTERN_LINK.exec(text)) !== null) {
        const slug = m[1]!
        if (!patternSlugs.has(slug)) {
          errors.push({
            ...ref,
            message: `${where}: inline link points to /patterns/${slug}, which is not a known pattern (dead link)`,
            fix: [
              `link only patterns that exist (a co-occurrence entry, a live pattern, or an owner-confirmed one); never guess a slug`,
            ],
          })
        }
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
