import { describe, it, expect } from 'vitest'
import { markerPlacementLegal } from '../marker-placement-legal'
import { article, figure, makeContent, pattern } from './fixtures'

function contentWith(overrides: Partial<{
  problem: string
  solution: string
  summary: string
  crux: string
  cruxSummary: string
  tradeoffs: string[]
  patterns: Array<{ slug: string; note: string }>
  figures: ReturnType<typeof figure>[]
}>) {
  const a = {
    ...article('a', ['p']),
    ...overrides,
  }
  return makeContent({
    articles: [a],
    patterns: [pattern('p')],
  })
}

describe('marker-placement-legal', () => {
  it('passes when a marker sits alone in its paragraph', () => {
    const c = contentWith({
      solution: 'First paragraph.\n\n{{figure:f}}\n\nSecond paragraph.',
      figures: [figure('f')],
    })
    expect(markerPlacementLegal.run(c)).toEqual([])
  })

  it('errors when a marker is embedded inside a paragraph', () => {
    const c = contentWith({
      solution: 'First paragraph before {{figure:f}} the marker.',
      figures: [figure('f')],
    })
    const errors = markerPlacementLegal.run(c)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]?.message).toContain('embedded')
  })

  it('errors when two markers share a paragraph', () => {
    const c = contentWith({
      solution: '{{figure:a}} {{figure:b}}',
      figures: [figure('a'), figure('b')],
    })
    const errors = markerPlacementLegal.run(c)
    expect(errors[0]?.message).toContain('multiple markers share a paragraph')
  })

  it('errors when a marker slug is not kebab-case', () => {
    const c = contentWith({
      solution: 'body.\n\n{{figure:Bad_Slug}}\n\nmore.',
    })
    const errors = markerPlacementLegal.run(c)
    expect(errors.some((e) => e.message.includes('not kebab-case'))).toBe(true)
  })

  it('errors when a marker appears in summary', () => {
    const c = contentWith({
      summary: 'summary with {{figure:x}} inline.',
    })
    expect(markerPlacementLegal.run(c)[0]?.message).toContain('summary')
  })

  it('errors when a marker appears in crux, cruxSummary, tradeoffs, or pattern note', () => {
    // crux
    expect(
      markerPlacementLegal.run(contentWith({ crux: '{{figure:x}}' })).length,
    ).toBeGreaterThan(0)
    // cruxSummary
    expect(
      markerPlacementLegal
        .run(contentWith({ cruxSummary: '{{figure:x}} summary' }))
        .some((e) => e.message.includes('cruxSummary')),
    ).toBe(true)
    // tradeoffs
    expect(
      markerPlacementLegal
        .run(contentWith({ tradeoffs: ['a', '{{figure:x}} inside a tradeoff'] }))
        .some((e) => e.message.includes('tradeoffs')),
    ).toBe(true)
    // pattern note
    expect(
      markerPlacementLegal
        .run(
          contentWith({
            patterns: [{ slug: 'p', note: '{{figure:x}} in a chip note' }],
          }),
        )
        .some((e) => e.message.includes('patterns')),
    ).toBe(true)
  })

  it('errors when the same marker slug appears twice across problem + solution', () => {
    const c = contentWith({
      problem: 'p.\n\n{{figure:dup}}\n\nend.',
      solution: 's.\n\n{{figure:dup}}\n\nend.',
      figures: [figure('dup')],
    })
    const errors = markerPlacementLegal.run(c)
    expect(errors.some((e) => e.message.includes('appears 2 times'))).toBe(true)
  })
})
