import { describe, it, expect } from 'vitest'
import { statsValueInProse } from '../stats-value-in-prose'
import { makeContent, article, pattern } from './fixtures'
import type { Article } from '../../../src/types'

function articleWithStats(
  slug: string,
  prose: { problem?: string; solution?: string; tradeoffs?: string[] },
  stats: Article['stats'],
): Article {
  return {
    ...article(slug, ['p1']),
    problem: prose.problem ?? '',
    solution: prose.solution ?? '',
    tradeoffs: prose.tradeoffs ?? [],
    stats,
  }
}

describe('statsValueInProse', () => {
  it('passes when an article has no stats field', () => {
    const content = makeContent({
      articles: [article('a', ['p1'])],
      patterns: [pattern('p1')],
    })
    expect(statsValueInProse.run(content)).toEqual([])
  })

  it('passes when every stat.value appears verbatim in prose', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          { solution: 'throughput rose by +80% and goroutines dropped 93%.' },
          [
            { value: '+80%', label: 'throughput under overload', placement: 'solution' },
            { value: '93%', label: 'fewer goroutines', placement: 'solution' },
          ],
        ),
      ],
      patterns: [pattern('p1')],
    })
    expect(statsValueInProse.run(content)).toEqual([])
  })

  it('matches a normalized value (+80% in stats vs 80 in prose)', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          { solution: 'throughput rose by 80 percent in the rollout.' },
          [{ value: '+80%', label: 'throughput', placement: 'solution' }],
        ),
      ],
      patterns: [pattern('p1')],
    })
    expect(statsValueInProse.run(content)).toEqual([])
  })

  it('matches a value with whitespace variants ("3.1 s" vs "3.1s")', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          { solution: 'P99 latency fell from 3.1s to 1.0s.' },
          [{ value: '3.1 s', label: 'P99 before', placement: 'solution' }],
        ),
      ],
      patterns: [pattern('p1')],
    })
    expect(statsValueInProse.run(content)).toEqual([])
  })

  it('flags a stat whose value does not appear in any prose field', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          {
            problem: 'load shedding became necessary at scale.',
            solution: 'rolled out a new admission controller.',
            tradeoffs: ['tuning constants is ongoing work.'],
          },
          [{ value: '99.99%', label: 'fabricated SLA', placement: 'solution' }],
        ),
      ],
      patterns: [pattern('p1')],
    })
    const errors = statsValueInProse.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'cinnamon',
      message: expect.stringContaining('99.99%'),
    })
  })

  it('flags more than 3 stats with the max-3 rule', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          { solution: '1 2 3 4' },
          [
            { value: '1', label: 'a', placement: 'solution' },
            { value: '2', label: 'b', placement: 'solution' },
            { value: '3', label: 'c', placement: 'solution' },
            { value: '4', label: 'd', placement: 'solution' },
          ],
        ),
      ],
      patterns: [pattern('p1')],
    })
    const errors = statsValueInProse.run(content)
    const maxErrs = errors.filter((e) => e.message.includes('max is'))
    expect(maxErrs).toHaveLength(1)
    expect(maxErrs[0]?.message).toContain('4 stats')
  })

  it('flags one max-3 error AND one value-not-in-prose error in a single pass', () => {
    const content = makeContent({
      articles: [
        articleWithStats(
          'cinnamon',
          { solution: '1 2 3 fine' },
          [
            { value: '1', label: 'a', placement: 'solution' },
            { value: '2', label: 'b', placement: 'solution' },
            { value: '3', label: 'c', placement: 'solution' },
            { value: '999', label: 'd-missing', placement: 'solution' },
          ],
        ),
      ],
      patterns: [pattern('p1')],
    })
    const errors = statsValueInProse.run(content)
    expect(errors).toHaveLength(2)
  })
})
