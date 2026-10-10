import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dayTokens } from '../../content/artifacts/problem-queue-backlog-rules.js'

// Rules parity for the queue-backlog mission. The port's dayTokens()
// (content/artifacts/problem-queue-backlog-rules.js) must give exactly the
// prototype's results: the reference is the v1.3 prototype's own mission.js
// (tests/fixtures/queue-backlog-v1.3-mission.js, copied from the delivery),
// its RULES block evaluated as-is. Every combination of the six starting
// decisions and the four that attacks add (each also unset), 128,304 in all,
// is compared on events, meters, the bill and the verdict. The headline
// counts from the copy notes are asserted too: 1,188 valid decision sets,
// 60 clean, 60 different bills, 19 kinds of cost.

type Q = Record<string, string | undefined>
interface Day { ev: { e: string; t: string }[]; lost: number; stalled: number; outage: number; bill: { c: string; s: string; base?: boolean }[]; win: boolean }

const src = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'queue-backlog-v1.3-mission.js'), 'utf8')
const rules = /\/\*RULES-START\*\/([\s\S]*?)\/\*RULES-END\*\//.exec(src)![1]!
const reference = new Function(`${rules}; return dayTokens;`)() as (q: Q) => Day
const port = dayTokens as unknown as (q: Q) => Day

const WHERE = ['mem', 'log', 'rows']
const FULL = ['accept', 'reject', 'throttle', 'relay']
const STUCK = ['block', 'requeue', 'ackaround', 'localq']
const ORDER = ['fifo', 'priority', 'tenant']
const DONE = ['fetch', 'lease', 'watermark']
const RETRY = ['forever', 'backoff', 'cutoff']
// The deck forbids setting aside a stuck job when "done" means handed out
// (mission.js: optNeeds ackaround needs done !== fetch).
const valid = (q: Q) => !(q.stuck === 'ackaround' && q.done === 'fetch')

function starting(): Q[] {
  const out: Q[] = []
  for (const where of WHERE) for (const full of FULL) for (const stuck of STUCK)
    for (const order of ORDER) for (const done of DONE) for (const retry of RETRY) {
      const q = { where, full, stuck, order, done, retry }
      if (valid(q)) out.push(q)
    }
  return out
}
const ADDED: Array<[string, Array<string | undefined>]> = [
  ['dedupe', [undefined, 'no', 'yes']],
  ['retention', [undefined, '2d', '7d', 'unbounded']],
  ['scans', [undefined, 'full', 'checkpoint']],
  ['archive', [undefined, 'drop', 'replay']],
]
function withAdded(base: Q[]): Q[] {
  let out = base
  for (const [k, vals] of ADDED) out = out.flatMap((q) => vals.map((v) => (v === undefined ? q : { ...q, [k]: v })))
  return out
}

describe('queue-backlog rules parity (v1.3 prototype vs the port)', () => {
  const decks = starting()

  it('1,188 valid decision sets, 60 clean, 60 different bills, 19 kinds of cost', () => {
    expect(decks).toHaveLength(1188)
    const clean = decks.filter((q) => port(q).win)
    expect(clean).toHaveLength(60)
    expect(new Set(clean.map((q) => JSON.stringify(port(q).bill))).size).toBe(60)
    const kinds = new Set(withAdded(decks).flatMap((q) => port(q).bill.map((b) => b.c)))
    expect(kinds.size).toBe(19)
  })

  it('identical results on all 128,304 combinations, including the four decisions attacks add', () => {
    const all = withAdded(decks)
    expect(all).toHaveLength(128_304)
    let diffs = 0
    for (const q of all) {
      if (JSON.stringify(port(q)) !== JSON.stringify(reference(q))) diffs++
    }
    expect(diffs).toBe(0)
  })

  it('the starting decisions give 1 lost, 2 stalled, 2 outages', () => {
    const d = port({ where: 'mem', full: 'accept', stuck: 'block', order: 'fifo', done: 'fetch', retry: 'forever' })
    expect([d.lost, d.stalled, d.outage]).toEqual([1, 2, 2])
  })

  it('the clean design gives 0, 0, 0 with 8 bill lines', () => {
    const d = port({ where: 'log', full: 'relay', stuck: 'ackaround', order: 'tenant', done: 'watermark', retry: 'cutoff' })
    expect([d.lost, d.stalled, d.outage, d.win]).toEqual([0, 0, 0, true])
    expect(d.bill).toHaveLength(8)
  })
})
