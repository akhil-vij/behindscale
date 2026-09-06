import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dayTokens } from '../../content/artifacts/problem-ambiguous-timeouts-rules.js'

// §5.1 rules parity (brief REPO-BRIEF-problem-page-port.md §5.1). The
// mission's RULES block is a frozen pure function: enumerate all 576
// decision sets, assert exactly 12 survive the day, and diff each clean
// deck's bill line for line -- cost text AND source -- against the
// approved DECKS-v6-1.md (tests/fixtures/, copied from the handoff).

interface BillLine {
  c: string
  s: string
  base?: boolean
}
interface Day {
  ev: { e: string; t: string }[]
  extra: string | null
  dbl: number
  lost: number
  tick: number
  bill: BillLine[]
  win: boolean
}
type Deck = { id: string; mem: string; read: string; cli: string; rep: string; ret: string }

const ID = ['none', 'hash', 'key']
const MEM = ['none', 'store', 'storerec', 'acid']
const READ = ['master', 'replica']
const CLI = ['giveup', 'blind', 'key']
const REP = ['err', 'saved']
const RET = ['min', 'day', 'size', 'ever']

function allDecks(): Deck[] {
  const out: Deck[] = []
  for (const id of ID)
    for (const mem of MEM)
      for (const read of READ)
        for (const cli of CLI)
          for (const rep of REP)
            for (const ret of RET) out.push({ id, mem, read, cli, rep, ret })
  return out
}

// DECKS-v6-1.md: "## N. memory=X · reply=Y · window=Z" headers, each followed
// by "- [**baseline** · ]cost *(source)*" lines.
function parseDecks(md: string) {
  const sections = new Map<string, { base: boolean; c: string; s: string }[]>()
  let current: { base: boolean; c: string; s: string }[] | null = null
  for (const raw of md.split('\n')) {
    const h = raw.match(/^## \d+\. memory=(\w+) · reply=(\w+) · window=(\w+)$/)
    if (h) {
      current = []
      sections.set(`${h[1]}|${h[2]}|${h[3]}`, current)
      continue
    }
    if (raw.startsWith('## ')) {
      current = null
      continue
    }
    const line = raw.match(/^- (\*\*baseline\*\* · )?(.+) \*\((.+)\)\*$/)
    if (line && current) {
      current.push({ base: line[1] !== undefined, c: line[2]!, s: line[3]! })
    }
  }
  return sections
}

const DECKS_MD = readFileSync(join('tests', 'fixtures', 'DECKS-v6-1.md'), 'utf8')
const expected = parseDecks(DECKS_MD)
const run = (d: Deck) => dayTokens(d) as Day

describe('§5.1 rules parity: dayTokens() vs DECKS-v6-1.md', () => {
  const decks = allDecks()
  const clean = decks.filter((d) => run(d).win)

  it('enumerates 576 decision sets', () => {
    expect(decks).toHaveLength(576)
  })

  it('exactly 12 survive the day', () => {
    expect(clean).toHaveLength(12)
  })

  it('the 12 clean decks are the 12 DECKS-v6-1.md sections (memory × reply × window)', () => {
    expect(expected.size).toBe(12)
    const keys = clean.map((d) => `${d.mem}|${d.rep}|${d.ret}`).sort()
    expect(keys).toEqual(Array.from(expected.keys()).sort())
    // Every clean deck names the operation with a key, keeps reads on the
    // master, and retries carrying the identity (the only survivable shape).
    for (const d of clean) {
      expect([d.id, d.read, d.cli]).toEqual(['key', 'master', 'key'])
    }
  })

  it('a clean day has zero doubles, lost sales, and mystery tickets', () => {
    for (const d of clean) {
      const day = run(d)
      expect([day.dbl, day.lost, day.tick]).toEqual([0, 0, 0])
      expect(day.ev.every((e) => !/^(DBL|LOST|TICKET)/.test(e.t))).toBe(true)
    }
  })

  for (const [key, lines] of expected) {
    it(`bill matches line for line: ${key}`, () => {
      const [mem, rep, ret] = key.split('|') as [string, string, string]
      const bill = run({ id: 'key', mem, read: 'master', cli: 'key', rep, ret }).bill
      expect(bill.map((b) => ({ base: b.base === true, c: b.c, s: b.s }))).toEqual(lines)
    })
  }

  it('the 12 bills are distinct (zero dominance is DECKS-v6-1.md\'s claim; distinctness is checkable)', () => {
    const rendered = clean.map((d) => JSON.stringify(run(d).bill))
    expect(new Set(rendered).size).toBe(12)
  })

  it('reconciliation joins the bill only when the AFTER row is set to reconcile (attack 5)', () => {
    const base = { id: 'key', mem: 'acid', read: 'master', cli: 'key', rep: 'saved', ret: 'day' }
    const without = run(base).bill.map((b) => b.c)
    const withReconcile = (dayTokens({ ...base, after: 'reconcile' }) as Day).bill.map((b) => b.c)
    expect(without.some((c) => c.startsWith('reconciliation'))).toBe(false)
    expect(withReconcile[withReconcile.length - 1]).toBe(
      'reconciliation is a standing team cost - a job that never ends',
    )
  })

  it('attack-added rows (params / after) never change the day\'s outcomes', () => {
    for (const d of clean) {
      for (const params of ['run', 'replay', 'refuse']) {
        for (const after of ['nothing', 'reconcile']) {
          const day = dayTokens({ ...d, params, after }) as Day
          expect(day.win).toBe(true)
          expect(day.ev).toEqual(run(d).ev)
        }
      }
    }
  })
})
