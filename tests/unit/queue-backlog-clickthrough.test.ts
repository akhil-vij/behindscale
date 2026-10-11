// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { youMapping } from '../../src/walls/queue-backlog'

// Click-through for the queue-backlog mission ("Own the queue"), the same
// harness as page 1's (tests/unit/mission-clickthrough.test.ts): the artifact
// SOURCE renders into jsdom with React, timers run 200x fast, and the suite
// drives the engine through the DOM:
//   starting decisions (1 lost, 2 stalled, 2 outages) -> the clean design
//   (log on disk, overflow to disk with a relay, dead-letter queue, scheduled
//   per customer, confirmed with a marker, cutoff: 0/0/0 and 8 bill lines)
//   -> commit -> attacks 1-5 fixed and held -> debrief.
// The bridge's protocol messages land on this window (window.parent ===
// window under jsdom), so state, checkpoints, touched and commit are
// asserted too, and the emitted state fills the wall's youMapping().

vi.setConfig({ testTimeout: 180_000, hookTimeout: 60_000 })
const MAX_WAIT = 30_000

const errors: string[] = []
const messages: Array<Record<string, unknown>> = []
let root: Root | null = null
let container: HTMLDivElement | null = null

const $ = (s: string) => document.querySelector<HTMLElement>(s)
const $$ = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s))
const text = (s: string) => ($(s)?.textContent ?? '').trim().replace(/\s+/g, ' ')
const score = () => ['#m-lost', '#m-stall', '#m-out'].map(text).join('/')
const lvls = () => $$('#lvls .lvl')
const cue = () => $('#artB')!.dataset.cue ?? '(unset)'
const idle = () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled
const realSetTimeout = globalThis.setTimeout
const sleep = (ms: number) => new Promise<void>((r) => realSetTimeout(r, ms))

async function until(fn: () => boolean, label: string, max = 20000): Promise<void> {
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    if (fn()) return
    await sleep(20)
  }
  throw new Error(`timeout waiting for: ${label}\n  narr: ${text('#narr')}\n  cue: ${cue()}\n  errors: ${JSON.stringify(errors.slice(0, 5))}`)
}
const lastState = () => messages.filter((m) => m.type === 'state').pop()
async function awaitState(pred: (s: Record<string, unknown>) => boolean, label: string) {
  await until(() => { const s = lastState(); return s !== undefined && pred(s) }, `state message: ${label}`, 10_000)
  return lastState()!
}
const heldOf = (s: Record<string, unknown>) => (Array.isArray(s.held) ? (s.held as boolean[]) : [])

function clickDeck(k: string, v: string): void {
  const b = document.querySelector<HTMLButtonElement>(`#deck button[data-k="${k}"][data-v="${v}"]`)
  if (!b) throw new Error(`no deck button ${k}=${v}`)
  expect(b.disabled).toBe(false)
  b.click()
  expect(['run', 'deck', 'group', '']).toContain(cue())
}
async function watch(i: number) {
  lvls()[i]!.querySelector<HTMLElement>('.watch')!.click()
  await sleep(30)
  await until(() => idle() && lvls()[i]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', `attack ${i + 1} watched`, MAX_WAIT)
}
async function rerun(i: number) {
  lvls()[i]!.querySelector<HTMLElement>('.rerunbtn')!.click()
  await sleep(30)
  await until(() => idle(), `attack ${i + 1} re-run`, MAX_WAIT)
  await sleep(50)
}
const held = (i: number) => lvls()[i]!.querySelector<HTMLElement>('.done')!.style.display === 'inline'

beforeAll(async () => {
  const w = window as unknown as {
    setTimeout: typeof setTimeout
    matchMedia: (q: string) => { matches: boolean; addEventListener: () => void; addListener: () => void }
    scrollTo: () => void
  }
  const oST = w.setTimeout.bind(window)
  const fast = ((fn: TimerHandler, ms?: number, ...a: unknown[]) => oST(fn, Math.max(0, (ms ?? 0) / 200), ...a)) as unknown as typeof setTimeout
  w.setTimeout = fast
  globalThis.setTimeout = fast
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} })
  w.scrollTo = () => {}
  console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')) }
  window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)))
  window.addEventListener('message', (e) => {
    const d = e.data as Record<string, unknown> | null
    if (d && d.v === 1) messages.push(d)
  })
  const mod = await import('../../content/artifacts/problem-queue-backlog-mission.jsx')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  root.render(createElement(mod.default))
  await until(() => !!$('#runbtn') && !!$('#deck button'), 'engine boot')
})

afterAll(() => {
  root?.unmount()
  container?.remove()
})

describe('queue-backlog click-through (jsdom, accelerated timers)', () => {
  it('boots with the starting decisions, RUN as the cue, and the prototype-only controls absent', () => {
    expect(cue()).toBe('run')
    expect(text('#runbtn')).toBe('RUN THE DAY ▶')
    expect(text('#narr')).toContain('Run the day as it is first, and see what breaks.')
    expect($$('#deck .kg')).toHaveLength(6)
    expect($('#freebtn')).toBeNull()
    expect($('#dmgtoast')).toBeNull()
    expect($('#escwrap')!.style.display).toBe('none')
  })

  it('the stage is the wall 2 drawing: fixed first words, value rows, the approved strings', () => {
    expect($('#bstage')!.getAttribute('viewBox')).toBe('0 0 640 244')
    const words = (g: string) => $$(`#${g} text`).map((t) => (t.textContent ?? '').trim()).filter(Boolean)
    expect(words('sg-buf')).toContain('in memory')
    expect(words('sg-full')).toEqual(['when full:', 'keep accepting'])
    expect(words('sg-stuck')).toEqual(['stuck job:', 'blocks the line'])
    expect(words('sg-done')).toEqual(['WORKERS', 'draining 0/s', 'done =', 'handed out'])
    expect(words('sg-retry')).toEqual(['PARTNER', 'up', 'retries:', 'full speed', 'receiving', '0/s'])
    expect(['A', 'B', 'C'].map((x) => text(`#lanetxt${x}`))).toEqual(['shared line', 'shared line', 'shared line'])
    expect($('#buftxt')!.classList.contains('halo')).toBe(true)
    // colours on classed elements go through style (the class outranks a fill attribute)
    expect($('#downtxt')!.style.fill).toBe('var(--art-green)')
    expect($('#downtxt')!.getAttribute('fill')).toBeNull()
  })

  it('starting decisions -> 1 lost, 2 stalled, 2 outages, a caused checkpoint', async () => {
    const bufTexts = new Set<string>()
    const poisonAt = new Set<string>()
    // the narration showing when the queue first reads LOCKED, and whether
    // the bar was red by then
    let lockedUnder: string | null = null
    let lockedRed = false
    const seen = new MutationObserver(() => {
      const b = text('#buftxt')
      bufTexts.add(b)
      if (b === 'LOCKED 100/100' && lockedUnder === null) {
        lockedUnder = text('#narr')
        lockedRed = $('#bufill')!.style.fill === 'var(--art-red)'
      }
      const c = document.querySelector('#poisonmark circle')
      if (c) poisonAt.add(`${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    })
    seen.observe($('#bstage')!, { childList: true, subtree: true, characterData: true })
    $('#runbtn')!.click()
    await sleep(30)
    await until(() => idle() && /\d/.test(text('#m-lost')), 'naive day', MAX_WAIT)
    seen.disconnect()
    // memory reads "32/100" (approved: no spaces round the slash, no middot)
    expect([...bufTexts].filter(Boolean).length).toBeGreaterThan(10)
    expect([...bufTexts].filter((t) => t && !/^(LOCKED )?\d+\/100$/.test(t))).toEqual([])
    // event 2 (the slowdown) fills memory to 100/100 and locks it, red,
    // before the "Full." line; no event takes the count past 100
    expect(lockedUnder).toMatch(/^EVENT 2\/6 · The workers slow/)
    expect(lockedRed).toBe(true)
    const counts = [...bufTexts].filter(Boolean).map((t) => Number(/(\d+)\/100$/.exec(t)![1]))
    expect(Math.max(...counts)).toBe(100)
    expect([...bufTexts].filter((t) => t.startsWith('LOCKED'))).toEqual(['LOCKED 100/100'])
    // the stuck job sits on the wire into WORKERS, a fixed point
    expect([...poisonAt]).toEqual(['322,81'])
    await sleep(100)
    expect(score()).toBe('1/2/2')
    expect(cue()).toBe('deck')
    expect(text('#slot .code')).toBe('DAY OVER')
    // one card per failure: the stuck job, the big customer, the lost job, the locked memory, the storm
    expect($$('#log .bcard.bad')).toHaveLength(5)
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'caused')).toBe(true)
  })

  it('the clean design -> 0, 0, 0 with 8 bill lines; attacks appear', async () => {
    clickDeck('where', 'log')
    clickDeck('full', 'relay')
    clickDeck('done', 'watermark')
    clickDeck('stuck', 'ackaround')
    clickDeck('order', 'tenant')
    clickDeck('retry', 'cutoff')
    $('#runbtn')!.click()
    await until(() => idle() && $('#escwrap')!.style.display !== 'none', 'clean day', MAX_WAIT)
    await sleep(100)
    expect(score()).toBe('0/0/0')
    expect($$('#bill .billrow')).toHaveLength(8)
    expect(text('#slot .code')).toBe('DAY SURVIVED')
    expect(text('#slot .sjump')).toBe('THE BILL ↓')
    expect(text('#runbtn')).toBe('RUN AGAIN ▶')
    expect(lvls()).toHaveLength(5)
    expect(lvls()[1]!.classList.contains('locked2')).toBe(true)
    const state = await awaitState((s) => s.survived === true, 'survived')
    expect(state.decisions).toEqual({ where: 'log', full: 'relay', stuck: 'ackaround', order: 'tenant', done: 'watermark', retry: 'cutoff' })
    expect(messages.filter((m) => m.type === 'touched')).toHaveLength(1)
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'survived')).toBe(true)
  })

  it('the commit box appears after the survived day; Lock it in emits commit', async () => {
    expect($('#cmtbox')!.style.display).not.toBe('none')
    ;($('#cmt-input') as HTMLInputElement).value = 'Disk in front, a relay at the workers pace, and a cutoff.'
    $('#cmt-lock')!.click()
    await until(() => messages.some((m) => m.type === 'commit' && m.text === 'Disk in front, a relay at the workers pace, and a cutoff.'), 'commit message')
  })

  it('attack 1 (Uber): a DUPLICATES row appears; workers skip repeats -> held', async () => {
    await watch(0)
    expect($('#kg-dedupe')).not.toBeNull()
    expect(text('#kg-dedupe .addtag')).toBe('ADDED BY ATTACK 1')
    expect(cue()).toBe('group')
    clickDeck('dedupe', 'yes')
    await rerun(0)
    expect(held(0)).toBe(true)
    expect(lvls()[1]!.classList.contains('locked2')).toBe(false)
  })

  it('attack 2 (Slack): a KEEP FOR row appears at two days; keep jobs for a week -> held', async () => {
    await watch(1)
    expect(document.querySelector('#deck button[data-k="retention"][data-v="2d"].sel')).not.toBeNull()
    clickDeck('retention', '7d')
    await rerun(1)
    expect(held(1)).toBe(true)
  })

  it('attack 3 (DoorDash): WHEN FULL flips to slowing the senders; set it back -> held', async () => {
    await watch(2)
    expect(document.querySelector('#deck button[data-k="full"][data-v="throttle"].sel')).not.toBeNull()
    clickDeck('full', 'relay')
    await rerun(2)
    expect(held(2)).toBe(true)
  })

  it('attack 4 (Meta): nothing to fix on a log -> held on the re-run', async () => {
    await watch(3)
    await rerun(3)
    expect(held(3)).toBe(true)
  })

  it('attack 5 (Segment): a PAST THE CUTOFF row appears; replay the archive -> held', async () => {
    await watch(4)
    expect($('#kg-archive')).not.toBeNull()
    clickDeck('archive', 'replay')
    await rerun(4)
    expect(held(4)).toBe(true)
  })

  it('the debrief shows, decorated with the commit; the held checkpoint fires; the YOU mapping fills', async () => {
    await until(() => /\bon\b/.test($('#debrief')!.className), 'debrief')
    expect(text('#debrief')).toContain('HELD UNDER ATTACK: THE DEBRIEF')
    expect(text('#debrief')).toContain('You said: "Disk in front, a relay at the workers pace, and a cutoff."')
    expect(text('#debrief')).toContain('Your design is now the sixth column in the comparison below')
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'held')).toBe(true)
    const state = await awaitState((s) => heldOf(s).every(Boolean) && heldOf(s).length === 5, 'all held')
    const cells = youMapping(state.decisions as Record<string, string>, heldOf(state))
    expect(cells.lives).toBe('A log on disk')
    expect(cells.full).toBe('Nobody: a rate-limited relay')
    expect(cells.breaks).toBe('Nothing the five posts name. See the bill for what it costs')
    expect(cells.dBreaks).toBe('NOTHING THE FIVE POSTS NAME')
    expect(Object.values(cells).some((v) => v.includes('not chosen'))).toBe(false)
  })

  it('zero console errors across the whole path', () => {
    expect(errors).toEqual([])
  })
})
