// artifact-slug-unique: the flat-namespace collision guard for artifacts
// (Approach A, docs/pattern-artifacts-design.md §4). Every artifact host
// serves from /artifacts/<host-slug>/, a single namespace shared across
// host kinds. If two hosts of any kind (e.g. an article and a pattern, or
// a future company and a category) declare an artifact with the same slug,
// they would compile to the same public/artifacts/<slug>/ dir and silently
// mis-serve each other's bundle. This flags it as a hard error with both
// locators rather than let one overwrite the other.
//
// This is the artifact analogue of figure-svg-exists's cross-kind guard.
// It reads the host registry, so future host kinds are covered for free.

import type { Check, CheckError } from '../types'
import { artifactHosts } from '../content-hosts'

export const artifactSlugUnique: Check = {
  name: 'artifact-slug-unique',
  run: (content) => {
    const errors: CheckError[] = []

    const bySlug = new Map<string, { kind: string; ref: object }[]>()
    for (const host of artifactHosts(content)) {
      const list = bySlug.get(host.slug) ?? []
      list.push({ kind: host.kind, ref: host.ref })
      bySlug.set(host.slug, list)
    }

    for (const [slug, hosts] of bySlug) {
      if (hosts.length < 2) continue
      const kinds = hosts.map((h) => h.kind).join(', ')
      for (const h of hosts) {
        errors.push({
          ...h.ref,
          message: `artifact slug "${slug}" is claimed by ${hosts.length} hosts (${kinds}); they would share /artifacts/${slug}/`,
          fix: [`rename one host so their artifact slugs never collide`],
        })
      }
    }

    return errors
  },
}
