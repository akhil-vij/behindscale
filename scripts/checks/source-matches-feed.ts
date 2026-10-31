// Every article's `source` block is its blog's content/feeds.json entry,
// copied verbatim: articles inherit source data, they don't invent it
// (architecture.md, Content Contract → Source). Two failures:
//   - the article names a source slug the allowlist doesn't have;
//   - the block differs from the entry in any field (a trailing slash, an
//     old feed path, a different domain for the same blog).
// This ties attribution to the allowlist; it does not check that the
// article's own `url` lives on that blog (invariant 7 stays editorial).

import type { Source } from '../../src/types'
import type { Check, CheckError } from '../types'

const FIELDS: readonly (keyof Source)[] = ['name', 'slug', 'company', 'url', 'feed']

export const sourceMatchesFeed: Check = {
  name: 'source-matches-feed',
  run: (content) => {
    const errors: CheckError[] = []
    const bySlug = new Map(content.feeds.map((f) => [f.slug, f]))

    for (const article of content.articles) {
      const entry = bySlug.get(article.source.slug)
      if (entry === undefined) {
        errors.push({
          articleSlug: article.slug,
          message: `source.slug \`${article.source.slug}\` is not in content/feeds.json`,
          fix: [
            'use the slug of the blog\'s existing content/feeds.json entry',
            'or, if this is a new official engineering blog, add its entry to content/feeds.json first',
          ],
        })
        continue
      }

      const differing = FIELDS.filter((k) => article.source[k] !== entry[k])
      if (differing.length === 0) continue

      errors.push({
        articleSlug: article.slug,
        message: `source differs from its content/feeds.json entry in ${differing
          .map((k) => `\`${k}\` (has "${article.source[k]}", allowlist "${entry[k]}")`)
          .join(', ')}`,
        fix: [`copy the \`${entry.slug}\` entry from content/feeds.json into "source" verbatim`],
      })
    }

    return errors
  },
}
