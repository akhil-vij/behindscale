import { describe, it, expect } from 'vitest'
import { isPatternLibrary, isPatternLibraryEntry } from './validators'

const validSource = {
  name: 'Stripe Engineering',
  slug: 'stripe-engineering',
  company: 'Stripe',
  url: 'https://stripe.com/blog/engineering',
  feed: 'https://stripe.com/blog/engineering.rss',
}

const validDefinition = {
  slug: 'atomic-phases',
  name: 'Atomic Phases',
  definition: 'Break long workflows into committable phases that survive partial failure.',
  whenItApplies: ['Long workflows that must survive interruption.'],
  tradeoffs: ['Requires durable storage at each phase boundary.'],
  category: 'resilience',
}

const validEntry = {
  definition: validDefinition,
  frequency: 1,
  articles: [
    {
      slug: 'designing-robust-and-predictable-apis-with-idempotency',
      title: 'Designing robust and predictable APIs with idempotency',
      source: validSource,
      note: 'Each network/DB step is its own commit point.',
    },
  ],
  companies: ['Stripe'],
}

const validLibrary = {
  generatedAt: '2026-05-29T12:00:00.000Z',
  entries: [validEntry],
}

describe('PatternLibraryEntry', () => {
  it('accepts a valid entry', () => {
    expect(isPatternLibraryEntry(validEntry)).toBe(true)
  })

  it('rejects when frequency is the wrong type', () => {
    expect(isPatternLibraryEntry({ ...validEntry, frequency: '1' })).toBe(false)
  })

  it('rejects when an article ref is malformed (source missing)', () => {
    expect(
      isPatternLibraryEntry({
        ...validEntry,
        articles: [{ slug: 'x', title: 'X', note: 'n' }],
      }),
    ).toBe(false)
  })

  it('rejects when companies is not an array of strings', () => {
    expect(isPatternLibraryEntry({ ...validEntry, companies: [1] })).toBe(false)
  })
})

describe('PatternLibrary', () => {
  it('accepts a valid library', () => {
    expect(isPatternLibrary(validLibrary)).toBe(true)
  })

  it('accepts an empty library (no entries yet)', () => {
    expect(isPatternLibrary({ generatedAt: '2026-05-29T12:00:00.000Z', entries: [] })).toBe(true)
  })

  it('rejects when generatedAt is missing', () => {
    expect(isPatternLibrary({ entries: [validEntry] })).toBe(false)
  })

  it('rejects when any entry is malformed', () => {
    expect(
      isPatternLibrary({
        generatedAt: '2026-05-29T12:00:00.000Z',
        entries: [{ ...validEntry, frequency: '1' }],
      }),
    ).toBe(false)
  })
})
