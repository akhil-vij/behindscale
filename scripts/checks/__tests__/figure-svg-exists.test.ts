import { describe, it, expect } from 'vitest'
import { figureSvgExists } from '../figure-svg-exists'
import { article, figure, makeContent, pattern } from './fixtures'

describe('figure-svg-exists', () => {
  it('passes when no articles declare figures', () => {
    const content = makeContent({
      articles: [article('a', ['p'])],
      patterns: [pattern('p')],
    })
    expect(figureSvgExists.run(content)).toEqual([])
  })

  it('passes when every declared figure has a present SVG', () => {
    const a = { ...article('a', ['p']), figures: [figure('fig-1')] }
    const svgs = new Map([
      [
        'a/fig-1',
        {
          path: 'content/figures/a/fig-1.svg',
          contents: '<svg />',
        },
      ],
    ])
    const content = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      figureSvgs: svgs,
    })
    expect(figureSvgExists.run(content)).toEqual([])
  })

  it('errors when a declared figure has no SVG entry at all', () => {
    const a = { ...article('a', ['p']), figures: [figure('missing')] }
    const content = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      // no figureSvgs entry for a/missing
    })
    const errors = figureSvgExists.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.articleSlug).toBe('a')
    expect(errors[0]?.message).toContain('missing')
    expect(errors[0]?.message).toContain(
      'content/figures/a/missing.svg',
    )
  })

  it('errors when the SVG entry is present but contents is null', () => {
    const a = { ...article('a', ['p']), figures: [figure('gone')] }
    const svgs = new Map([
      [
        'a/gone',
        { path: 'content/figures/a/gone.svg', contents: null },
      ],
    ])
    const content = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      figureSvgs: svgs,
    })
    expect(figureSvgExists.run(content)).toHaveLength(1)
  })

  it('reports one error per missing figure across multiple articles', () => {
    const a = { ...article('a', ['p']), figures: [figure('one')] }
    const b = {
      ...article('b', ['p']),
      figures: [figure('two'), figure('three')],
    }
    const svgs = new Map([
      [
        'b/two',
        { path: 'content/figures/b/two.svg', contents: '<svg />' },
      ],
    ])
    const content = makeContent({
      articles: [a, b],
      patterns: [pattern('p')],
      figureSvgs: svgs,
    })
    const errors = figureSvgExists.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug).sort()).toEqual(['a', 'b'])
  })
})
