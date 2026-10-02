import { test, expect, type Frame, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
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

// Set the AWS winning deck (the §5.2 path) and run one day to survival (the 2×
// speed control was removed in the copy pass, so the run is 1×).
// Leaves the attacks revealed (#escwrap visible), RUN re-enabled.
async function surviveDay(mission: Frame, page: Page): Promise<void> {
  const click = (k: string, v: string) => frameClick(mission, `#deck button[data-k="${k}"][data-v="${v}"]`)
  await click('id', 'key')
  await click('mem', 'acid')
  await click('cli', 'key')
  await click('rep', 'saved')
  await click('ret', 'ever')
  await frameClick(mission, '#runbtn')
  await page.locator('#artB iframe').scrollIntoViewIfNeeded()
  await mission.waitForFunction(
    () =>
      !(document.getElementById('runbtn') as HTMLButtonElement).disabled &&
      document.getElementById('escwrap')!.style.display !== 'none',
    null,
    { timeout: 120_000 },
  )
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

    // The AWS deck, window forever (the brief's default path); 1× (the 2× speed
    // control was removed in the copy pass).
    const click = (k: string, v: string) => frameClick(mission, `#deck button[data-k="${k}"][data-v="${v}"]`)
    await click('id', 'key')
    await expect(page.locator('#navdeck')).toBeVisible() // touched -> deck-jump revealed
    await click('mem', 'acid')
    await click('cli', 'key')
    await click('rep', 'saved')
    await click('ret', 'ever')
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
    await expect(page.locator('#you-c-state')).toHaveText('In the same commit as the charge, main database only')
    await expect(page.locator('#you-c-crash')).toHaveText("Can't half-happen")
    await expect(page.locator('#you-c-rep')).toHaveText('The saved response')
    await expect(page.locator('#you-c-win')).toHaveText('Forever')
    await expect(page.locator('#you-c-breaks')).toHaveText(
      'Key reused · Read-only copy reads · Traffic 10× · Details change · Retry after window',
    )
    await expect(page.locator('#you-d-state')).toHaveText('IN THE SAME COMMIT AS THE CHARGE, MAIN DATABASE ONLY')
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
      // B2-1 (F6): the restorable design moved under `saved` (distinct from the
      // write-once checkpoints); `held` is persisted here too, sourced from state.
      saved: {
        decisions: { id: 'key', mem: 'acid', read: 'master', cli: 'key', rep: 'saved', ret: 'ever' },
        survived: true,
      },
    })
    const types = await page.evaluate(() =>
      (window as unknown as { __msgs: Array<{ type: string }> }).__msgs.map((m) => m.type).filter((t) => t !== 'size'),
    )
    expect(types).toEqual(expect.arrayContaining(['ready', 'touched', 'checkpoint', 'state', 'commit']))

    // Reload: B2-1 (F6) restores the design without animating -- the sentence
    // returns to the page and the artifact, AND the YOU column refills from the
    // restored decisions (it no longer resets to "survive a day first").
    await page.reload()
    const mission2 = await waitForMission(page)
    await expect(page.locator('#you-commit-foot')).toHaveText('You said: "Commit with the work so half-failures cannot exist."')
    await expect(mission2.locator('#cmt-locked')).toContainText('"Commit with the work so half-failures cannot exist."', { timeout: 20_000 })
    // The restored design refills the YOU column, and the mission shows the
    // restored survived state (attacks revealed, RESTORED narration).
    await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 20_000 })
    await expect(page.locator('#you-c-state')).toHaveText('In the same commit as the charge, main database only')
    await expect(page.locator('#you-c-win')).toHaveText('Forever')
    await expect(mission2.locator('#escwrap')).toBeVisible()
    await expect(mission2.locator('#narr')).toContainText('RESTORED')
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
  // B3-5 (task 10): the prev/next wall nav is new text with no counterpart in
  // the reference build (the footer sits OUTSIDE <main>, so it's already out).
  main.querySelector('nav[aria-label="More walls"]')?.remove()
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


test.describe('§5.4 text parity (served vs captured baseline)', () => {
  test('served page (both frames included) matches the captured baseline', async ({ page }) => {
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

    // Re-baselined (2026-09 copy pass): the port's v7.3-verbatim comparison
    // shipped; this now guards against ACCIDENTAL future copy drift by comparing
    // the served main text (both frames) to a captured baseline. After an
    // intended copy change, regenerate it: CAPTURE_PARITY=1 npx playwright test.
    const BASELINE = join(process.cwd(), 'tests', 'fixtures', 'ambiguous-timeouts-served.json')
    if (process.env.CAPTURE_PARITY) {
      writeFileSync(BASELINE, JSON.stringify(servedLines, null, 2) + '\n')
      test.info().annotations.push({ type: 'captured', description: `${servedLines.length} lines` })
      return
    }
    const expected: string[] = JSON.parse(readFileSync(BASELINE, 'utf8'))

    // Multiset compare: same lines, same counts, order-independent (Batch-1 §1
    // reorders the two-column working surface). Catches any added, removed, or
    // doubled line; reports the first sorted divergence with context.
    const sortedServed = [...servedLines].sort()
    const sortedExpected = [...expected].sort()
    const n = Math.max(sortedServed.length, sortedExpected.length)
    for (let i = 0; i < n; i++) {
      if (sortedServed[i] !== sortedExpected[i]) {
        const ctxLines = (arr: string[]) => arr.slice(Math.max(0, i - 2), i + 3).map((l, k) => `${k === Math.min(i, 2) ? '>' : ' '} ${l}`).join('\n')
        throw new Error(
          `text parity diverges (multiset) at index ${i}\n--- served:\n${ctxLines(sortedServed)}\n--- baseline:\n${ctxLines(sortedExpected)}`,
        )
      }
    }
    expect(servedLines.length).toBe(expected.length)
    expect(servedLines.length).toBeGreaterThan(250)
  })
})

// ---- §5.5 no-JS ---------------------------------------------------------------

test.describe('§5.5 no-JS', () => {
  test.use({ javaScriptEnabled: false })

  test('the prerendered copy, both frame fallbacks, and the noscript figure render', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('heading', { level: 1, name: 'Ambiguous failure under retry' })).toBeVisible()
    await expect(page.getByText('Five designs and yours, drawn the same way')).toBeVisible()
    await expect(page.getByText("Every key's memory runs out.")).toBeVisible()
    await expect(page.getByText('The difference is the bill. A Staff answer comes with one.')).toBeVisible()
    // The orientation follow-up: the strip, the composed sentence, the
    // outline card -- all static.
    await expect(page.locator('#howitworks')).toHaveText('Cause it · Build it · Survive a day · Compare with five real systems')
    await expect(page.getByText("Now let's design the solution", { exact: false })).toBeVisible()
    const outline = page.locator('#mission-outline')
    await expect(outline).toContainText("What's inside the mission", { ignoreCase: true })
    await expect(outline).toContainText('Your six decisions')
    await expect(outline).toContainText('Client: generates and sends an idempotency key')
    await expect(outline).toContainText('The day, six events')
    await expect(outline).toContainText('Five attacks, from the posts')
    await expect(outline).toContainText('Airbnb 2019: reads moved to a read-only copy')
    // Polish §2: decision labels link to their comparison rows (no visible
    // Q marker); ON A TIMEOUT has no row, so it stays plain text.
    await expect(outline.locator('a.mo-dlabel')).toHaveCount(5)
    await expect(outline.locator('a.mo-dlabel[href="#q1"]')).toHaveText('IDENTITY: who names the request?')
    await expect(outline.locator('span.mo-dlabel')).toHaveText('ON A TIMEOUT: the client…')
    await expect(outline.locator('.mo-opts li')).toHaveCount(18)
    await expect(outline.locator('.mo-flat li')).toHaveCount(11)
    await expect(outline).not.toContainText('Q1')
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
      'Without JavaScript: this artifact lets you cut a $100 charge at three points (request lost, crash mid-charge, reply lost) and choose what the client does next.',
    )
    const missionFallback = page.locator('#artB .artifact-noscript')
    await expect(missionFallback).toBeVisible()
    // B2-10 (F23): the mission fallback dropped its duplicate lists (the
    // "What's inside the mission" card above already carries them) and keeps
    // one line plus a pointer to that card.
    await expect(missionFallback).toContainText(
      'See "What\'s inside the mission" above for the decisions, the day\'s events, and the attacks.',
    )
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
    'A request that returns a clear error is easy.',
    'Only the caller knows what it meant to do, and every post that takes a position agrees.',
    'The difference is the bill. A Staff answer comes with one. The bill in the mission above is yours.',
  ]) {
    expect(html, sentence).toContain(sentence)
  }
  // No client-only surface holds copy hostage: the interview table and the
  // YOU column's empty state are in the HTML too.
  expect(html).toContain('runs after a survived day')
  expect(html).toContain('YOU · survive a day first')
  // The mission is visible without JavaScript: the six decision labels and the
  // five attack companies are static text in the outline card. B2-10 (F23)
  // dropped the noscript's duplicate lists, so the decision lists live only
  // in the card: each label is its own element (a link to its comparison row,
  // or a span), followed by one <li> per option.
  for (const label of ['IDENTITY: who names the request?', 'MEMORY: how the server remembers a request it already handled', 'READS: which copy the server checks for the key', 'ON A TIMEOUT: the client…', 'REPLY: when the server sees a repeat, it sends back…', 'WINDOW: how long the key store remembers each idempotency key']) {
    expect(html, label).toMatch(new RegExp(`>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</(a|span)><ul class="mo-opts"><li>`))
  }
  for (const attack of ['Stripe 2017: a reused key', 'Airbnb 2019: reads moved to a read-only copy', 'Segment 2017: traffic 10× for a week', 'AWS 2021: a known key with a different amount', 'Shopify 2022: a retry after the window']) {
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

test.describe('mobile (§2): the mission frame is content-height and the page (not the frame) scrolls', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })

  test('content-height frame (no 90dvh inner scroll), scroll chaining stays on', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    const iframe = page.locator('#artB iframe')
    // §2: the 90dvh scrollport is gone -- the frame takes its natural (content)
    // height, a px value from the size message, so the page scrolls, not the
    // frame. RUN is then reachable by scrolling the PAGE, never a box inside it.
    await expect.poll(() => iframe.evaluate((el) => (el as HTMLElement).style.height)).toMatch(/^\d+px$/)
    const innerScroll = await mission.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(innerScroll).toBeLessThanOrEqual(2)

    // Scroll chaining stays on (no overscroll-behavior: contain/none anywhere).
    const overscroll = await mission.evaluate(() => [
      getComputedStyle(document.documentElement).overscrollBehaviorY,
      getComputedStyle(document.body).overscrollBehaviorY,
      getComputedStyle(document.getElementById('artB')!).overscrollBehaviorY,
    ])
    expect(overscroll.every((v) => v !== 'contain' && v !== 'none')).toBe(true)
  })

  test('§2 order: stage sits above the deck; RUN is reachable without an inner scroll', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    // Phone reading order: the stage (right column) comes before the deck (left
    // column). Cards land under the controls the reader just used.
    const order = await mission.evaluate(() => ({
      stage: document.getElementById('bstage')!.getBoundingClientRect().top,
      run: document.getElementById('runbtn')!.getBoundingClientRect().top,
      deck: document.getElementById('deck')!.getBoundingClientRect().top,
    }))
    expect(order.stage).toBeLessThan(order.deck)
    expect(order.run).toBeLessThan(order.deck)
  })

  test('§2/A3 accordion: one group open at a time; it survives a decision click', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    const openCount = () => mission.locator('#deck .kg:not(.collapsed)').count()
    // On phone the deck is an accordion: exactly one group open at load.
    expect(await openCount()).toBe(1)
    await expect(mission.locator('#deck #kg-id')).not.toHaveClass(/collapsed/)
    // A decision click inside the open group leaves it open (openGroup survives
    // the paintDeck rebuild) -- and still exactly one group open.
    await frameClick(mission, '#deck button[data-k="id"][data-v="key"]')
    await mission.waitForTimeout(120)
    expect(await openCount()).toBe(1)
    await expect(mission.locator('#deck #kg-id')).not.toHaveClass(/collapsed/)
    // Opening another group via its header closes the previous (one at a time).
    await frameClick(mission, '#deck #kg-mem .kgl')
    await mission.waitForTimeout(120)
    expect(await openCount()).toBe(1)
    await expect(mission.locator('#deck #kg-mem')).not.toHaveClass(/collapsed/)
    await expect(mission.locator('#deck #kg-id')).toHaveClass(/collapsed/)
    // Polish: a collapsed header's chosen value is nowrap; it must truncate,
    // never widen the deck past the frame (it once scrolled 591px in 350).
    const widths = await mission.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(widths[0]).toBeLessThanOrEqual(widths[1])
  })
})

test.describe('desktop (§1): the sticky working column keeps the stage in view', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('F1/F2: the frame is a bounded scrollport; the newest card sits beside the stage', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    // §1: on desktop the frame is a bounded scrollport, min(content, 100dvh-56),
    // NOT content-height -- that is what lets the right column's sticky engage.
    await expect
      .poll(() => page.locator('#artB iframe').evaluate((el) => (el as HTMLElement).style.height))
      .toContain('min(')
    await surviveDay(mission, page)
    // Scroll chaining stays on for the desktop scroll-in-scroll too.
    const overscroll = await mission.evaluate(() => [
      getComputedStyle(document.documentElement).overscrollBehaviorY,
      getComputedStyle(document.getElementById('artB')!).overscrollBehaviorY,
    ])
    expect(overscroll.every((v) => v !== 'contain' && v !== 'none')).toBe(true)
    // F2: the newest card is visible in the frame at the same time as the stage
    // (it sits in #slot, in the sticky right column -- no toast needed).
    const together = await mission.evaluate(() => {
      const vh = window.innerHeight
      const vis = (r: DOMRect) => Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
      const stage = document.getElementById('bstage')!.getBoundingClientRect()
      const card = document.querySelector('#slot .bcard')!.getBoundingClientRect() // the slot holds the newest card
      return vis(stage) >= stage.height * 0.8 && vis(card) > 0
    })
    expect(together).toBe(true)
  })

  test.describe('F1 in numbers, 1440x757', () => {
    test.use({ viewport: { width: 1440, height: 757 } })

    test('scrolling the left column to A5 keeps the stage >=80% visible when watch is clicked', async ({ page }) => {
      test.setTimeout(120_000)
      // Pre-seed a survived design with A1..A4 held, so restore() unlocks A5's
      // "watch" without replaying every attack (the design is real; only the
      // starting point is seeded).
      await page.addInitScript(() => {
        localStorage.setItem(
          'bs:wall:ambiguous-failure-under-retry',
          JSON.stringify({
            v: 1,
            commit: 'seed',
            checkpoints: { caused: true, survived: true, held: false },
            saved: {
              decisions: { id: 'key', mem: 'acid', read: 'master', cli: 'key', rep: 'saved', ret: 'ever' },
              survived: true,
              held: [true, true, true, true, false],
            },
          }),
        )
      })
      await page.goto(PAGE)
      const mission = await waitForMission(page)
      await expect(mission.locator('#escwrap')).toBeVisible()
      await mission.locator('#lvls .lvl').nth(4).locator('.watch').waitFor({ state: 'visible' })
      // Let the size handshake settle (the mission re-posts size on a short
      // schedule), then assert the frame height is stable -- no runaway
      // resize loop from the sticky column / dvh recompute.
      await page.waitForTimeout(1600)
      const frameH = () => page.locator('#artB iframe').evaluate((el) => el.getBoundingClientRect().height)
      const h1 = await frameH()
      await page.waitForTimeout(600)
      expect(Math.abs((await frameH()) - h1)).toBeLessThanOrEqual(1)
      // Scroll the LEFT column (inside the frame) down to A5 -- instant scroll
      // inside the frame's own scrollport (scrollIntoViewIfNeeded's stability
      // wait fights the frame's periodic size re-posts).
      await mission.evaluate(() => {
        const w = document.querySelectorAll('#lvls .lvl')[4]?.querySelector('.watch') as HTMLElement | null
        w?.scrollIntoView({ block: 'center' })
      })
      await mission.waitForTimeout(300)
      const stageVisible = () =>
        mission.evaluate(() => {
          const s = document.getElementById('bstage')!.getBoundingClientRect()
          const vh = window.innerHeight
          return (Math.min(s.bottom, vh) - Math.max(s.top, 0)) / s.height
        })
      expect(await stageVisible()).toBeGreaterThanOrEqual(0.8)
      // Click watch: the attack plays on a stage that is still on screen (F1).
      await frameClick(mission, '#lvls .lvl:nth-child(5) .watch')
      await mission.waitForTimeout(300)
      expect(await stageVisible()).toBeGreaterThanOrEqual(0.8)
    })
  })
})

test.describe('§3 (F9): transient stage labels stay in their bands, never on a node', () => {
  for (const geom of [
    { name: 'GH desktop', width: 1200, height: 900 },
    { name: 'GV phone', width: 390, height: 780 },
  ]) {
    test(`${geom.name}: no band label's centre lands inside a node rect`, async ({ page }) => {
      test.setTimeout(150_000)
      await page.setViewportSize({ width: geom.width, height: geom.height })
      await page.goto(PAGE)
      const mission = await waitForMission(page)
      // Record every transient band label (class blab, in the anim layer) as
      // it is inserted, flagging any whose bbox centre falls inside a node rect.
      // Both bboxes are in the SVG's user units, so they compare directly.
      await mission.evaluate(() => {
        const w = window as unknown as { __hits: unknown[]; __seen: number }
        w.__hits = []
        w.__seen = 0
        const stage = document.getElementById('bstage')!
        const inside = (cx: number, cy: number, r: { x: number; y: number; width: number; height: number }) =>
          cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height
        const record = (t: Element) => {
          w.__seen++
          const bb = (t as unknown as SVGGraphicsElement).getBBox()
          const cx = bb.x + bb.width / 2
          const cy = bb.y + bb.height / 2
          const boxes = Array.from(stage.querySelectorAll('rect.nodebox')).map((r) =>
            (r as unknown as SVGGraphicsElement).getBBox(),
          )
          for (const r of boxes) if (inside(cx, cy, r)) w.__hits.push({ text: t.textContent, cx, cy })
        }
        const scan = (n: Node) => {
          if (n.nodeType !== 1) return
          const e = n as Element
          if (e.tagName === 'text' && e.classList.contains('blab')) record(e)
          e.querySelectorAll?.('text.blab').forEach(record)
        }
        new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(scan))).observe(stage, {
          childList: true,
          subtree: true,
        })
      })
      // A memory-bearing design exercises both the wire band (crash / dropped /
      // reply lost / reply verdict) and the memory band (seen it / never seen).
      await surviveDay(mission, page)
      const hits = await mission.evaluate(() => (window as unknown as { __hits: unknown[] }).__hits)
      // non-vacuous: the day must actually have drawn band labels
      expect(await mission.evaluate(() => (window as unknown as { __seen: number }).__seen)).toBeGreaterThan(3)
      expect(hits, `labels landed on a node rect: ${JSON.stringify(hits)}`).toEqual([])
    })
  }
})

// Mission stage + card log spec (2026-09-30), owner-corrected: the newest
// card sits in #slot beside the stage (never scrolling inside itself, source
// line kept); every card is appended to the full list below both columns, in
// order; at day end the slot shows the day's result; THE BILL renders full
// width below the columns; stage text lands at >= 11px (13px titles).
async function runNaiveDay(mission: Frame, page: Page): Promise<void> {
  // the frame is sandboxed (cross-origin): Chrome pauses its rAF off-screen
  await page.locator('#artB iframe').scrollIntoViewIfNeeded()
  await frameClick(mission, '#runbtn')
  await mission.waitForFunction(
    () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled && /\d/.test(document.getElementById('m-dbl')!.textContent!),
    null,
    { timeout: 120_000 },
  )
}
async function recordSlot(mission: Frame): Promise<void> {
  await mission.evaluate(() => {
    const w = window as unknown as { __slot: { n: number; code: string; last: string; scrolls: boolean; logN: number }[] }
    w.__slot = []
    const slot = document.getElementById('slot')!
    new MutationObserver(() => {
      const log = document.querySelectorAll('#log .bcard')
      w.__slot.push({
        n: slot.querySelectorAll('.bcard').length,
        code: slot.querySelector('.code')?.textContent ?? '',
        last: log.length ? log[log.length - 1].querySelector('.code')!.textContent! : '',
        scrolls: slot.scrollHeight > slot.clientHeight + 1,
        logN: log.length,
      })
    }).observe(slot, { childList: true })
  })
}
async function minStageText(mission: Frame): Promise<{ body: number; title: number }> {
  return mission.evaluate(() => {
    const svg = document.getElementById('bstage') as unknown as SVGSVGElement
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
    let body = Infinity, title = Infinity
    for (const t of Array.from(svg.querySelectorAll('text'))) {
      if (!t.textContent!.trim() || t.textContent!.trim() === '#') continue // the hash glyph is an icon inside the 16px dot
      const px = parseFloat(getComputedStyle(t).fontSize) * scale
      if (t.classList.contains('nlab')) title = Math.min(title, px)
      else body = Math.min(body, px)
    }
    return { body, title }
  })
}

test.describe('card slot + full list (mission stage + card log spec)', () => {
  test.use({ reducedMotion: 'reduce' })

  test('desktop 1440: one newest card in the slot, the full list in order, results + THE BILL below', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    await recordSlot(mission)
    await runNaiveDay(mission, page)
    const rec = await mission.evaluate(() => (window as unknown as { __slot: { n: number; code: string; last: string; scrolls: boolean; logN: number }[] }).__slot)
    const events = rec.filter((r) => r.code !== 'DAY OVER' && r.n > 0)
    expect(events.length).toBeGreaterThan(1)
    // during the day: exactly one card in the slot, and it is the newest one
    for (const r of rec.filter((r) => r.n > 0)) expect(r.n).toBe(1)
    for (const r of events) expect(r.code).toBe(r.last)
    // the full list holds every card fired, in the order they fired
    const fired = events.map((r) => r.code) // one slot mutation per card() call
    const listed = await mission.locator('#log .bcard .code').allTextContents()
    expect(listed).toEqual(fired)
    // the slot never scrolls inside itself; the event cards keep their source line
    expect(rec.every((r) => !r.scrolls)).toBe(true)
    // after a damaged day: the day-over summary + "all N cards"
    await expect(mission.locator('#slot .code')).toHaveText('DAY OVER')
    await expect(mission.locator('#slot .sjump')).toHaveText(`all ${listed.length} cards ↓`)

    await surviveDay(mission, page)
    await expect(mission.locator('#slot .bcard')).toHaveCount(1)
    await expect(mission.locator('#slot .code')).toHaveText('DAY SURVIVED')
    await expect(mission.locator('#slot .sjump')).toHaveText('THE BILL ↓')
    // THE BILL is full width below both columns, above the card list
    const geo = await mission.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      return { grid: r('.mission-grid'), bill: r('#bill'), list: r('#fulllog'), slotScrolls: document.getElementById('slot')!.scrollHeight > document.getElementById('slot')!.clientHeight + 1 }
    })
    expect(Math.abs(geo.bill.width - geo.grid.width)).toBeLessThan(2)
    expect(geo.bill.top).toBeGreaterThanOrEqual(geo.grid.bottom)
    expect(geo.list.top).toBeGreaterThan(geo.bill.top)
    expect(geo.slotScrolls).toBe(false)
    // the jump: on desktop the frame scrolls itself to THE BILL
    const before = await mission.evaluate(() => window.scrollY)
    await frameClick(mission, '#slot .sjump')
    await mission.waitForFunction((y) => window.scrollY > y + 20, before, { timeout: 5_000 })
    await mission.waitForFunction(() => { const b = document.getElementById('bill')!.getBoundingClientRect(); return b.top >= 0 && b.top < innerHeight / 2 }, null, { timeout: 5_000 })
    // stage text floor at 1440
    const px = await minStageText(mission)
    expect(px.body).toBeGreaterThanOrEqual(11)
    expect(px.title).toBeGreaterThanOrEqual(13)
  })

  test('phone 390: the slot sits under the stage; "all N cards" scrolls the host page to the list', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    await runNaiveDay(mission, page)
    const order = await mission.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      return { stageBottom: r('.bstagewrap').bottom, slotTop: r('#slot').top, deckTop: r('#deck').top, listTop: r('#fulllog').top }
    })
    expect(order.slotTop).toBeGreaterThan(order.stageBottom)
    expect(order.deckTop).toBeGreaterThan(order.slotTop)
    expect(order.listTop).toBeGreaterThan(order.deckTop)
    await expect(mission.locator('#slot .bcard')).toHaveCount(1)
    // the frame is content-height on phone: the jump goes through the host
    await frameClick(mission, '#slot .sjump')
    await expect
      .poll(async () => {
        const frameTop = await page.locator('#artB iframe').evaluate((el) => el.getBoundingClientRect().top)
        const listTop = await mission.evaluate(() => document.getElementById('fulllog')!.getBoundingClientRect().top)
        return frameTop + listTop
      }, { timeout: 5_000 })
      .toBeLessThan(844 * 0.6)
    // stage text floor at 390
    const px = await minStageText(mission)
    expect(px.body).toBeGreaterThanOrEqual(11)
    expect(px.title).toBeGreaterThanOrEqual(13)
  })
})

test.describe('§3b verticals live: DV/TV replace the scrolling horizontals under 700px', () => {
  test.use({ viewport: { width: 390, height: 780 } })

  test('comparison + try-it show the vertical variant; the YOU vertical fills', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    // A comparison diagram row swaps to its vertical (DV) SVG; the horizontal
    // (and its scroll pill) is display:none.
    const row = page.locator('.anat-row.has-vert').first()
    await expect(row.locator('.anat-vert')).toBeVisible()
    await expect(row.locator('.anat-scroll')).toBeHidden()
    // The vertical fits its column: it must not inherit the horizontal's 560px
    // floor, which drew it wider than the phone and made the page scroll
    // sideways. Every row is opened so all six verticals are measured.
    const fit = await page.evaluate(() => {
      document.querySelectorAll<HTMLDetailsElement>('details.anat-row').forEach((d) => (d.open = true))
      const over = [...document.querySelectorAll('.anat-vert')].filter((v) => {
        const svg = v.querySelector('svg')
        return svg !== null && svg.getBoundingClientRect().width > v.clientWidth + 1
      }).length
      return { verticals: document.querySelectorAll('.anat-vert svg').length, over, pageW: document.documentElement.scrollWidth, innerW: window.innerWidth }
    })
    expect(fit.verticals).toBe(6)
    expect(fit.over).toBe(0)
    expect(fit.pageW).toBeLessThanOrEqual(fit.innerW)
    // The try-it frame (iframe < 700 here) shows the vertical (TV) wire.
    const tryIt = frameOf(page, 'problem-ambiguous-timeouts-tryit')
    await expect(tryIt.locator('svg.stage.stage-v')).toBeVisible()
    await expect(tryIt.locator('svg.stage:not(.stage-v)')).toBeHidden()
    // After a survived day, the YOU vertical fills from the mapped decisions
    // ({{dState}} etc., not left blank).
    await surviveDay(mission, page)
    const youVert = page.locator('#you-row .anat-vert')
    await expect(youVert).toBeVisible()
    await expect(youVert).toContainText(/commit/i)
  })
})
