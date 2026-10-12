// The queue-backlog YOU diagram (wall 2 drawings): only the phone file's
// red line ({{dBreaks}} in you-filled-v) wraps, into two rows (data-wrap 36).
// Every other slot is one line by construction. This walks every string the
// wall's youMapping() can output -- every decision it reads, every
// held/not-held pattern of the five attacks -- and fails if the wrapped slot
// would cut one short, or if a slot the drawing doesn't wrap starts to.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { youMapping } from '../../src/walls/queue-backlog'
import type { WallDecisions } from '../../src/walls/index'
import { wrapLines, wrapSpecOf } from '../../src/pages/problem/fillWrapped'
import { fillSlots } from '../../src/pages/problem/ComparisonSection'

const DIR = join(process.cwd(), 'content', 'problems', 'buffer-degrades-under-backlog')
const SLOTS = ['dLives', 'dSlows', 'dFull', 'dBreaks']
const OPTIONS: Record<string, string[]> = {
  where: ['mem', 'log', 'rows'],
  scans: ['checkpoint', 'full'],
  full: ['accept', 'reject', 'throttle', 'relay'],
  stuck: ['block', 'requeue', 'ackaround', 'localq'],
  order: ['fifo', 'priority', 'tenant'],
  done: ['fetch', 'lease', 'watermark'],
  retry: ['forever', 'backoff', 'cutoff'],
}

function everyOutput(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const keys = Object.keys(OPTIONS)
  const walk = (i: number, K: Record<string, string>) => {
    if (i === keys.length) {
      for (let m = 0; m < 32; m++) {
        const held = [0, 1, 2, 3, 4].map((b) => (m & (1 << b)) !== 0)
        for (const [k, v] of Object.entries(youMapping(K as WallDecisions, held))) {
          if (!out.has(k)) out.set(k, new Set())
          out.get(k)!.add(v)
        }
      }
      return
    }
    for (const v of OPTIONS[keys[i]]) walk(i + 1, { ...K, [keys[i]]: v })
  }
  walk(0, {})
  return out
}

const outputs = everyOutput()
const longest = (k: string) => [...outputs.get(k)!].sort((a, b) => b.length - a.length)[0]

describe('queue-backlog YOU diagram: slots and wrapping', () => {
  for (const file of ['you-filled', 'you-filled-v']) {
    const src = readFileSync(join(DIR, `${file}.svg`), 'utf8')
    const suffix = file.endsWith('-v') ? '-v' : ''
    it(`${file}: each slot sits in its own <text> with the id the drawing gives it`, () => {
      for (const slot of SLOTS) {
        const id = `you-d-${slot.slice(1).toLowerCase()}${suffix}`
        expect(src).toMatch(new RegExp(`<text\\b[^>]*\\bid="${id}"[^>]*>\\{\\{${slot}\\}\\}</text>`))
      }
    })
    it(`${file}: only the phone's {{dBreaks}} wraps`, () => {
      for (const slot of SLOTS) {
        const attrs = new RegExp(`<text\\b([^>]*)>\\{\\{${slot}\\}\\}</text>`).exec(src)![1]
        const wraps = file === 'you-filled-v' && slot === 'dBreaks'
        expect(wrapSpecOf(attrs) !== undefined, `${file} {{${slot}}}`).toBe(wraps)
      }
    })
    it(`${file}: the filled markup never shows "…" and leaves no slot unfilled`, () => {
      const filled = fillSlots(src, Object.fromEntries(SLOTS.map((k) => [k, longest(k)])))
      expect(filled).not.toContain('…')
      expect(filled).not.toMatch(/\{\{\w+\}\}/)
    })
  }

  it('you-filled-v {{dBreaks}}: every string fits its two rows', () => {
    const src = readFileSync(join(DIR, 'you-filled-v.svg'), 'utf8')
    const spec = wrapSpecOf(/<text\b([^>]*)>\{\{dBreaks\}\}<\/text>/.exec(src)![1])!
    expect(spec).toEqual({ wrap: 36, lines: 2, lineHeight: 16 })
    const strings = [...outputs.get('dBreaks')!]
    expect(strings.length).toBeGreaterThan(5)
    expect(strings.filter((s) => wrapLines(s, spec).cut)).toEqual([])
  })

  it('the phone files carry no second you-svg / you-fill / you-empty id', () => {
    for (const file of ['you-filled-v', 'you-empty-v']) {
      expect(readFileSync(join(DIR, `${file}.svg`), 'utf8')).not.toMatch(/id="you-(svg|fill|empty)"/)
    }
  })
})
