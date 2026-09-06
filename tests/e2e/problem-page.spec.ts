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
//         vs the reference build, with only the three §4G copy decisions,
//         the excluded blocks, and the 2026-09-06 orientation follow-up
//         (the "how this page works" strip, the composed decisions
//         sentence, the mission outline card) allowed to differ
//   §5.5  no-JS: the copy renders, each frame position shows its fallback
//         (the mission's carries the static outline), the noscript wall
//         figure shows
//   §5.6  prerender: known sentences, the six decision labels and the five
//         attack companies in dist/problems/ambiguous-timeouts.html
//   decide: a "Which answer is yours" row highlights its column(s)
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
  // The orientation follow-up's two static blocks (items 1 and 3a) have no
  // counterpart in the reference build; item 2 is a rewrite handled below.
  main.querySelector('#howitworks')?.remove()
  main.querySelector('#mission-outline')?.remove()
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

// The Build intro's first sentence, rewritten by the orientation follow-up
// (item 2): the shell composes it from `mission.decisionsSummary`.
const BUILD_INTRO_OLD =
  "Now take the designer's: the six decisions below are yours, and the goal is a day of traffic, survived."
const BUILD_INTRO_NEW =
  "Now take the designer's. Six decisions are yours — who names the operation, where its memory lives, which copy of the database answers, what the client does on a timeout, what a duplicate hears, and how long the memory lasts — and the goal is a day of traffic, survived."

// The three §4G copy decisions (+ the follow-up's rewritten sentence),
// applied to the fixture text so the two sides must then match exactly.
function applyCopyDecisions(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i]!
    if (l === 'INTERVIEW') l = 'INTERVIEW · 5 MIN' // decision 3 (nav budget)
    l = l.replace(BUILD_INTRO_OLD, BUILD_INTRO_NEW) // follow-up item 2
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
    // The orientation follow-up: the strip, the composed sentence, the
    // outline card -- all static.
    await expect(page.locator('#howitworks')).toHaveText('Cause it · Build it · Survive a day · Compare with five real systems')
    await expect(page.getByText(BUILD_INTRO_NEW, { exact: false })).toBeVisible()
    const outline = page.locator('#mission-outline')
    await expect(outline).toContainText("What's inside the mission", { ignoreCase: true })
    await expect(outline).toContainText('Your six decisions')
    await expect(outline).toContainText('Identity — nobody names it · the server hashes the parameters · the caller sends a key')
    await expect(outline).toContainText('The day, six events')
    await expect(outline).toContainText('Five attacks, from the posts')
    await expect(outline).toContainText('Stripe 2017, a reused key · Airbnb 2019, reads moved to a replica')
    await expect(outline).toContainText('your design becomes the sixth column in the comparison below.')
    // One fallback per artifact position, in the frames' wrappers; the
    // mission's carries the same outline as plain text.
    const fallbacks = page.locator('.artifact-noscript')
    await expect(fallbacks).toHaveCount(2)
    // The prerendered frames are hidden without scripting (no dark empty box
    // above the fallback).
    await expect(page.locator('#artifact iframe')).toBeHidden()
    await expect(page.locator('#artB iframe')).toBeHidden()
    await expect(page.locator('#artifact .artifact-noscript')).toBeVisible()
    await expect(page.locator('#artifact .artifact-noscript')).toContainText(
      'Without JavaScript: this artifact lets you cut a $100 charge at three points — request lost, server dies mid-work, reply lost — and choose what the client does next.',
    )
    const missionFallback = page.locator('#artB .artifact-noscript')
    await expect(missionFallback).toBeVisible()
    await expect(missionFallback).toContainText('This is an interactive mission. Without JavaScript, here is what it asks you to decide, what happens during the day, and what attacks your design.')
    await expect(missionFallback).toContainText('Window — one minute · about 24 hours · size-bound · forever')
    await expect(missionFallback).toContainText('Routine traffic · a dropped request · a crash mid-charge · a lost reply · two identical orders · a late retry')
    await expect(missionFallback).toContainText('Shopify 2022, a retry after the window')
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
  // The mission is visible without JavaScript: the six decision labels and
  // the five attack companies are static text (the outline card + noscript).
  for (const label of ['Identity', 'Memory', 'Reads', 'Client on a timeout', 'Reply to a duplicate', 'Window']) {
    expect(html, label).toContain(`${label} — `)
  }
  for (const attack of ['Stripe 2017, a reused key', 'Airbnb 2019, reads moved to a replica', 'Segment 2017, traffic 10× for a week', 'AWS 2021, a known key with a different amount', 'Shopify 2022, a retry after the window']) {
    expect(html, attack).toContain(attack)
  }
  expect(html).toContain('Cause it · Build it · Survive a day · Compare with five real systems')
})

// ---- decide rows -> at-a-glance columns ----------------------------------------

test.describe('decide: a "Which answer is yours" row highlights its column(s)', () => {
  test('click lights the header + every cell; same row clears; another row switches; the table scrolls into view', async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForLoadState('networkidle')
    const rows = page.locator('.decide .drow')
    await expect(rows).toHaveCount(4)
    const lit = () => page.locator('#glance .col-hl').evaluateAll((els) => els.map((el) => el.getAttribute('data-col')))
    await expect.poll(lit).toEqual([])

    // Row 1 -> Stripe + AWS: the two headers and every cell in both columns.
    await rows.nth(0).scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.scrollY)
    await rows.nth(0).click()
    await expect(rows.nth(0)).toHaveAttribute('aria-pressed', 'true')
    const rowCount = await page.locator('#glance tbody tr').count()
    await expect.poll(async () => (await lit()).filter((c) => c === 'Stripe').length).toBe(rowCount + 1)
    await expect.poll(async () => (await lit()).filter((c) => c === 'AWS').length).toBe(rowCount + 1)
    await expect.poll(async () => new Set(await lit())).toEqual(new Set(['Stripe', 'AWS']))
    // The table sat above the viewport (the guide follows the hint sheet), so
    // the page scrolled up to it -- through window.scrollTo, offset for the nav.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before)
    await expect.poll(() => page.locator('#glance').evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0)

    // Same row again clears; another row switches.
    await rows.nth(0).click()
    await expect(rows.nth(0)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(lit).toEqual([])
    await rows.nth(1).click()
    await expect.poll(async () => new Set(await lit())).toEqual(new Set(['Airbnb']))
    await rows.nth(3).click()
    await expect.poll(async () => new Set(await lit())).toEqual(new Set(['Segment']))
    // A link inside a row still navigates rather than toggling.
    const href = await rows.nth(2).locator('a').first().getAttribute('href')
    expect(href).toMatch(/^\/articles\//)
  })
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
