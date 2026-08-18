import { describe, it, expect } from 'vitest'
import { patternCategory } from '../pattern-category'
import { makeContent, article, pattern } from './fixtures'

function withCategory(slug: string, category?: string) {
  return { ...pattern(slug), ...(category !== undefined ? { category } : {}) }
}

function run(patterns: ReturnType<typeof pattern>[]) {
  return patternCategory.run(makeContent({ articles: [article('a', [])], patterns }))
}

describe('pattern-category check', () => {
  it('passes when every pattern has a known category', () => {
    expect(
      run([withCategory('p1', 'resilience'), withCategory('p2', 'throughput')]),
    ).toEqual([])
  })

  it('errors when a pattern has no category', () => {
    const errs = run([withCategory('p1')])
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('has no category')
  })

  it('errors when a pattern has an unknown category', () => {
    const errs = run([withCategory('p1', 'scalability')])
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('unknown category')
  })
})
