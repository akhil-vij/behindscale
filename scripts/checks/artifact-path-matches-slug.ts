// Enforces the slug-equals-path convention from Units 5/5b/5c: every
// article with `artifact !== null` must have
// `artifact.path === '/artifacts/' + slug + '/index.html'`. This is
// what the compile-artifacts script writes; this check makes it
// impossible to drift from that contract in hand-authored Article
// JSON without failing the build.

import type { Check, CheckError } from '../types'

function expectedPath(slug: string): string {
  return `/artifacts/${slug}/index.html`
}

export const artifactPathMatchesSlug: Check = {
  name: 'artifact-path-matches-slug',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      if (article.artifact === null) continue

      const expected = expectedPath(article.slug)
      if (article.artifact.path === expected) continue

      errors.push({
        articleSlug: article.slug,
        message: `artifact.path is \`${article.artifact.path}\`, expected \`${expected}\``,
        fix: [
          `set "artifact": { "path": "${expected}" } in this article`,
          `or set "artifact": null if this article has no interactive visualization`,
        ],
      })
    }

    return errors
  },
}
