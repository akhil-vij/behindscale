// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

// §5.2 click-through (default path) + §5.3 cue exclusivity, adapted from
// the prototype's headless script (handoff/repo-brief/headless-tests/
// clickthrough-default.mjs) to the repo's harness: the mission artifact's
// SOURCE renders into jsdom with React, timers are accelerated exactly as
// the prototype script did (setTimeout / 200, a rAF fake clock), and the
// suite drives the frozen engine through the DOM:
//   naive day -> AWS deck (window forever) -> commit -> A1 -> A2 -> A3 ->
//   A4 -> A5 (collision -> bound -> straggler -> reconcile) -> debrief.
// The protocol messages the bridge posts land on this same window
// (window.parent === window under jsdom), so the emitted state, checkpoints,
// touched and commit are asserted here too. Zero console errors.

// Dwells are real time by design (the 900ms double-charge dwell and the
// kill-mark floor are never speed-divided), so a step can take seconds even
// with /200 timers.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 60_000 })

const ROOT = process.cwd()
// Per-step wait ceiling (an attack at /200 timers plus its real-time dwells
// takes a few seconds; a stall shows up as a diagnostic, not a hang).
const MAX_WAIT = 30_000
const MISSION_SRC = readFileSync(
  join(ROOT, 'content', 'artifacts', 'problem-ambiguous-timeouts-mission.jsx'),
  'utf8',
)

const errors: string[] = []
const messages: Array<Record<string, unknown>> = []
let root: Root | null = null
let container: HTMLDivElement | null = null

const $ = (s: string) => document.querySelector<HTMLElement>(s)
const $$ = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s))
const text = (s: string) => ($(s)?.textContent ?? '').trim().replace(/\s+/g, ' ')
const score = () => ['#m-dbl', '#m-lost', '#m-tick'].map(text).join('/')
const lvls = () => $$('#lvls .lvl')
const cue = () => $('#artB')!.dataset.cue ?? '(unset)'
const realSetTimeout = globalThis.setTimeout
const sleep = (ms: number) => new Promise<void>((r) => realSetTimeout(r, ms))

async function until(fn: () => boolean, label: string, max = 20000): Promise<void> {
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    if (fn()) return
    await sleep(20)
  }
  throw new Error(
    `timeout waiting for: ${label}\n  narr: ${text('#narr')}\n  cue: ${cue()} · runbtn disabled: ${!idle()}\n  errors: ${JSON.stringify(errors.slice(0, 5))}\n  narr log (last 12): ${JSON.stringify(narrLog.slice(-12), null, 1)}`,
  )
}

const cuesSeen = new Set<string>()
const narrLog: string[] = []
function assertCue(): void {
  const c = cue()
  cuesSeen.add(c)
  expect(['run', 'deck', 'group', '']).toContain(c)
  // No element-local looping pulse classes -- the single attribute is the
  // only cue (changelog v7.3 §2).
  expect($$('.attn, .attng')).toHaveLength(0)
}

function clickDeck(k: string, v: string): void {
  const b = document.querySelector<HTMLButtonElement>(`#deck button[data-k="${k}"][data-v="${v}"]`)
  if (!b) throw new Error(`no deck button ${k}=${v}`)
  expect(b.disabled).toBe(false)
  b.click()
  assertCue()
}

const idle = () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled

beforeAll(async () => {
  // Accelerate time, as the prototype's jsdom script did.
  const w = window as unknown as {
    setTimeout: typeof setTimeout
    requestAnimationFrame: (cb: (t: number) => void) => number
    matchMedia: (q: string) => { matches: boolean; addEventListener: () => void; addListener: () => void }
    scrollTo: () => void
  }
  const oST = w.setTimeout.bind(window)
  const fast = ((fn: TimerHandler, ms?: number, ...a: unknown[]) =>
    oST(fn, Math.max(0, (ms ?? 0) / 200), ...a)) as unknown as typeof setTimeout
  w.setTimeout = fast
  globalThis.setTimeout = fast
  let fake = 0
  const raf = (cb: (t: number) => void) => oST(() => { fake += 400; cb(fake) }, 1) as unknown as number
  w.requestAnimationFrame = raf
  ;(globalThis as unknown as { requestAnimationFrame: typeof raf }).requestAnimationFrame = raf
  w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} })
  w.scrollTo = () => {}
  ;(window.SVGElement.prototype as unknown as { getBBox: () => object }).getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 })
  const origError = console.error
  console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')) }
  window.addEventListener('error', (e) => errors.push(String(e.error ?? e.message)))
  window.addEventListener('message', (e) => {
    const d = e.data as Record<string, unknown> | null
    if (d && d.v === 1) messages.push(d)
  })
  void origError

  const mod = await import('../../content/artifacts/problem-ambiguous-timeouts-mission.jsx')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  root.render(createElement(mod.default))
  await until(() => !!$('#runbtn') && !!$('#deck button'), 'engine boot')
  new MutationObserver(() => { narrLog.push(text('#narr').slice(0, 90)) }).observe($('#narr')!, { childList: true, subtree: true, characterData: true })
})

afterAll(() => {
  root?.unmount()
  container?.remove()
})

describe('§5.2 click-through, default path (jsdom, accelerated timers)', () => {
  it('boots with the naive deck and the run cue', () => {
    expect(cue()).toBe('run')
    expect(text('#runbtn')).toContain('RUN THE DAY - NAIVE')
    expect(text('#narr')).toContain('the damage report is the syllabus')
    expect($('#escwrap')!.style.display).toBe('none')
    expect($('#bill')!.style.display).toBe('none')
    expect($('#cmtbox')!.style.display).toBe('none')
    assertCue()
  })

  it('naive day -> 2 doubles / 0 lost / 0 tickets, the deck cue, a caused checkpoint', async () => {
    $('#runbtn')!.click()
    await sleep(30)
    expect(cue()).toBe('')
    await until(() => idle() && /\d/.test(text('#m-dbl')), 'naive run', MAX_WAIT)
    await sleep(100)
    expect(score()).toBe('2/0/0')
    expect(cue()).toBe('deck')
    expect($$('#log .bcard.bad')).toHaveLength(2)
    expect($('#escwrap')!.style.display).toBe('none')
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'caused')).toBe(true)
    assertCue()
  })

  it('AWS deck (window forever) -> clean day, bill visible, touched + survived emitted', async () => {
    clickDeck('id', 'key')
    expect(cue()).toBe('')
    clickDeck('mem', 'acid')
    clickDeck('cli', 'key')
    clickDeck('rep', 'saved')
    clickDeck('ret', 'ever')
    $('#runbtn')!.click()
    await until(() => idle() && $('#escwrap')!.style.display !== 'none', 'clean day', MAX_WAIT)
    await sleep(100)
    expect(score()).toBe('0/0/0')
    expect($('#bill')!.style.display).not.toBe('none')
    expect(text('#bill')).toContain('BASELINE')
    expect(text('#bill')).toContain('keys kept without bound')
    expect(text('#runbtn')).toContain('RUN AGAIN')
    expect(lvls()).toHaveLength(5)
    expect(lvls()[1]!.classList.contains('locked2')).toBe(true)
    expect(messages.filter((m) => m.type === 'touched')).toHaveLength(1)
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'survived')).toBe(true)
    const state = messages.filter((m) => m.type === 'state').pop()!
    expect(state.survived).toBe(true)
    expect(state.decisions).toEqual({ id: 'key', mem: 'acid', read: 'master', cli: 'key', rep: 'saved', ret: 'ever' })
    expect(state.held).toEqual([false, false, false, false, false])
    expect((state.bill as Array<{ c: string }>).map((b) => b.c)).toContain(
      'keys kept without bound - a future key can collide with an ancient one',
    )
    assertCue()
  })

  it('the commit box appears after the survived day; Lock it in emits commit and locks', async () => {
    expect($('#cmtbox')!.style.display).not.toBe('none')
    ;($('#cmt-input') as HTMLInputElement).value = 'Commit with the work so half-failures cannot exist.'
    $('#cmt-lock')!.click()
    await sleep(20)
    expect(text('#cmt-locked')).toContain('"Commit with the work so half-failures cannot exist."')
    expect($('#cmt-ask')!.style.display).toBe('none')
    const commit = messages.find((m) => m.type === 'commit')
    expect(commit?.text).toBe('Commit with the work so half-failures cannot exist.')
    assertCue()
  })

  it('A1 (Stripe): re-run fails, accept appears only after, accept completes; the day waits', async () => {
    lvls()[0]!.querySelector<HTMLElement>('.watch')!.click()
    await until(() => lvls()[0]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', 'A1 fixrow', MAX_WAIT)
    expect(cue()).toBe('') // A1 has no group to glow
    expect(lvls()[0]!.querySelector<HTMLElement>('.acceptbtn')!.style.display).toBe('none')
    lvls()[0]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(() => lvls()[0]!.querySelector<HTMLElement>('.acceptbtn')!.style.display !== 'none', 'A1 accept shown', MAX_WAIT)
    expect(lvls()[0]!.querySelector<HTMLElement>('.done')!.style.display).not.toBe('inline')
    // Running the day mid-attack is refused: score unchanged, narrator says so.
    const before = score()
    $('#runbtn')!.click()
    await sleep(30)
    expect(score()).toBe(before)
    expect(text('#narr')).toContain('ATTACK ACTIVE')
    lvls()[0]!.querySelector<HTMLElement>('.acceptbtn')!.click()
    await sleep(30)
    expect(lvls()[0]!.querySelector<HTMLElement>('.done')!.style.display).toBe('inline')
    expect(lvls()[1]!.classList.contains('locked2')).toBe(false)
    expect(cue()).toBe('')
    assertCue()
  })

  it('A2 (Airbnb): the attack flips reads to the replica; re-run breaks; read: master holds', async () => {
    lvls()[1]!.querySelector<HTMLElement>('.watch')!.click()
    await until(() => lvls()[1]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', 'A2 fixrow', MAX_WAIT)
    expect(cue()).toBe('group')
    expect($('#kg-read')!.classList.contains('cue-target')).toBe(true)
    expect(document.querySelector<HTMLElement>('#deck button[data-k="read"].sel')!.dataset.v).toBe('replica')
    lvls()[1]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(idle, 'A2 rerun (replica)', MAX_WAIT)
    await sleep(50)
    expect(lvls()[1]!.querySelector<HTMLElement>('.done')!.style.display).not.toBe('inline')
    expect(cue()).toBe('group')
    clickDeck('read', 'master')
    lvls()[1]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(() => lvls()[1]!.querySelector<HTMLElement>('.done')!.style.display === 'inline', 'A2 held', MAX_WAIT)
    expect(cue()).toBe('')
    const state = messages.filter((m) => m.type === 'state').pop()!
    expect(state.held).toEqual([true, true, false, false, false])
    assertCue()
  })

  it('A3 (Segment) with window forever holds, with the warn card', async () => {
    lvls()[2]!.querySelector<HTMLElement>('.watch')!.click()
    await until(() => lvls()[2]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', 'A3 fixrow', MAX_WAIT)
    expect(cue()).toBe('group')
    lvls()[2]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(() => lvls()[2]!.querySelector<HTMLElement>('.done')!.style.display === 'inline', 'A3 held', MAX_WAIT)
    const card = $('#log .bcard')! // newest first
    expect(card.classList.contains('warn')).toBe(true)
    expect(card.textContent).toContain('HELD - BY REFUSING TO FORGET')
    assertCue()
  })

  it('A4 (AWS): the params row appears defaulted to run; run breaks; refuse holds', async () => {
    expect($('#kg-params')).toBeNull()
    lvls()[3]!.querySelector<HTMLElement>('.watch')!.click()
    await until(() => lvls()[3]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', 'A4 fixrow', MAX_WAIT)
    expect($('#kg-params')).not.toBeNull()
    expect(document.querySelector<HTMLElement>('#deck button[data-k="params"].sel')!.dataset.v).toBe('run')
    expect(text('#kg-params .addtag')).toBe('ADDED BY ATTACK 4')
    lvls()[3]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(idle, 'A4 rerun (run)', MAX_WAIT)
    await sleep(50)
    expect(lvls()[3]!.querySelector<HTMLElement>('.done')!.style.display).not.toBe('inline')
    clickDeck('params', 'refuse')
    lvls()[3]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(() => lvls()[3]!.querySelector<HTMLElement>('.done')!.style.display === 'inline', 'A4 held', MAX_WAIT)
    expect($('#kg-params .addtag')).toBeNull()
    assertCue()
  })

  it('A5 (Shopify) with forever: collision, WINDOW glows, still colliding; bound to a day -> straggler + AFTER row; reconcile holds', async () => {
    lvls()[4]!.querySelector<HTMLElement>('.watch')!.click()
    await until(() => lvls()[4]!.querySelector<HTMLElement>('.fixrow')!.style.display !== 'none', 'A5 fixrow', MAX_WAIT)
    expect(cue()).toBe('group')
    expect($('#kg-ret')!.classList.contains('cue-target')).toBe(true)
    expect($('#kg-after')).toBeNull()
    expect($('#log .bcard')!.textContent).toContain('AN ANCIENT KEY ATE A NEW CHARGE')
    lvls()[4]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(idle, 'A5 still colliding', MAX_WAIT)
    await sleep(50)
    expect($('#log .bcard')!.textContent).toContain('STILL COLLIDING')
    expect($('#kg-after')).toBeNull()
    clickDeck('ret', 'day')
    lvls()[4]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(idle, 'A5 bounded', MAX_WAIT)
    await sleep(50)
    expect($('#log .bcard')!.textContent).toContain('YOU TRADED THE COLLISION FOR A STRAGGLER')
    expect($('#kg-after')).not.toBeNull()
    expect(document.querySelector<HTMLElement>('#deck button[data-k="after"].sel')!.dataset.v).toBe('nothing')
    expect(text('#kg-after .addtag')).toBe('ADDED BY ATTACK 5')
    expect($('#kg-after')!.classList.contains('cue-target')).toBe(true)
    clickDeck('after', 'reconcile')
    lvls()[4]!.querySelector<HTMLElement>('.rerunbtn')!.click()
    await until(() => lvls()[4]!.querySelector<HTMLElement>('.done')!.style.display === 'inline', 'A5 held', MAX_WAIT)
    await sleep(50)
    expect($('#log .bcard')!.textContent).toContain('HELD - CAUGHT, RECORDED, REPAIRED')
    expect(text('#bill')).toContain('reconciliation is a standing team cost')
    assertCue()
  })

  it('the debrief is generated from the final decisions, decorated with the commit, and the held checkpoint fires', async () => {
    await until(() => $('#debrief')!.classList.contains('on'), 'debrief on', 10000)
    await sleep(30)
    const d = text('#debrief')
    expect(d).toContain('HELD UNDER ATTACK - THE DEBRIEF')
    expect(d).toContain('committed with the work - one transaction')
    expect(d).toContain('a duplicate gets the saved result')
    expect(d).toContain('~24 hours, chosen on purpose')
    expect(d).toContain('refuse, naming the mismatch')
    expect(d).toContain("a reconciliation sweep against the partner's records")
    expect(d).toContain('THE BILL, IN FULL')
    expect(d).toContain('That trade is the interview answer.')
    expect(text('#you-debrief-top')).toContain('You said: "Commit with the work so half-failures cannot exist."')
    expect(text('#you-debrief-top')).toContain('Your design is now the sixth column in the comparison below')
    expect(messages.some((m) => m.type === 'checkpoint' && m.kind === 'held')).toBe(true)
    const state = messages.filter((m) => m.type === 'state').pop()!
    expect(state.held).toEqual([true, true, true, true, true])
    expect(state.decisions).toMatchObject({ ret: 'day', params: 'refuse', after: 'reconcile' })
    expect(cue()).toBe('')
    assertCue()
  })

  it('zero console errors across the whole path', () => {
    expect(errors).toEqual([])
  })
})

describe('§5.3 cue exclusivity', () => {
  it('data-cue was exactly one of run|deck|group|"" at every transition, and all four occurred', () => {
    expect(Array.from(cuesSeen).sort()).toEqual(['', 'deck', 'group', 'run'])
  })

  it('no .attn / .attng pulse class exists anywhere in the mission source', () => {
    expect(/\battng?\b/.test(MISSION_SRC)).toBe(false)
  })

  it('the cue is set by one assignment site at a time (never two attributes)', () => {
    expect($$('#artB[data-cue]')).toHaveLength(1)
    expect($$('[data-cue]')).toHaveLength(1)
  })
})
