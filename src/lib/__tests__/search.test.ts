import { describe, it, expect } from 'vitest'
import { tokenize, matchTerms, type Term } from '../search'

describe('tokenize', () => {
  it('lowercases and folds every run of non-alphanumerics', () => {
    expect(tokenize('Exactly-Once!')).toEqual(['exactly', 'once'])
    expect(tokenize('  rate  limiting ')).toEqual(['rate', 'limiting'])
    expect(tokenize('at-least-once')).toEqual(['at', 'least', 'once'])
    expect(tokenize('')).toEqual([])
    expect(tokenize('---')).toEqual([])
  })
})

describe('matchTerms', () => {
  const doc: Term[] = [
    { kind: 'title', value: 'Durable Front Buffer', weight: 10 },
    { kind: 'alias', value: 'backlog', weight: 6 },
    { kind: 'definition', value: 'A log absorbs the backlog on disk', weight: 1, long: true },
    { kind: 'company', value: 'Stripe', weight: 3 },
  ]

  it('an empty query is a zero-score match with no reason', () => {
    expect(matchTerms('', doc)).toEqual({ score: 0, matched: null })
  })

  it('is case-insensitive', () => {
    expect(matchTerms('DURABLE', doc)).not.toBeNull()
    expect(matchTerms('stripe', doc)).not.toBeNull()
  })

  it('prefix-matches on tokens', () => {
    expect(matchTerms('dura', doc)).not.toBeNull() // durable
    expect(matchTerms('buf', doc)).not.toBeNull() // buffer
  })

  it('requires EVERY query token to hit (AND across tokens)', () => {
    expect(matchTerms('durable buffer', doc)).not.toBeNull()
    expect(matchTerms('durable zebra', doc)).toBeNull()
  })

  it('emits no matched: reason when the title carries the whole query', () => {
    expect(matchTerms('durable front', doc)?.matched).toBeNull()
  })

  it('reports a short non-title field verbatim', () => {
    expect(matchTerms('backlog', doc)?.matched).toEqual({
      kind: 'alias',
      value: 'backlog',
    })
  })

  it('reports the query token (not the whole blob) for a long field', () => {
    // "disk" appears only inside the long definition string.
    expect(matchTerms('disk', doc)?.matched).toEqual({
      kind: 'definition',
      value: 'disk',
    })
  })

  it('picks the highest-weight non-title hit as the reason', () => {
    // "backlog" hits both alias (6) and the long definition (1) -> alias wins.
    expect(matchTerms('backlog', doc)?.matched?.kind).toBe('alias')
  })
})
