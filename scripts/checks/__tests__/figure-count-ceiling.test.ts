import { describe, it, expect } from 'vitest'
import { figureCountCeiling } from '../figure-count-ceiling'
import { article, figure, makeContent, pattern } from './fixtures'

function contentWithNFigures(n: number) {
  const figs = Array.from({ length: n }, (_, i) => figure(`f${i}`))
  const a = { ...article('a', ['p']), figures: figs }
  return makeContent({
    articles: [a],
    patterns: [pattern('p')],
  })
}

describe('figure-count-ceiling', () => {
  it('passes 0-3 figures cleanly', () => {
    for (const n of [0, 1, 2, 3]) {
      expect(figureCountCeiling.run(contentWithNFigures(n))).toEqual([])
    }
  })

  it('emits a warning (not error) at 4 figures', () => {
    const errors = figureCountCeiling.run(contentWithNFigures(4))
    expect(errors).toHaveLength(1)
    expect(errors[0]?.severity).toBe('warning')
    expect(errors[0]?.message).toContain('4 figures')
  })

  it('emits a warning (not error) at 5 figures', () => {
    const errors = figureCountCeiling.run(contentWithNFigures(5))
    expect(errors).toHaveLength(1)
    expect(errors[0]?.severity).toBe('warning')
  })

  it('emits an error at 6 figures (hard ceiling)', () => {
    const errors = figureCountCeiling.run(contentWithNFigures(6))
    expect(errors).toHaveLength(1)
    // Error severity is undefined by default (matches other checks'
    // omission of severity when it is 'error').
    expect(errors[0]?.severity).toBeUndefined()
    expect(errors[0]?.message).toContain('6 figures')
  })

  it('emits an error at 10 figures', () => {
    const errors = figureCountCeiling.run(contentWithNFigures(10))
    expect(errors[0]?.severity).toBeUndefined()
    expect(errors[0]?.message).toContain('10 figures')
  })
})
