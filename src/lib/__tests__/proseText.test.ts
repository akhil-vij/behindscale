import { describe, it, expect } from 'vitest'
import {
  proseText,
  proseRaw,
  extractFigureMarkers,
  FIGURE_MARKER_EXACT,
} from '../proseText'

describe('proseText', () => {
  it('returns unchanged prose when there are no markers', () => {
    const input = 'First paragraph.\n\nSecond paragraph.'
    expect(proseText(input)).toBe(input)
  })

  it('strips a single figure marker and collapses the paragraph gap', () => {
    const input =
      'First paragraph.\n\n{{figure:where-hodor-runs}}\n\nSecond paragraph.'
    expect(proseText(input)).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('strips multiple markers and preserves paragraph breaks', () => {
    const input =
      'First.\n\n{{figure:a}}\n\nSecond.\n\n{{figure:b-c}}\n\nThird.'
    expect(proseText(input)).toBe('First.\n\nSecond.\n\nThird.')
  })

  it('does not miscount characters -- the marker length is fully removed', () => {
    const withMarker =
      'Solution paragraph.\n\n{{figure:where-hodor-runs}}\n\nMore prose.'
    const withoutMarker = 'Solution paragraph.\n\nMore prose.'
    expect(proseText(withMarker).length).toBe(withoutMarker.length)
  })

  it('trims leading/trailing whitespace left by a marker at either end', () => {
    expect(proseText('{{figure:a}}\n\nBody.')).toBe('Body.')
    expect(proseText('Body.\n\n{{figure:a}}')).toBe('Body.')
  })

  it('ignores marker-like text that is not the exact syntax', () => {
    // Not a marker: single braces, or wrong prefix
    expect(proseText('See {figure:x} in the appendix.')).toBe(
      'See {figure:x} in the appendix.',
    )
    expect(proseText('See {{note:x}} for context.')).toBe(
      'See {{note:x}} for context.',
    )
  })

  it('rejects non-kebab-case slugs (does not strip them)', () => {
    expect(proseText('Body.\n\n{{figure:Bad_Slug}}\n\nMore.')).toBe(
      'Body.\n\n{{figure:Bad_Slug}}\n\nMore.',
    )
  })

  it('strips list markers, keeping item text, so counts see only prose', () => {
    const input = 'Lead-in:\n\n- first item\n- second item\n\nAfter.'
    expect(proseText(input)).toBe('Lead-in:\n\nfirst item\nsecond item\n\nAfter.')
  })

  it('unwraps an inline link to its visible label (no link chrome leaks)', () => {
    expect(
      proseText('Running [workflows](/patterns/durable-workflows), retrying.'),
    ).toBe('Running workflows, retrying.')
  })

  it('unwraps multiple inline links in one field', () => {
    expect(
      proseText('See [A](/patterns/a) and [B](/patterns/b) both.'),
    ).toBe('See A and B both.')
  })

  it('leaves external-looking or non-internal bracket text untouched', () => {
    // Only internal `/`-prefixed targets are link syntax (mirrors the
    // renderer). A markdown-ish external URL is not unwrapped here.
    expect(proseText('See [docs](https://example.com) online.')).toBe(
      'See [docs](https://example.com) online.',
    )
    // Bare bracketed text with no URL is left alone.
    expect(proseText('An [aside] with no link.')).toBe('An [aside] with no link.')
  })

  it('does not miscount characters -- the link chrome is fully removed', () => {
    const withLink = 'Uses the [checkpoint](/patterns/atomic-phases) idea.'
    const withoutLink = 'Uses the checkpoint idea.'
    expect(proseText(withLink).length).toBe(withoutLink.length)
  })
})

describe('proseRaw', () => {
  it('returns the field verbatim', () => {
    const input =
      'First.\n\n{{figure:x}}\n\nSecond.\n\n{{figure:y}}\n\nThird.'
    expect(proseRaw(input)).toBe(input)
  })
})

describe('extractFigureMarkers', () => {
  it('returns an empty array when no markers are present', () => {
    expect(extractFigureMarkers('No markers here.')).toEqual([])
  })

  it('returns the slugs in appearance order, not deduplicated', () => {
    const input =
      'First.\n\n{{figure:a}}\n\nSecond.\n\n{{figure:b}}\n\nThird.\n\n{{figure:a}}\n\nEnd.'
    expect(extractFigureMarkers(input)).toEqual(['a', 'b', 'a'])
  })

  it('extracts kebab-case slugs correctly', () => {
    expect(
      extractFigureMarkers('{{figure:where-hodor-runs}}'),
    ).toEqual(['where-hodor-runs'])
  })
})

describe('FIGURE_MARKER_EXACT', () => {
  it('matches a bare marker string and captures the slug', () => {
    const m = '{{figure:where-hodor-runs}}'.match(FIGURE_MARKER_EXACT)
    expect(m).not.toBeNull()
    expect(m?.[1]).toBe('where-hodor-runs')
  })

  it('rejects an unbalanced or embedded marker', () => {
    expect('prefix {{figure:x}}'.match(FIGURE_MARKER_EXACT)).toBeNull()
    expect('{{figure:x}} suffix'.match(FIGURE_MARKER_EXACT)).toBeNull()
    expect('{{figure:x}}\n'.match(FIGURE_MARKER_EXACT)).toBeNull()
  })
})
