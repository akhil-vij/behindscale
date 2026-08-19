// Figures on pattern definitions (the figure-host extension). Proves
// each figure validator now covers patterns as well as articles, via
// the shared figureHosts() abstraction. See scripts/content-hosts.ts.

import { describe, it, expect } from 'vitest'
import { article, figure, makeContent, pattern } from './fixtures'
import type { PatternDefinition } from '../../../src/types'
import { figureSvgExists } from '../figure-svg-exists'
import { figureSvgSafe } from '../figure-svg-safe'
import { figureFieldsNonempty } from '../figure-fields-nonempty'
import { orphanFigureMarkers } from '../orphan-figure-markers'
import { unusedFigureDefs } from '../unused-figure-defs'
import { markerPlacementLegal } from '../marker-placement-legal'
import { figureCountCeiling } from '../figure-count-ceiling'

// A pattern with a single figure placed by a marker in `definition`.
function patternWithFigure(
  slug: string,
  overrides: Partial<PatternDefinition> = {},
): PatternDefinition {
  return {
    ...pattern(slug),
    definition: 'Lead-in paragraph.\n\n{{figure:diagram}}\n\nTrailing paragraph.',
    figures: [figure('diagram')],
    ...overrides,
  }
}

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
}

describe('figures on patterns — figure-svg-exists', () => {
  it('errors when a pattern figure has no SVG file', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [patternWithFigure('pat')],
      // no figureSvgs entry -> missing file
    })
    const errs = figureSvgExists.run(content)
    expect(errs).toHaveLength(1)
    expect(errs[0]?.patternSlug).toBe('pat')
    expect(errs[0]?.message).toContain('content/figures/pat/diagram.svg')
  })

  it('passes when the pattern figure SVG is present', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [patternWithFigure('pat')],
      figureSvgs: new Map([
        ['pat/diagram', { path: 'content/figures/pat/diagram.svg', contents: svg('<rect />') }],
      ]),
    })
    expect(figureSvgExists.run(content)).toEqual([])
  })

  it('flags an article/pattern figure-dir slug collision', () => {
    const content = makeContent({
      articles: [{ ...article('dup', ['p1']), figures: [figure('x')] }],
      patterns: [
        { ...pattern('p1') },
        {
          ...pattern('dup'),
          definition: 'x\n\n{{figure:x}}\n\ny',
          figures: [figure('x')],
        },
      ],
      figureSvgs: new Map([
        ['dup/x', { path: 'content/figures/dup/x.svg', contents: svg('<rect />') }],
      ]),
    })
    const collision = figureSvgExists
      .run(content)
      .filter((e) => e.message.includes('used by both an article and a pattern'))
    expect(collision).toHaveLength(1)
  })
})

describe('figures on patterns — figure-svg-safe', () => {
  it('rejects an unsafe pattern figure SVG (<script>)', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [patternWithFigure('pat')],
      figureSvgs: new Map([
        ['pat/diagram', { path: 'content/figures/pat/diagram.svg', contents: svg('<script>alert(1)</script>') }],
      ]),
    })
    const errs = figureSvgSafe.run(content)
    expect(errs.length).toBeGreaterThan(0)
    expect(errs[0]?.patternSlug).toBe('pat')
    expect(errs[0]?.message).toContain('<script>')
  })
})

describe('figures on patterns — figure-fields-nonempty', () => {
  it('enforces the caption word band on pattern figures', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [
        patternWithFigure('pat', {
          figures: [figure('diagram', { caption: 'too short' })], // < 12 words
        }),
      ],
    })
    const errs = figureFieldsNonempty.run(content)
    expect(errs.some((e) => e.patternSlug === 'pat' && e.message.includes('caption'))).toBe(true)
  })
})

describe('figures on patterns — marker checks', () => {
  it('orphan: a marker in definition with no figures[] entry errors', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [
        { ...pattern('pat'), definition: 'x\n\n{{figure:ghost}}\n\ny' }, // no figures[]
      ],
    })
    const errs = orphanFigureMarkers.run(content)
    expect(errs.some((e) => e.patternSlug === 'pat' && e.message.includes('ghost'))).toBe(true)
  })

  it('unused: a declared pattern figure with no marker errors', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [
        { ...pattern('pat'), definition: 'no markers here', figures: [figure('diagram')] },
      ],
    })
    const errs = unusedFigureDefs.run(content)
    expect(errs.some((e) => e.patternSlug === 'pat' && e.message.includes('diagram'))).toBe(true)
  })

  it('placement: a marker in whenItApplies (forbidden field) errors', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [
        {
          ...pattern('pat'),
          definition: 'x\n\n{{figure:diagram}}\n\ny',
          whenItApplies: ['{{figure:diagram}}'],
          figures: [figure('diagram')],
        },
      ],
    })
    const errs = markerPlacementLegal.run(content)
    expect(errs.some((e) => e.patternSlug === 'pat' && e.message.includes('whenItApplies'))).toBe(true)
  })

  it('placement: a well-formed marker in definition passes', () => {
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [patternWithFigure('pat')],
    })
    expect(markerPlacementLegal.run(content)).toEqual([])
  })
})

describe('figures on patterns — figure-count-ceiling', () => {
  it('hard-errors a pattern with 6 figures, worded for patterns', () => {
    const figs = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => figure(s))
    const markers = figs.map((f) => `{{figure:${f.slug}}}`).join('\n\n')
    const content = makeContent({
      articles: [article('a', ['pat'])],
      patterns: [{ ...pattern('pat'), definition: markers, figures: figs }],
    })
    const errs = figureCountCeiling.run(content)
    const hard = errs.filter((e) => e.patternSlug === 'pat' && e.severity === undefined)
    expect(hard).toHaveLength(1)
    expect(hard[0]?.message).toContain('pattern declares 6 figures')
  })
})
