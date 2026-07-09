// 2026-07-08 landing/navigation phase check. Every distinct `cruxTag`
// used by any article must have a matching entry in
// `content/cruxtags.json` (the cruxTag registry). Missing entries fail
// the build -- an unlabeled group would render a raw kebab slug on the
// catalog page and break the `DefinedTermSet` structured data emitted
// on /catalog.
//
// There is deliberately NO orphan rule the other direction: a registry
// entry with zero articles is allowed (supports future article
// removals; a tag whose only article was removed shouldn't force a
// registry cleanup commit).
//
// This check does not verify anchor emission or JSON-LD @id
// resolution; that's the cross-page @id contract asserted directly in
// scripts/prerender.ts (Commit 6 in the phase plan). Together, this
// check guarantees the *registry data* covers every article's cruxTag,
// and the prerender assertion guarantees the *rendered anchor* covers
// every article's @id reference.

import type { Check, CheckError } from '../types'

export const cruxTagRegistryCoverage: Check = {
  name: 'cruxtag-registry-coverage',
  run: (content) => {
    const errors: CheckError[] = []
    const registry = content.cruxTagRegistry

    for (const article of content.articles) {
      const tag = article.cruxTag
      if (typeof tag !== 'string' || tag.length === 0) continue
      if (Object.prototype.hasOwnProperty.call(registry, tag)) continue
      errors.push({
        articleSlug: article.slug,
        message: `references cruxTag \`${tag}\` with no entry in content/cruxtags.json`,
        fix: [
          `add \`"${tag}": { "label": "...", "definition": "..." }\` to content/cruxtags.json`,
          'the label controls capitalization/hyphenation on catalog group headers exactly',
          'the definition is one sentence naming the bottleneck *class* (~12-20 words, company-neutral)',
        ],
      })
    }

    return errors
  },
}
