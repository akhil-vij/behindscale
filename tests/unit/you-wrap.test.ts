// Diagrams v2: the YOU diagram's memory (dState) and red-line (dBreaks) slots
// wrap into a fixed number of rows (data-wrap / data-lines on the <text>). A
// string that needs more rows is cut short with "…". This walks every string
// youMapping() can output -- every decision it reads, every held/not-held
// pattern of the five attacks -- through both YOU files and fails if any
// would be cut.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { youMapping } from '../../src/walls/ambiguous-timeouts'
import type { WallDecisions } from '../../src/walls/index'
import { wrapLines, wrapSpecOf, wrappedTspans } from '../../src/pages/problem/fillWrapped'
import { fillSlots } from '../../src/pages/problem/ComparisonSection'

const DIR = join(process.cwd(), 'content', 'problems', 'ambiguous-failure-under-retry')
const OPTIONS: Record<string, string[]> = {
  id: ['none', 'hash', 'key'],
  mem: ['none', 'store', 'storerec', 'acid'],
  read: ['master', 'replica'],
  rep: ['err', 'saved'],
  ret: ['min', 'day', 'size', 'ever'],
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

describe('YOU diagram: wrapped slots never cut a youMapping() string', () => {
  for (const file of ['you-filled', 'you-filled-v']) {
    const src = readFileSync(join(DIR, `${file}.svg`), 'utf8')
    for (const slot of ['dState', 'dBreaks']) {
      it(`${file} {{${slot}}}: every string fits its rows`, () => {
        const m = new RegExp(`<text\\b([^>]*)>\\{\\{${slot}\\}\\}</text>`).exec(src)
        expect(m, `${file} has a <text> holding {{${slot}}}`).not.toBeNull()
        const spec = wrapSpecOf(m![1])
        expect(spec, `${file} {{${slot}}} carries data-wrap`).toBeDefined()
        const strings = [...outputs.get(slot)!]
        expect(strings.length).toBeGreaterThan(slot === 'dBreaks' ? 30 : 5)
        const cut = strings.filter((s) => wrapLines(s, spec!).cut)
        expect(cut).toEqual([])
      })
    }
    it(`${file}: the filled markup never shows "…"`, () => {
      const longest = (k: string) => [...outputs.get(k)!].sort((a, b) => b.length - a.length)[0]
      const filled = fillSlots(src, { dKey: longest('dKey'), dRep: longest('dRep'), dState: longest('dState'), dBreaks: longest('dBreaks') })
      expect(filled).not.toContain('…')
      expect(filled).not.toMatch(/\{\{\w+\}\}/)
    })
  }

  it('the memory label is centred: fewer rows move the block down, never above its first-row baseline', () => {
    const attrs = 'class="slabel" x="180" y="238" data-wrap="27" data-lines="3" data-line-height="16"'
    const two = wrappedTspans(attrs, 'IN THE SAME COMMIT AS THE CHARGE, MAIN DATABASE ONLY', wrapSpecOf(attrs)!, (x) => x)
    expect(two).toMatch(/^<tspan x="180" dy="8">IN THE SAME COMMIT AS THE<\/tspan><tspan x="180" dy="16">CHARGE, MAIN DATABASE ONLY<\/tspan>$/)
    const red = 'class="blabel" x="44" y="398" data-wrap="38" data-lines="3" data-line-height="16"'
    expect(wrappedTspans(red, 'STILL BREAKS: KEY REUSED, BY DESIGN', wrapSpecOf(red)!, (x) => x)).toMatch(/^<tspan x="44" dy="0">/)
  })
})
