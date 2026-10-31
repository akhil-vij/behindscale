// orphan-artifacts (soft warn): an artifact source at
// content/artifacts/<slug>.jsx that no content host declares compiles to
// dead output -- a bundle nothing links to. This flags the drift so a
// renamed/removed host doesn't silently leave its artifact behind.
//
// Severity is 'warning' by design (docs/pattern-artifacts-design.md §6):
// a stray bundle is harmless (it just isn't served), so it should not
// block the build; it's a hygiene signal.
//
// The `_`-prefix convention marks genuine SITE artifacts bound to no
// content entity, rendered directly by a page) and is exempt. It has no
// members today: the only one, `_hero`, retired when the landing hero moved
// to the priority-aware-load-shedding pattern artifact. The convention stays
// valid for future site artifacts. See pattern-artifacts-design.md §1.2.

import type { Check, CheckError } from '../types'
import { artifactHosts } from '../content-hosts'

export const orphanArtifacts: Check = {
  name: 'orphan-artifacts',
  run: (content) => {
    const errors: CheckError[] = []

    const declared = new Set(artifactHosts(content).map((h) => h.slug))
    for (const slug of content.artifactSourceSlugs) {
      if (slug.startsWith('_')) continue // site-artifact convention
      if (declared.has(slug)) continue

      errors.push({
        file: `content/artifacts/${slug}.jsx`,
        severity: 'warning',
        message: `artifact source has no declaring host (no article/pattern points at /artifacts/${slug}/)`,
        fix: [
          `add "artifact": { "path": "/artifacts/${slug}/index.html" } to the owning article/pattern`,
          `or delete content/artifacts/${slug}.jsx if it is no longer used`,
          `or rename it with a leading "_" if it is a genuine site artifact`,
        ],
      })
    }

    return errors
  },
}
