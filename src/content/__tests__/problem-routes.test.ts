import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Routing guard (nav-IA Phase 3). ProblemDetail (route param -> cruxTag)
// and the article crux links (cruxTag -> class-page href) both resolve a
// cruxTag against the registry's `urlSlug`. If any cruxTag an article
// uses lacked a urlSlug, those surfaces would dead-link. `cruxtag-urlslug`
// (every entry has a unique kebab urlSlug) and `cruxtag-registry-coverage`
// (every article cruxTag has an entry) each guarantee half of this; this
// test asserts the composed contract directly, so the resolver maps in
// src/content/index.ts are provably total over realised content and the
// /problems/<urlSlug> routes can never dead-link.
//
// Reads the content files via fs (cwd-relative, matching
// scripts/load-content.ts) rather than importing the Vite-glob'd content
// module, so the guard holds independent of the bundler.

interface RegistryEntry {
  urlSlug?: string
}

const registry = JSON.parse(
  readFileSync(join('content', 'cruxtags.json'), 'utf8'),
) as Record<string, RegistryEntry>

const articleCruxTags = readdirSync(join('content', 'articles'))
  .filter((f) => f.endsWith('.json'))
  .map(
    (f) =>
      (
        JSON.parse(
          readFileSync(join('content', 'articles', f), 'utf8'),
        ) as { cruxTag: string }
      ).cruxTag,
  )

describe('problem-route resolver totality', () => {
  it('every article cruxTag resolves to a registry urlSlug', () => {
    const unresolved = Array.from(new Set(articleCruxTags)).filter(
      (tag) => typeof registry[tag]?.urlSlug !== 'string',
    )
    expect(unresolved).toEqual([])
  })

  it('urlSlugs are unique across the registry (no route collision)', () => {
    const slugs = Object.values(registry)
      .map((e) => e.urlSlug)
      .filter((s): s is string => typeof s === 'string')
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
