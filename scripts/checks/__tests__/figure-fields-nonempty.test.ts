import { describe, it, expect } from 'vitest'
import { figureFieldsNonempty } from '../figure-fields-nonempty'
import { article, figure, makeContent, pattern } from './fixtures'

function contentWith(fig: ReturnType<typeof figure>) {
  const a = { ...article('a', ['p']), figures: [fig] }
  return makeContent({
    articles: [a],
    patterns: [pattern('p')],
  })
}

describe('figure-fields-nonempty (word bands)', () => {
  it('passes the default fixture (all fields inside their bands)', () => {
    expect(figureFieldsNonempty.run(contentWith(figure('f')))).toEqual([])
  })

  it('errors when eyebrow is fewer than 2 words', () => {
    const errors = figureFieldsNonempty.run(
      contentWith(figure('f', { eyebrow: 'HODOR' })),
    )
    expect(errors.some((e) => e.message.includes('eyebrow is 1 words'))).toBe(
      true,
    )
  })

  it('errors when eyebrow is more than 6 words', () => {
    const errors = figureFieldsNonempty.run(
      contentWith(
        figure('f', { eyebrow: 'ONE TWO THREE FOUR FIVE SIX SEVEN' }),
      ),
    )
    expect(errors.some((e) => e.message.includes('eyebrow is 7 words'))).toBe(
      true,
    )
  })

  it('errors when eyebrow contains a lowercase letter', () => {
    const errors = figureFieldsNonempty.run(
      contentWith(figure('f', { eyebrow: 'WHERE hodor RUNS' })),
    )
    expect(errors.some((e) => e.message.includes('not all-uppercase'))).toBe(
      true,
    )
  })

  it('accepts eyebrows containing digits and punctuation', () => {
    expect(
      figureFieldsNonempty
        .run(
          contentWith(figure('f', { eyebrow: 'V2 & V3 · ONE CAP' })),
        )
        .filter((e) => e.message.includes('eyebrow'))
        .length,
    ).toBe(0)
  })

  it('errors when caption is under 12 words', () => {
    const errors = figureFieldsNonempty.run(
      contentWith(figure('f', { caption: 'too short a caption.' })),
    )
    expect(errors.some((e) => e.message.includes('caption is 4 words'))).toBe(
      true,
    )
  })

  it('errors when caption is over 40 words', () => {
    const words = Array.from({ length: 45 }, (_, i) => `w${i}`).join(' ')
    const errors = figureFieldsNonempty.run(
      contentWith(figure('f', { caption: words })),
    )
    expect(
      errors.some((e) => e.message.includes('caption is 45 words')),
    ).toBe(true)
  })

  it('errors when ariaLabel is under 4 or over 20 words', () => {
    const under = figureFieldsNonempty.run(
      contentWith(figure('f', { ariaLabel: 'too short' })),
    )
    expect(under.some((e) => e.message.includes('ariaLabel'))).toBe(true)

    const overWords = Array.from({ length: 25 }, () => 'x').join(' ')
    const over = figureFieldsNonempty.run(
      contentWith(figure('f', { ariaLabel: overWords })),
    )
    expect(over.some((e) => e.message.includes('ariaLabel'))).toBe(true)
  })

  it('reports every violation, not just the first', () => {
    // Fixture with eyebrow AND caption both out of band.
    const errors = figureFieldsNonempty.run(
      contentWith(
        figure('f', { eyebrow: 'x', caption: 'short' }),
      ),
    )
    // 3 total: eyebrow word-count, eyebrow all-caps, caption word-count
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })
})
