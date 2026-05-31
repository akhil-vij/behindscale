import { describe, it, expect } from 'vitest'
import { minimumPatternCoverage } from '../minimum-pattern-coverage'
import { makeContent, article, pattern } from './fixtures'

describe('minimumPatternCoverage', () => {
  it('passes for an article with exactly 2 patterns', () => {
    const content = makeContent({
      articles: [article('a', ['p1', 'p2'])],
      patterns: [pattern('p1'), pattern('p2')],
    })
    expect(minimumPatternCoverage.run(content)).toEqual([])
  })

  it('passes for an article with more than 2 patterns', () => {
    const content = makeContent({
      articles: [article('a', ['p1', 'p2', 'p3'])],
      patterns: [pattern('p1'), pattern('p2'), pattern('p3')],
    })
    expect(minimumPatternCoverage.run(content)).toEqual([])
  })

  it('flags an article with exactly 1 pattern', () => {
    const content = makeContent({
      articles: [article('a', ['p1'])],
      patterns: [pattern('p1')],
    })
    const errors = minimumPatternCoverage.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'a',
      message: 'references 1 pattern (minimum 2)',
    })
  })

  it('flags an article with 0 patterns', () => {
    const content = makeContent({
      articles: [article('a', [])],
      patterns: [],
    })
    const errors = minimumPatternCoverage.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'a',
      message: 'references 0 patterns (minimum 2)',
    })
  })

  it('reports every below-threshold article in one pass', () => {
    const content = makeContent({
      articles: [
        article('a1', []),
        article('a2', ['p1']),
        article('a3', ['p1', 'p2']),
      ],
      patterns: [pattern('p1'), pattern('p2')],
    })
    const errors = minimumPatternCoverage.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug)).toEqual(['a1', 'a2'])
  })
})
