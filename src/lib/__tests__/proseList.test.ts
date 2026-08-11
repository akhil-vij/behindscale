import { describe, it, expect } from 'vitest'
import { parseList, stripListMarkers, analyzeChunk } from '../proseList'

describe('parseList', () => {
  it('parses a well-formed unordered list, stripping markers', () => {
    expect(parseList('- first\n- second\n- third')).toEqual({
      ordered: false,
      items: ['first', 'second', 'third'],
    })
  })

  it('parses a well-formed ordered list, stripping the numbers', () => {
    expect(parseList('1. alpha\n2. beta\n3. gamma')).toEqual({
      ordered: true,
      items: ['alpha', 'beta', 'gamma'],
    })
  })

  it('ordered display is native: any integers render, text is what is kept', () => {
    expect(parseList('1. a\n1. b')).toEqual({ ordered: true, items: ['a', 'b'] })
  })

  it('returns null for a single-item list (min two items)', () => {
    expect(parseList('- lonely')).toBeNull()
  })

  it('returns null for a plain paragraph', () => {
    expect(parseList('Just a sentence - with a dash inside it.')).toBeNull()
  })

  it('returns null for a mixed chunk (prose + list line)', () => {
    expect(parseList('Lead-in line\n- item one\n- item two')).toBeNull()
  })

  it('returns null for mixed markers', () => {
    expect(parseList('- one\n2. two')).toBeNull()
  })

  it('returns null for an indented item (no nesting support)', () => {
    expect(parseList('- top\n  - nested\n- back')).toBeNull()
  })

  it('returns null for unsupported markers (* + and N))', () => {
    expect(parseList('* one\n* two')).toBeNull()
    expect(parseList('1) one\n2) two')).toBeNull()
  })
})

describe('stripListMarkers', () => {
  it('removes leading "- " and "N. " but keeps item text and non-list lines', () => {
    const input = 'Lead-in.\n\n- first\n- second\n\n1. a\n2. b\n\nTrailing prose.'
    expect(stripListMarkers(input)).toBe(
      'Lead-in.\n\nfirst\nsecond\n\na\nb\n\nTrailing prose.',
    )
  })

  it('leaves dashes that are not list markers alone', () => {
    expect(stripListMarkers('a well-known trade-off here')).toBe(
      'a well-known trade-off here',
    )
  })
})

describe('analyzeChunk', () => {
  it('classifies a valid unordered list', () => {
    expect(analyzeChunk('- a\n- b')).toEqual({ kind: 'valid', ordered: false })
  })

  it('classifies a valid ordered list', () => {
    expect(analyzeChunk('1. a\n2. b')).toEqual({ kind: 'valid', ordered: true })
  })

  it('classifies a plain paragraph as not-list', () => {
    expect(analyzeChunk('just prose here')).toEqual({ kind: 'not-list' })
  })

  it('classifies a single-item list', () => {
    expect(analyzeChunk('- lonely')).toEqual({ kind: 'single', ordered: false })
  })

  it('classifies malformed shapes with a reason', () => {
    expect(analyzeChunk('lead-in\n- a\n- b').kind).toBe('malformed')
    expect(analyzeChunk('- a\n2. b').kind).toBe('malformed')
    expect(analyzeChunk('- a\n  - nested').kind).toBe('malformed')
    expect(analyzeChunk('* a\n* b').kind).toBe('malformed')
  })
})
