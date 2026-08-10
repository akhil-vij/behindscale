import { describe, it, expect } from 'vitest'
import { checkFigure, isArticle, isFigure } from '../predicates'

const validFigure = {
  slug: 'where-hodor-runs',
  eyebrow: 'WHERE HODOR RUNS',
  caption:
    'Every service carries its own copy of Hodor. The detectors and the shedder run inside the process they protect, so there is no monitor watching from outside.',
  ariaLabel: 'Hodor runs inside each service',
}

const validArticle = {
  slug: 'test-article',
  title: 'Test Article',
  url: 'https://example.com/test',
  publishedAt: '2026-01-01',
  addedAt: '2026-01-02',
  source: {
    name: 'Test Engineering',
    slug: 'test-engineering',
    company: 'Test',
    url: 'https://example.com',
    feed: 'https://example.com/feed',
  },
  summary: 'summary',
  crux: 'crux',
  cruxTag: 'test-crux',
  cruxSummary: 'a short crux summary',
  problem: 'problem',
  solution: 'solution',
  tradeoffs: ['a', 'b'],
  tags: ['x'],
  patterns: [{ slug: 'p', note: 'n' }],
  artifact: null,
}

describe('Figure', () => {
  it('accepts a fully-populated valid figure', () => {
    expect(isFigure(validFigure)).toBe(true)
  })

  it('rejects a figure missing slug', () => {
    const bad: Record<string, unknown> = { ...validFigure }
    delete bad.slug
    expect(isFigure(bad)).toBe(false)
  })

  it('rejects a non-kebab-case slug', () => {
    expect(isFigure({ ...validFigure, slug: 'Where_Hodor_Runs' })).toBe(false)
    expect(isFigure({ ...validFigure, slug: 'Where Hodor Runs' })).toBe(false)
    expect(isFigure({ ...validFigure, slug: 'where-Hodor-runs' })).toBe(false)
  })

  it('rejects an empty slug', () => {
    expect(isFigure({ ...validFigure, slug: '' })).toBe(false)
    expect(isFigure({ ...validFigure, slug: '   ' })).toBe(false)
  })

  it('rejects a figure with an empty eyebrow', () => {
    expect(isFigure({ ...validFigure, eyebrow: '' })).toBe(false)
    expect(isFigure({ ...validFigure, eyebrow: '   ' })).toBe(false)
  })

  it('rejects a figure with an empty caption', () => {
    expect(isFigure({ ...validFigure, caption: '' })).toBe(false)
  })

  it('rejects a figure with an empty ariaLabel', () => {
    expect(isFigure({ ...validFigure, ariaLabel: '' })).toBe(false)
  })

  it('rejects wrong-type fields', () => {
    expect(isFigure({ ...validFigure, eyebrow: 42 })).toBe(false)
    expect(isFigure({ ...validFigure, caption: null })).toBe(false)
    expect(isFigure({ ...validFigure, ariaLabel: [] })).toBe(false)
  })

  it('rejects null, undefined, and non-objects', () => {
    expect(isFigure(null)).toBe(false)
    expect(isFigure(undefined)).toBe(false)
    expect(isFigure('not an object')).toBe(false)
    expect(isFigure([])).toBe(false)
  })

  it('returns a descriptive reason for schema failures', () => {
    const result = checkFigure({ ...validFigure, slug: 'Bad Slug' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/kebab-case/)
  })
})

describe('Article.figures', () => {
  it('accepts an article with no figures field (optional)', () => {
    expect(isArticle(validArticle)).toBe(true)
  })

  it('accepts an article with an empty figures array', () => {
    expect(isArticle({ ...validArticle, figures: [] })).toBe(true)
  })

  it('accepts an article with one figure', () => {
    expect(isArticle({ ...validArticle, figures: [validFigure] })).toBe(true)
  })

  it('accepts an article with multiple figures', () => {
    expect(
      isArticle({
        ...validArticle,
        figures: [
          validFigure,
          { ...validFigure, slug: 'three-detectors' },
        ],
      }),
    ).toBe(true)
  })

  it('rejects an article whose figures field is not an array', () => {
    expect(isArticle({ ...validArticle, figures: 'nope' })).toBe(false)
    expect(isArticle({ ...validArticle, figures: {} })).toBe(false)
  })

  it('rejects an article whose figures contain a malformed entry', () => {
    expect(
      isArticle({ ...validArticle, figures: [{ ...validFigure, slug: '' }] }),
    ).toBe(false)
  })

  it('rejects an article with duplicate figure slugs', () => {
    expect(
      isArticle({ ...validArticle, figures: [validFigure, validFigure] }),
    ).toBe(false)
  })
})
