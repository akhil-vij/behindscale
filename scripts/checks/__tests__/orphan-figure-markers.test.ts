import { describe, it, expect } from 'vitest'
import { orphanFigureMarkers } from '../orphan-figure-markers'
import { article, figure, makeContent, pattern } from './fixtures'

describe('orphan-figure-markers', () => {
  it('passes when no markers and no figures', () => {
    const c = makeContent({
      articles: [article('a', ['p'])],
      patterns: [pattern('p')],
    })
    expect(orphanFigureMarkers.run(c)).toEqual([])
  })

  it('passes when every marker resolves to a declared figure', () => {
    const a = {
      ...article('a', ['p']),
      figures: [figure('f')],
      solution: 'body.\n\n{{figure:f}}\n\nmore body.',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(orphanFigureMarkers.run(c)).toEqual([])
  })

  it('errors when a marker has no matching figures[] entry', () => {
    const a = {
      ...article('a', ['p']),
      solution: 'body.\n\n{{figure:ghost}}\n\nmore.',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    const errors = orphanFigureMarkers.run(c)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('ghost')
  })

  it('detects markers in the problem field as well as solution', () => {
    const a = {
      ...article('a', ['p']),
      problem: '{{figure:only-in-problem}}',
      solution: 'no markers here.',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(orphanFigureMarkers.run(c)).toHaveLength(1)
  })

  it('deduplicates: same orphan slug referenced twice reports once', () => {
    const a = {
      ...article('a', ['p']),
      problem: '{{figure:dup}}',
      solution: '{{figure:dup}}',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(orphanFigureMarkers.run(c)).toHaveLength(1)
  })

  it('reports two separate orphans for two distinct missing slugs', () => {
    const a = {
      ...article('a', ['p']),
      problem: '{{figure:one}}',
      solution: '{{figure:two}}',
    }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
    })
    expect(orphanFigureMarkers.run(c)).toHaveLength(2)
  })
})
