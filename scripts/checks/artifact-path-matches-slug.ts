// Enforces the slug-equals-path convention from Units 5/5b/5c, now
// generalized to every artifact host (article OR pattern -- the
// ContentHost convergence, docs/pattern-artifacts-design.md §6). Any host
// with a non-null artifact must have
// `artifact.path === '/artifacts/' + host.slug + '/index.html'`. This is
// what compile-artifacts writes; the check makes it impossible to drift
// from that contract in hand-authored JSON without failing the build.
//
// Under the flat namespace (Approach A) the served slug IS the host slug,
// regardless of kind; expectedPath encodes that single point of change.

import type { Check, CheckError } from '../types'
import { artifactHosts } from '../content-hosts'

function expectedPath(slug: string): string {
  return `/artifacts/${slug}/index.html`
}

export const artifactPathMatchesSlug: Check = {
  name: 'artifact-path-matches-slug',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of artifactHosts(content)) {
      const expected = expectedPath(host.slug)
      if (host.artifact.path === expected) continue

      errors.push({
        ...host.ref,
        message: `artifact.path is \`${host.artifact.path}\`, expected \`${expected}\``,
        fix: [
          `set "artifact": { "path": "${expected}" } in this ${host.kind}`,
          `or set "artifact": null if this ${host.kind} has no interactive visualization`,
        ],
      })
    }

    return errors
  },
}
