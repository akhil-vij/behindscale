import { test, expect, type Frame, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Problem-page v7.3 port -- the browser half of the brief's §5 suite
// (REPO-BRIEF-problem-page-port.md; mapping in handoff/IMPLEMENTATION-PROMPT.md
// §6). Runs against the production build via `vite preview` (see
// playwright.config.ts), whose CORS header lets the sandboxed artifact
// frames load their bundles exactly as production does.
//
//   §5.2  the real iframe round-trip: ready -> init -> play -> state -> the
//         YOU column fills -> commit -> reload -> persistence restores
//   §5.4  text parity: the served page's innerText (both frames included)
//         vs the reference build, with only the three §4G copy decisions
//         and the excluded blocks allowed to differ
//   §5.5  no-JS: the copy renders, each frame position shows its one-line
//         fallback, the noscript wall figure shows
//   §5.6  prerender: three known sentences in dist/problems/ambiguous-timeouts.html
//   ruling a: mobile scroll chaining at the mission frame's edges
//
// The two Playwright limits the smoke suite documents (no synthetic pointer
// events into opaque-origin frames) do not bite here: Playwright's frame
// locators drive the sandboxed frames' DOM through CDP, and the preview
// server now sends Access-Control-Allow-Origin so the bundles run.

const PAGE = '/problems/ambiguous-timeouts'
const FIXTURE = join(process.cwd(), 'tests', 'fixtures', 'problem-page-v7.3.html')
const DIST_PAGE = join(process.cwd(), 'dist', 'problems', 'ambiguous-timeouts.html')

// Clicks a control INSIDE an artifact frame through the DOM. Playwright's
// pointer clicks hit-test within the frame's own document, so they cannot
// see the page's sticky station nav (z-index above the frame) covering a
// control it scrolled to the top of a short viewport -- the click silently
// lands on the nav. The engines listen for `click`, so a DOM click drives
// them the same way; the iframe pipe, hydration, and state are still real.
async function frameClick(frame: Frame, selector: string): Promise<void> {
  await frame.locator(selector).waitFor({ state: 'attached' })
  await frame.locator(selector).evaluate((el) => (el as HTMLElement).click())
}

function frameOf(page: Page, slug: string): Frame {
  const f = page.frames().find((fr) => fr.url().includes(`/artifacts/${slug}/`))
  expect(f, `artifact frame ${slug} must be present`).toBeTruthy()
  return f!
}

async function waitForMission(page: Page): Promise<Frame> {
  await page.waitForLoadState('networkidle')
  const f = frameOf(page, 'problem-ambiguous-timeouts-mission')
  await f.locator('#runbtn').waitFor({ state: 'visible', timeout: 30_000 })
  return f
}

test.describe('§5.2 real iframe round-trip', () => {
  test('ready -> init, a survived day fills YOU, commit persists across reload', async ({ page }) => {
    test.setTimeout(180_000)
    await page.addInitScript(() => {
      const w = window as unknown as { __msgs: unknown[] }
      w.__msgs = []
      window.addEventListener('message', (e) => {
        const d = e.data as { v?: number } | null
        if (d && d.v === 1) w.__msgs.push(d)
      })
    })
    await page.goto(PAGE)
    const mission = await waitForMission(page)

    // The handshake: the artifact announced, the host answered (the frame
    // got its content-height from the size message).
    await expect.poll(() => page.locator('#artB iframe').evaluate((el) => (el as HTMLElement).style.height)).not.toBe('900px')
    await expect(page.locator('#you-th')).toHaveText(/survive a day first/i)
    await expect(page.locator('#navdeck')).toBeHidden()

    // The AWS deck, window forever (the brief's default path), at 2×.
    const click = (k: string, v: string) => frameClick(mission, `#deck button[data-k="${k}"][data-v="${v}"]`)
    await click('id', 'key')
    await expect(page.locator('#navdeck')).toBeVisible() // touched -> deck-jump revealed
    await click('mem', 'acid')
    await click('cli', 'key')
    await click('rep', 'saved')
    await click('ret', 'ever')
    await frameClick(mission, '#fastbtn')
    await frameClick(mission, '#runbtn')
    // Keep the frame on screen while the day runs: Chromium throttles
    // requestAnimationFrame in a fully offscreen cross-origin frame, and the
    // engine's animations advance on rAF (a reader watching the run is, by
    // definition, looking at it).
    await page.locator('#artB iframe').scrollIntoViewIfNeeded()
    await mission.waitForFunction(
      () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled && document.getElementById('escwrap')!.style.display !== 'none',
      null,
      { timeout: 120_000 },
    )

    // state -> the YOU column, the diagram slots, the ticks.
    await expect(page.locator('#you-th')).toHaveText('YOU')
    await expect(page.locator('#you-c-state')).toHaveText('With the work, one commit, master only')
    await expect(page.locator('#you-c-crash')).toHaveText("Can't half-happen")
    await expect(page.locator('#you-c-rep')).toHaveText('The saved result')
    await expect(page.locator('#you-c-win')).toHaveText('Forever')
    await expect(page.locator('#you-c-breaks')).toHaveText(
      'Key reused · Replica reads · Traffic 10× · Parameters change · Retry after the window',
    )
    await expect(page.locator('#you-d-state')).toHaveText('WITH THE WORK, ONE COMMIT, MASTER ONLY')
    await expect(page.locator('#you-iv-1')).toHaveText('not yet')

    // Commit: locks in the artifact, appears under the YOU diagram, persists.
    await expect(mission.locator('#cmtbox')).toBeVisible()
    await mission.locator('#cmt-input').fill('Commit with the work so half-failures cannot exist.')
    await frameClick(mission, '#cmt-lock')
    await expect(mission.locator('#cmt-locked')).toContainText('"Commit with the work so half-failures cannot exist."')
    await expect(page.locator('#you-commit-foot')).toHaveText('You said: "Commit with the work so half-failures cannot exist."')
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('bs:wall:ambiguous-failure-under-retry') ?? 'null'))
    expect(record).toMatchObject({
      v: 1,
      commit: 'Commit with the work so half-failures cannot exist.',
      checkpoints: { caused: false, survived: true, held: false },
      lastDecisions: { id: 'key', mem: 'acid', read: 'master', cli: 'key', rep: 'saved', ret: 'ever' },
    })
    const types = await page.evaluate(() =>
      (window as unknown as { __msgs: Array<{ type: string }> }).__msgs.map((m) => m.type).filter((t) => t !== 'size'),
    )
    expect(types).toEqual(expect.arrayContaining(['ready', 'touched', 'checkpoint', 'state', 'commit']))

    // Reload: the sentence returns to the page and to the artifact via init.
    await page.reload()
    const mission2 = await waitForMission(page)
    await expect(page.locator('#you-commit-foot')).toHaveText('You said: "Commit with the work so half-failures cannot exist."')
    await expect(mission2.locator('#cmt-locked')).toContainText('"Commit with the work so half-failures cannot exist."', { timeout: 20_000 })
    // The YOU column is per-session (a fresh engine), as in the reference.
    await expect(page.locator('#you-th')).toHaveText(/survive a day first/i)
  })
})

// ---- §5.4 text parity -------------------------------------------------------

// innerText of <main>, with each artifact iframe replaced by a marker the
// caller splices the frame's own innerText into. Runs in the page.
const MAIN_TEXT_WITH_MARKERS = () => {
  const main = document.querySelector('main')!
  const frames = Array.from(main.querySelectorAll('iframe'))
  const markers: HTMLElement[] = []
  frames.forEach((f, i) => {
    const m = document.createElement('div')
    m.textContent = `@@FRAME${i}@@`
    f.parentNode!.insertBefore(m, f)
    markers.push(m)
  })
  const t = main.innerText
  markers.forEach((m) => m.remove())
  return t
}

function normalizeLines(t: string): string[] {
  return t
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
}

// The reference build's lines that the port deliberately does not carry
// (handoff §4G "do not port"): the two proto-notes, the FREE PLAY button,
// the newsletter placeholder. Anything else that differs is a regression.
const EXCLUDED_FIXTURE_LINES = new Set([
  'FREE PLAY: OFF',
  'THE WEEKLY', // uppercased by the block's CSS
  "One problem class per week - the wall, the answers side by side, and one thing to steal. This page's class was Edition 1.",
  'Subscribe',
  'PROTOTYPE - form is a placeholder pending the newsletter account',
])
const EXCLUDED_FIXTURE_PREFIXES = ['PROTOTYPE v6 - priced design space.', 'GATE (future):']

// The three §4G copy decisions, applied to the fixture text so the two
// sides must then match exactly.
function applyCopyDecisions(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]!
    if (l === 'INTERVIEW') l = 'INTERVIEW · 5 MIN' // decision 3 (nav budget)
    l = l.replace(
      'The three cut points are the wall figure above; the three places',
      "The three cut points are the artifact's three cuts; the three places",
    ) // decision 2 (caption)
    // decision 1: the YOU row's vantage "You" -> "Your design" (the .vant
    // cell is uppercased by CSS, so innerText reads "YOU"; the line after
    // "You", "now").
    if (l === 'YOU' && lines[i - 1] === 'now' && lines[i - 2] === 'You') l = 'YOUR DESIGN'
    out.push(l)
  }
  return out
}

test.describe('§5.4 text parity with the reference build', () => {
  test('served page (both frames included) vs problem-page-v7.3.html', async ({ page, browser }) => {
    test.setTimeout(120_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    const tryIt = frameOf(page, 'problem-ambiguous-timeouts-tryit')
    await tryIt.locator('#vcode').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    const withMarkers = await page.evaluate(MAIN_TEXT_WITH_MARKERS)
    const frameTexts = [
      await tryIt.evaluate(() => document.body.innerText),
      await mission.evaluate(() => document.body.innerText),
    ]
    let served = withMarkers
    frameTexts.forEach((t, i) => {
      served = served.replace(`@@FRAME${i}@@`, `\n${t}\n`)
    })
    const servedLines = normalizeLines(served)

    // The fixture, rendered by the same browser (its scripts run; fonts are
    // blocked so the run never waits on the network).
    const ctx = await browser.newContext()
    await ctx.route('**/fonts.googleapis.com/**', (r) => r.abort())
    await ctx.route('**/fonts.gstatic.com/**', (r) => r.abort())
    const fx = await ctx.newPage()
    await fx.goto(`file://${FIXTURE}`)
    await fx.waitForTimeout(500)
    // The reference keeps its filled-state YOU diagram in the DOM behind
    // display:none (innerText still walks SVG text inside it); the port
    // renders that state only once filled. Drop it before extracting.
    const fixtureRaw = await fx.evaluate(() => {
      document.getElementById('you-fill')?.remove()
      return document.querySelector('main')!.innerText
    })
    await ctx.close()
    const fixtureLines = applyCopyDecisions(
      normalizeLines(fixtureRaw).filter(
        (l) => !EXCLUDED_FIXTURE_LINES.has(l) && !EXCLUDED_FIXTURE_PREFIXES.some((p) => l.startsWith(p)),
      ),
    )

    // Order-sensitive, line-for-line. On a mismatch, report the first
    // divergence with context so the regression is legible.
    const n = Math.max(servedLines.length, fixtureLines.length)
    for (let i = 0; i < n; i++) {
      if (servedLines[i] !== fixtureLines[i]) {
        const ctxLines = (arr: string[]) => arr.slice(Math.max(0, i - 2), i + 3).map((l, k) => `${k === Math.min(i, 2) ? '>' : ' '} ${l}`).join('\n')
        throw new Error(
          `text parity diverges at line ${i}\n--- served:\n${ctxLines(servedLines)}\n--- reference:\n${ctxLines(fixtureLines)}`,
        )
      }
    }
    expect(servedLines.length).toBe(fixtureLines.length)
    expect(servedLines.length).toBeGreaterThan(250)
  })
})

// ---- §5.5 no-JS ---------------------------------------------------------------

test.describe('§5.5 no-JS', () => {
  test.use({ javaScriptEnabled: false })

  test('the prerendered copy, both frame fallbacks, and the noscript figure render', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('heading', { level: 1, name: 'Ambiguous failure under retry' })).toBeVisible()
    await expect(page.getByText('Six systems, one diagram - the sixth is yours')).toBeVisible()
    await expect(page.getByText('Every key store is a clock.')).toBeVisible()
    await expect(page.getByText('The difference is the bill. Staff answers have one.')).toBeVisible()
    // One fallback line per artifact position, in the frames' wrappers.
    const fallbacks = page.locator('.artifact-noscript')
    await expect(fallbacks).toHaveCount(2)
    await expect(page.locator('#artifact .artifact-noscript')).toBeVisible()
    await expect(page.locator('#artB .artifact-noscript')).toBeVisible()
    // The noscript wall figure: eyebrow, the SVG, caption.
    await expect(page.locator('figure.pp-figure img')).toBeVisible()
    await expect(page.locator('figure.pp-figure')).toContainText('Three deaths, one symptom', { ignoreCase: true })
    await expect(page.locator('figure.pp-figure')).toContainText("Stripe's 2017 post states it first and cleanest")
  })
})

// ---- §5.6 prerender --------------------------------------------------------------

test('§5.6 prerender: the served HTML carries the copy', async () => {
  const html = readFileSync(DIST_PAGE, 'utf8')
  for (const sentence of [
    'A request that fails cleanly is easy.',
    'Only the caller knows intent - every post that takes a position lands there.',
    'The difference is the bill. Staff answers have one. The bill panel above is yours.',
  ]) {
    expect(html, sentence).toContain(sentence)
  }
  // No client-only surface holds copy hostage: the interview table and the
  // YOU column's empty state are in the HTML too.
  expect(html).toContain('runs after a survived day')
  expect(html).toContain('YOU · survive a day first')
})

// ---- ruling a: mobile scroll chaining ---------------------------------------------

test.describe('mobile: the mission frame is the scrollport and page scroll chains at its edges', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })

  test('90dvh frame, no overscroll-behavior: contain, wheel past either edge moves the page', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    const iframe = page.locator('#artB iframe')
    await expect.poll(() => iframe.evaluate((el) => (el as HTMLElement).style.height)).toBe('90dvh')

    const overscroll = await mission.evaluate(() => [
      getComputedStyle(document.documentElement).overscrollBehaviorY,
      getComputedStyle(document.body).overscrollBehaviorY,
      getComputedStyle(document.getElementById('artB')!).overscrollBehaviorY,
    ])
    expect(overscroll.every((v) => v !== 'contain' && v !== 'none')).toBe(true)

    // Bring the frame's top to the viewport's top, then scroll the frame to
    // its own bottom; a further wheel over the frame must move the page.
    const top = await iframe.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate((y) => window.scrollTo(0, y), top)
    await mission.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(200)
    const box = (await iframe.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(400)
    const after = await page.evaluate(() => window.scrollY)
    expect(after).toBeGreaterThan(before)

    // And back: frame at its top, wheel up over it, the page moves up.
    await page.evaluate((y) => window.scrollTo(0, y + 40), top)
    await mission.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)
    const box2 = (await iframe.boundingBox())!
    await page.mouse.move(box2.x + box2.width / 2, Math.max(10, box2.y + 40))
    const before2 = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, -600)
    await page.waitForTimeout(400)
    const after2 = await page.evaluate(() => window.scrollY)
    expect(after2).toBeLessThan(before2)
  })
})
