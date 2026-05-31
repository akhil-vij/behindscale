import { describe, it, expect } from 'vitest'
import { isPatternReference, isPatternDefinition } from '../predicates'

const validReference = {
  slug: 'atomic-phases',
  note: 'Stripe applies atomic phases by structuring payment retries around stage-by-stage idempotent commits.',
}

const validDefinition = {
  slug: 'atomic-phases',
  name: 'Atomic Phases',
  definition:
    'Break a long workflow into discrete, individually committable phases so that any interruption resumes from the last committed boundary without redoing or skipping work.',
  whenItApplies: [
    'Long-running workflows that must survive partial failure.',
    'Operations that must be safe to retry from any midpoint.',
  ],
  tradeoffs: [
    'Requires durable storage at each phase boundary.',
    'Adds latency vs. a single in-memory transaction.',
  ],
  category: 'resilience',
}

describe('PatternReference', () => {
  it('accepts a valid reference', () => {
    expect(isPatternReference(validReference)).toBe(true)
  })

  it('rejects when slug is missing', () => {
    expect(isPatternReference({ note: validReference.note })).toBe(false)
  })

  it('rejects when note is not a string', () => {
    expect(isPatternReference({ ...validReference, note: 12 })).toBe(false)
  })
})

describe('PatternDefinition', () => {
  it('accepts a valid definition with a category', () => {
    expect(isPatternDefinition(validDefinition)).toBe(true)
  })

  it('accepts a valid definition without a category (optional field)', () => {
    const { category: _omit, ...withoutCategory } = validDefinition
    void _omit
    expect(isPatternDefinition(withoutCategory)).toBe(true)
  })

  it('rejects when whenItApplies is missing', () => {
    const malformed: Record<string, unknown> = { ...validDefinition }
    delete malformed.whenItApplies
    expect(isPatternDefinition(malformed)).toBe(false)
  })

  it('rejects when tradeoffs is not an array of strings', () => {
    expect(isPatternDefinition({ ...validDefinition, tradeoffs: [1, 2, 3] })).toBe(false)
    expect(isPatternDefinition({ ...validDefinition, tradeoffs: 'oops' })).toBe(false)
  })

  it('rejects when category is the wrong type', () => {
    expect(isPatternDefinition({ ...validDefinition, category: 42 })).toBe(false)
  })
})
