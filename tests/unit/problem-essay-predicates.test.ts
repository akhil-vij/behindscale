import { describe, it, expect } from 'vitest'
import { checkProblemEssay } from '../../src/types/predicates'

// The load-time shape rules for the 2026-09-06 orientation fields:
// `howItWorks`, `tryIt.noscript`, `mission.decisionsSummary` + `outline`
// (+ the {{decisions}} marker), `decide.rows[].highlights`.

const mission = {
  artifactSlug: 'problem-x-mission',
  teaser: 'Build it.',
  title: 'Build the defense',
  intro: 'Take the seat. {{decisions}} Run it naive first.',
  decisionsSummary: 'who names the operation, and how long the memory lasts',
  outline: {
    decisions: [
      { label: 'Identity', options: ['nobody', 'the caller'] },
      { label: 'Window', options: ['one minute', 'forever'] },
    ],
    events: ['Routine traffic', 'a late retry'],
    attacks: [{ company: 'Stripe', year: '2017', text: 'a reused key' }],
  },
}

function essay(patch: Record<string, unknown> = {}) {
  return { cruxTag: 'some-wall', ...patch }
}

describe('checkProblemEssay: orientation fields', () => {
  it('accepts the full shape', () => {
    expect(
      checkProblemEssay(
        essay({
          howItWorks: ['Cause it', 'Build it'],
          tryIt: { artifactSlug: 'problem-x-tryit', teaser: 'Cut it.', caption: 'Cap.', noscript: 'Without JavaScript: cut it.' },
          mission,
          decide: { intro: 'Find yours.', rows: [{ if: 'A', then: 'B', highlights: ['Stripe', 'AWS'] }] },
        }),
      ),
    ).toEqual({ ok: true })
  })

  it('rejects an empty or non-string howItWorks', () => {
    expect(checkProblemEssay(essay({ howItWorks: [] })).ok).toBe(false)
    expect(checkProblemEssay(essay({ howItWorks: ['Cause it', ''] })).ok).toBe(false)
    expect(checkProblemEssay(essay({ howItWorks: 'Cause it' })).ok).toBe(false)
  })

  it('requires the outline and exactly one {{decisions}} marker with a decisionsSummary', () => {
    const noOutline = { ...mission, outline: undefined }
    const r1 = checkProblemEssay(essay({ mission: noOutline }))
    expect(r1.ok).toBe(false)
    expect((r1 as { reason: string }).reason).toMatch(/outline/)

    const noMarker = { ...mission, intro: 'Take the seat. Run it naive first.' }
    const r2 = checkProblemEssay(essay({ mission: noMarker }))
    expect(r2.ok).toBe(false)
    expect((r2 as { reason: string }).reason).toMatch(/\{\{decisions\}\}/)

    const twoMarkers = { ...mission, intro: '{{decisions}} and {{decisions}}' }
    expect(checkProblemEssay(essay({ mission: twoMarkers })).ok).toBe(false)
  })

  it('rejects a stray {{decisions}} marker with no decisionsSummary', () => {
    const stray = { ...mission, decisionsSummary: undefined, outline: undefined }
    const r = checkProblemEssay(essay({ mission: stray }))
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/decisionsSummary/)
  })

  it('accepts a mission with neither summary nor marker (a wall not yet outlined)', () => {
    const plain = { artifactSlug: 'problem-x-mission', teaser: 'Build it.', title: 'Build', intro: 'Take the seat.' }
    expect(checkProblemEssay(essay({ mission: plain }))).toEqual({ ok: true })
  })

  it('validates the outline shape', () => {
    const bad = (outline: unknown) => checkProblemEssay(essay({ mission: { ...mission, outline } })).ok
    expect(bad({ ...mission.outline, decisions: [] })).toBe(false)
    expect(bad({ ...mission.outline, decisions: [{ label: 'Identity', options: [] }] })).toBe(false)
    expect(bad({ ...mission.outline, events: [] })).toBe(false)
    expect(bad({ ...mission.outline, attacks: [{ company: 'Stripe', year: '2017' }] })).toBe(false)
  })

  it('rejects empty decide highlights', () => {
    const r = checkProblemEssay(
      essay({ decide: { intro: 'Find yours.', rows: [{ if: 'A', then: 'B', highlights: [] }] } }),
    )
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/highlights/)
  })
})
