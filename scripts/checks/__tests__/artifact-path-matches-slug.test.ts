import { describe, it, expect } from 'vitest'
import { artifactPathMatchesSlug } from '../artifact-path-matches-slug'
import { makeContent, article, pattern } from './fixtures'
import type { Article } from '../../../src/types'

// Extend the fixture builder with an artifact pointer. The base
// `article()` helper returns artifact: null; these helpers override.
function articleWithArtifact(
  slug: string,
  patternSlugs: readonly string[],
  artifactPath: string,
): Article {
  return {
    ...article(slug, patternSlugs),
    artifact: { path: artifactPath },
  }
}

describe('artifactPathMatchesSlug', () => {
  it('passes when artifact.path matches the canonical slug path', () => {
    const content = makeContent({
      articles: [
        articleWithArtifact('foo', ['p1'], '/artifacts/foo/index.html'),
      ],
      patterns: [pattern('p1')],
    })
    expect(artifactPathMatchesSlug.run(content)).toEqual([])
  })

  it('flags an article whose artifact.path does not match its slug', () => {
    const content = makeContent({
      articles: [
        articleWithArtifact('foo', ['p1'], '/artifacts/bar/index.html'),
      ],
      patterns: [pattern('p1')],
    })
    const errors = artifactPathMatchesSlug.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'foo',
      message: expect.stringContaining('/artifacts/bar/index.html'),
    })
    expect(errors[0]?.fix).toEqual([
      'set "artifact": { "path": "/artifacts/foo/index.html" } in this article',
      'or set "artifact": null if this article has no interactive visualization',
    ])
  })

  it('passes silently when artifact is null (summary-only article)', () => {
    // Null artifact is a valid data state per the discriminated-null
    // decision in Architecture Decisions; the check is only about
    // articles that DO declare an artifact pointer.
    const content = makeContent({
      articles: [article('foo', ['p1'])],
      patterns: [pattern('p1')],
    })
    expect(artifactPathMatchesSlug.run(content)).toEqual([])
  })

  it('flags multiple drifted articles in one pass', () => {
    const content = makeContent({
      articles: [
        articleWithArtifact('a1', ['p1'], '/artifacts/wrong-1/index.html'),
        articleWithArtifact('a2', ['p1'], '/artifacts/a2/index.html'),
        articleWithArtifact('a3', ['p1'], '/artifacts/wrong-3/index.html'),
      ],
      patterns: [pattern('p1')],
    })
    const errors = artifactPathMatchesSlug.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug)).toEqual(['a1', 'a3'])
  })

  it('flags a path that matches the slug folder but uses a non-canonical filename', () => {
    // Drifted filename inside the right folder is still drift.
    // Compile-artifacts only writes index.html; anything else won't be
    // served by the iframe.
    const content = makeContent({
      articles: [
        articleWithArtifact('foo', ['p1'], '/artifacts/foo/main.html'),
      ],
      patterns: [pattern('p1')],
    })
    const errors = artifactPathMatchesSlug.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('/artifacts/foo/main.html')
  })
})
