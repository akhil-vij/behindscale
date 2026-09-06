import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isProblemEssay } from '../predicates'

// The authored ambiguous-timeouts essay (the v7.3 port) is the richest real
// positive sample: every rich block present.
const authored = JSON.parse(
  readFileSync(join('content', 'problems', 'ambiguous-failure-under-retry.json'), 'utf8'),
) as Record<string, unknown>

function withComparison(patch: (c: Record<string, unknown>) => void) {
  const c = JSON.parse(JSON.stringify(authored.comparison)) as Record<string, unknown>
  patch(c)
  return { cruxTag: 'x', comparison: c }
}

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

  it('accepts the authored ambiguous-timeouts essay (every rich block)', () => {
    expect(isProblemEssay(authored)).toBe(true)
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

  it('stations: rejects duplicate ids, bad minutes, and estimate without minutes', () => {
    const station = { id: 'a', anchor: 'cards', label: 'A', minutes: 3 }
    expect(isProblemEssay({ cruxTag: 'x', stations: [station] })).toBe(true)
    expect(isProblemEssay({ cruxTag: 'x', stations: [station, { ...station }] })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', stations: [{ ...station, minutes: -1 }] })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', stations: [{ ...station, minutes: '3' }] })).toBe(false)
    expect(
      isProblemEssay({ cruxTag: 'x', stations: [{ ...station, minutes: null, estimate: true }] }),
    ).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', stations: [] })).toBe(false)
  })

  it('wall: requires non-empty prose and well-formed stats', () => {
    expect(isProblemEssay({ cruxTag: 'x', wall: { prose: [] } })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', wall: { prose: ['p'] } })).toBe(true)
    expect(
      isProblemEssay({ cruxTag: 'x', wall: { prose: ['p'], stats: [{ value: '1', label: 'l' }] } }),
    ).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', wall: { prose: ['p'], figureSlug: 'Bad Slug' } })).toBe(false)
  })

  it('tryIt / mission: require kebab artifact slugs and the copy fields', () => {
    expect(
      isProblemEssay({ cruxTag: 'x', tryIt: { artifactSlug: 'a-b', teaser: 't', caption: 'c' } }),
    ).toBe(true)
    expect(isProblemEssay({ cruxTag: 'x', tryIt: { artifactSlug: 'A B', teaser: 't', caption: 'c' } })).toBe(false)
    expect(
      isProblemEssay({
        cruxTag: 'x',
        mission: { artifactSlug: 'a-b', teaser: 't', title: 'T', intro: 'i' },
      }),
    ).toBe(true)
    expect(isProblemEssay({ cruxTag: 'x', mission: { artifactSlug: 'a-b', teaser: 't' } })).toBe(false)
  })

  it('comparison: cells must match the column count', () => {
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.matrixRows as Array<{ cells: unknown[] }>)[0]!.cells.push('extra')
        }),
      ),
    ).toBe(false)
  })

  it('comparison: a matrix qref must name a question', () => {
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.matrixRows as Array<{ qref?: string }>)[1]!.qref = 'q99'
        }),
      ),
    ).toBe(false)
  })

  it('comparison: rejects duplicate row / question ids and unknown legend kinds', () => {
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.matrixRows as Array<{ id: string }>)[1]!.id = 'who'
        }),
      ),
    ).toBe(false)
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.questions as Array<{ id: string }>)[1]!.id = 'q1'
        }),
      ),
    ).toBe(false)
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.legend as Array<{ kind: string }>)[0]!.kind = 'other'
        }),
      ),
    ).toBe(false)
  })

  it('comparison: a "not stated" cell is { ns } and nothing else', () => {
    expect(
      isProblemEssay(
        withComparison((c) => {
          ;(c.matrixRows as Array<{ cells: unknown[] }>)[1]!.cells[3] = { notStated: true }
        }),
      ),
    ).toBe(false)
  })

  it('interview / steal / decide / cards / sources shape rules', () => {
    expect(isProblemEssay({ cruxTag: 'x', interview: { asks: [] } })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', steal: { intro: 'i', items: [] } })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', decide: { intro: 'i', rows: [{ if: 'a' }] } })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', cards: { intro: 'i', teasers: { a: '' } } })).toBe(false)
    expect(isProblemEssay({ cruxTag: 'x', sources: { intro: 'i', items: [{ label: 'L' }] } })).toBe(false)
    expect(
      isProblemEssay({ cruxTag: 'x', patterns: { intro: 'i', order: ['a', 'a'] } }),
    ).toBe(false)
  })
})
