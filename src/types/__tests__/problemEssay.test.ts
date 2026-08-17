import { describe, it, expect } from 'vitest'
import { isProblemEssay } from '../predicates'

describe('ProblemEssay schema predicate', () => {
  it('accepts a bare cruxTag-only record (the first authoring pass)', () => {
    expect(isProblemEssay({ cruxTag: 'buffer-degrades-under-backlog' })).toBe(true)
  })

  it('accepts the live authored header fields', () => {
    expect(
      isProblemEssay({
        cruxTag: 'ambiguous-failure-under-retry',
        headline: 'Your payment API timed out. Did the charge go through?',
        lede: 'The queue you added to protect your system takes it down.',
        intro: ['The request went out.', 'The timer expired.'],
        edition: 1,
        firstSentAt: '2026-01-01',
        extraSections: [{ title: 'Timeline', blocks: [] }],
      }),
    ).toBe(true)
  })

  it('rejects a missing or non-kebab cruxTag', () => {
    expect(isProblemEssay({})).toBe(false)
    expect(isProblemEssay({ cruxTag: 'Not_Kebab' })).toBe(false)
  })

  it('rejects empty-string headline/lede and non-string intro entries', () => {
    expect(isProblemEssay({ cruxTag: 'x', headline: '' })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', lede: '   ' })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', intro: ['ok', 3] })).toBe(false)
  })

  it('rejects a non-positive or non-integer edition', () => {
    expect(isProblemEssay({ cruxTag: 'x', edition: 0 })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', edition: 1.5 })).toBe(false)
  })

  it('rejects extraSections with an empty title or non-array blocks', () => {
    expect(
      isProblemEssay({ cruxTag: 'x', extraSections: [{ title: '', blocks: [] }] }),
    ).toBe(false)
    expect(
      isProblemEssay({ cruxTag: 'x', extraSections: [{ title: 'T', blocks: 'no' }] }),
    ).toBe(false)
  })
})
