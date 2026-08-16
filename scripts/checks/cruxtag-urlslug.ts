// cruxtag-urlslug: every cruxTag registry entry must carry a `urlSlug`
// -- the plain-words page address for its /problems/<urlSlug> page
// (docs/nav-ia-decisions.md D1). urlSlug is optional at the schema
// level (checkCruxTagEntry validates its FORMAT when present); this
// check enforces the content policy: present on every entry, and
// unique across the registry.
//
// Kebab-case is already guaranteed by the schema predicate; re-checked
// here defensively so a malformed value surfaces under this check's
// name too. Cross-namespace collisions with /patterns are structurally
// impossible (different route prefix), so no check there.

import type { Check, CheckError } from '../types'

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const cruxtagUrlslug: Check = {
  name: 'cruxtag-urlslug',
  run: (content) => {
    const errors: CheckError[] = []
    const seen = new Map<string, string>() // urlSlug -> first registry key

    for (const [slug, entry] of Object.entries(content.cruxTagRegistry)) {
      const urlSlug = entry.urlSlug
      if (urlSlug === undefined || urlSlug.trim().length === 0) {
        errors.push({
          file: 'content/cruxtags.json',
          message: `cruxTag "${slug}" is missing a urlSlug (the /problems/<urlSlug> page address)`,
          fix: [
            `add "urlSlug": "<plain-words-slug>" to the "${slug}" entry (docs/nav-ia-decisions.md D1)`,
          ],
        })
        continue
      }
      if (!KEBAB_CASE.test(urlSlug)) {
        errors.push({
          file: 'content/cruxtags.json',
          message: `cruxTag "${slug}" urlSlug "${urlSlug}" is not kebab-case`,
          fix: ['use lowercase-kebab-case: ^[a-z0-9]+(-[a-z0-9]+)*$'],
        })
        continue
      }
      const prior = seen.get(urlSlug)
      if (prior !== undefined) {
        errors.push({
          file: 'content/cruxtags.json',
          message: `urlSlug "${urlSlug}" is used by both "${prior}" and "${slug}" (must be unique -- it is a page address)`,
          fix: [`give one of them a distinct urlSlug`],
        })
        continue
      }
      seen.set(urlSlug, slug)
    }

    return errors
  },
}
