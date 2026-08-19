// artifact-bundle-exists: every host that declares a non-null artifact
// must have a source at content/artifacts/<host-slug>.jsx. This is the
// binding v1.3 validator requirement (docs/pattern-artifacts-design.md §6)
// and the artifact analogue of figure-svg-exists.
//
// It checks the SOURCE .jsx, not the compiled bundle, because `validate`
// runs before `compile-artifacts` in the build pipeline -- a declared
// artifact whose source is missing would otherwise fail late (a blank
// error frame at read time) instead of at the build boundary. The loader
// pre-scans the artifacts dir into content.artifactSourceSlugs so this
// check does no IO.

import type { Check, CheckError } from '../types'
import { artifactHosts } from '../content-hosts'

export const artifactBundleExists: Check = {
  name: 'artifact-bundle-exists',
  run: (content) => {
    const errors: CheckError[] = []

    for (const host of artifactHosts(content)) {
      if (content.artifactSourceSlugs.has(host.slug)) continue

      errors.push({
        ...host.ref,
        message: `${host.kind} declares an artifact but no source exists at content/artifacts/${host.slug}.jsx`,
        fix: [
          `author content/artifacts/${host.slug}.jsx`,
          `or set "artifact": null if this ${host.kind} has no interactive visualization`,
        ],
      })
    }

    return errors
  },
}
