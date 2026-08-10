import { describe, it, expect } from 'vitest'
import { unusedFigureDefs } from '../unused-figure-defs'
import { article, figure, makeContent, pattern } from './fixtures'

describe('unused-figure-defs', () => {
  it('passes when no figures are declared', () => {
    const c = makeContent({
      articles: [article('a', ['p'])],
      patterns: [pattern('p')],
    })
    expect(unusedFigureDefs.run(c)).toEqual([])
  })

  it('passes when every declared figure has a marker', () => {
    const a = {
      ...article('a', ['p']),
      figures: [figure('f')],
      solution: 'body.\n\n{{figure:f}}\n\nmore body.',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(unusedFigureDefs.run(c)).toEqual([])
  })

  it('errors when a figure is declared but not referenced', () => {
    const a = {
      ...article('a', ['p']),
      figures: [figure('unused')],
      solution: 'body without markers.',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    const errors = unusedFigureDefs.run(c)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('unused')
  })

  it('accepts marker in problem or solution (either)', () => {
    const a = {
      ...article('a', ['p']),
      figures: [figure('f')],
      problem: '{{figure:f}}',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(unusedFigureDefs.run(c)).toEqual([])
  })

  it('reports every unused figure separately', () => {
    const a = {
      ...article('a', ['p']),
      figures: [figure('a'), figure('b'), figure('c')],
      solution: '{{figure:a}}',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    const errors = unusedFigureDefs.run(c)
    expect(errors.map((e) => e.message).sort()).toEqual([
      expect.stringContaining('"b"'),
      expect.stringContaining('"c"'),
    ])
  })
})
