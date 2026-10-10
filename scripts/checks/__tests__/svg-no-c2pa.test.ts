import { describe, it, expect } from 'vitest'
import { svgNoC2pa, c2paMarkers } from '../svg-no-c2pa'
import { makeContent } from './fixtures'

const CLEAN = '<svg class="anat" viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg"><text x="1" y="2">CALLER</text></svg>'
// The shape of the diagrams-v2 delivery (2026-10-09), manifest shortened.
const SIGNED =
  '<svg class="anat" viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest">' +
  '<metadata><c2pa:manifest>AAAWgmp1bWIAAAAeanVtZGMycGEAEQAQ</c2pa:manifest></metadata><text x="1" y="2">CALLER</text></svg>'

function run(files: Record<string, string>) {
  return svgNoC2pa.run(makeContent({ articles: [], patterns: [], allSvgs: new Map(Object.entries(files)) }))
}

describe('svg-no-c2pa', () => {
  it('passes clean SVGs, including ones with ordinary <metadata>', () => {
    expect(run({ 'content/a.svg': CLEAN, 'content/b.svg': '<svg><metadata><title>x</title></metadata></svg>' })).toEqual([])
  })

  it('fails a delivered file with a manifest, naming the file', () => {
    const errors = run({ 'content/problems/x/anat-stripe.svg': SIGNED, 'content/ok.svg': CLEAN })
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('content/problems/x/anat-stripe.svg')
    expect(errors[0].message).toMatch(/C2PA/)
  })

  it('catches each marker on its own', () => {
    expect(c2paMarkers('<svg xmlns:c2pa="http://c2pa.org/manifest"></svg>')).toHaveLength(1)
    expect(c2paMarkers('<svg><c2pa:manifest>x</c2pa:manifest></svg>')).toHaveLength(1)
    expect(c2paMarkers('<svg><metadata>jumbf c2pa claim</metadata></svg>')).toHaveLength(1)
  })

  it('flags the real delivered files before they were stripped', () => {
    expect(c2paMarkers(SIGNED).length).toBeGreaterThanOrEqual(2)
  })
})
