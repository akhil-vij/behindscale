import { describe, it, expect } from 'vitest'
import { orphanPatternSlugs } from '../orphan-pattern-slugs'
import { makeContent, article, pattern } from './fixtures'

describe('orphanPatternSlugs', () => {
  it('passes when every reference has a matching definition', () => {
    const content = makeContent({
      articles: [article('a', ['p1', 'p2'])],
      patterns: [pattern('p1'), pattern('p2')],
    })
    expect(orphanPatternSlugs.run(content)).toEqual([])
  })

  it('flags an article reference whose pattern slug has no definition', () => {
    const content = makeContent({
      articles: [article('a', ['p1', 'orphan'])],
      patterns: [pattern('p1')],
    })
    const errors = orphanPatternSlugs.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'a',
      message: expect.stringContaining('orphan'),
    })
    expect(errors[0]?.fix).toEqual([
      'add content/patterns/orphan.json (PatternDefinition shape)',
      'or remove the `orphan` reference from this article',
    ])
  })

  it('flags multiple orphans across multiple articles in one pass', () => {
    const content = makeContent({
      articles: [
        article('a1', ['orphan1']),
        article('a2', ['orphan2', 'p1']),
      ],
      patterns: [pattern('p1')],
    })
    const errors = orphanPatternSlugs.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug)).toEqual(['a1', 'a2'])
  })

  it('passes silently when an article has no patterns at all', () => {
    // minimum-pattern-coverage is the other check's concern; orphan
    // check is only about references that exist.
    const content = makeContent({
      articles: [article('a', [])],
      patterns: [],
    })
    expect(orphanPatternSlugs.run(content)).toEqual([])
  })

  it('passes when a pattern definition exists with zero referencing articles', () => {
    // Patterns can be seeded before their first article (architecture.md
    // invariant 8); the orphan check is unidirectional.
    const content = makeContent({
      articles: [],
      patterns: [pattern('p1')],
    })
    expect(orphanPatternSlugs.run(content)).toEqual([])
  })
})
