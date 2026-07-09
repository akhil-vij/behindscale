import { describe, it, expect } from 'vitest'
import { cruxSummaryLength } from '../crux-summary-length'
import { makeContent, article, pattern } from './fixtures'
import type { Article } from '../../../src/types'

function articleWithSummary(slug: string, cruxSummary: string): Article {
  return { ...article(slug, ['p1']), cruxSummary }
}

describe('cruxSummaryLength', () => {
  it('passes on a short, non-empty summary', () => {
    const content = makeContent({
      articles: [articleWithSummary('a', 'A concise one-line crux compression.')],
      patterns: [pattern('p1')],
    })
    expect(cruxSummaryLength.run(content)).toEqual([])
  })

  it('errors on an empty cruxSummary', () => {
    const content = makeContent({
      articles: [articleWithSummary('a', '')],
      patterns: [pattern('p1')],
    })
    const errors = cruxSummaryLength.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.articleSlug).toBe('a')
    expect(errors[0]?.message).toMatch(/missing or empty/)
    expect(errors[0]?.severity).toBeUndefined()
  })

  it('errors on a whitespace-only cruxSummary', () => {
    const content = makeContent({
      articles: [articleWithSummary('a', '   \t  ')],
      patterns: [pattern('p1')],
    })
    const errors = cruxSummaryLength.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toMatch(/missing or empty/)
  })

  it('warns when a cruxSummary exceeds the soft word max', () => {
    // 21 words: intentionally past the ~20 threshold.
    const long =
      'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one'
    const content = makeContent({
      articles: [articleWithSummary('a', long)],
      patterns: [pattern('p1')],
    })
    const errors = cruxSummaryLength.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.severity).toBe('warning')
    expect(errors[0]?.message).toMatch(/21 words/)
  })

  it('passes at the soft word max boundary (exactly 20 words)', () => {
    const twenty =
      'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
    const content = makeContent({
      articles: [articleWithSummary('a', twenty)],
      patterns: [pattern('p1')],
    })
    expect(cruxSummaryLength.run(content)).toEqual([])
  })

  it('reports each article independently', () => {
    const content = makeContent({
      articles: [
        articleWithSummary('empty', ''),
        articleWithSummary('ok', 'Short and legible.'),
        articleWithSummary(
          'long',
          'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one',
        ),
      ],
      patterns: [pattern('p1')],
    })
    const errors = cruxSummaryLength.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug).sort()).toEqual(['empty', 'long'])
  })
})
