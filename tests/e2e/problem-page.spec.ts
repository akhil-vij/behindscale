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

// Set the AWS winning deck (the §5.2 path) and run one day to survival, at 2×.
// Leaves the attacks revealed (#escwrap visible), RUN re-enabled.
async function surviveDay(mission: Frame, page: Page): Promise<void> {
  const click = (k: string, v: string) => frameClick(mission, `#deck button[data-k="${k}"][data-v="${v}"]`)
  await click('id', 'key')
  await click('mem', 'acid')
  await click('cli', 'key')
  await click('rep', 'saved')
  await click('ret', 'ever')
  await frameClick(mission, '#fastbtn')
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
    await expect(page.locator('#you-c-state')).toHaveText('With the work, one commit, master only')
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
    if (l === '2×') l = '1×' // B2-5 (F15): the speed button now reads the current speed
    // B3-2 (F20): the bill moved under the stage in Batch 1, so the DAY SURVIVED
    // narration no longer says "on the right".
    l = l.replace(
      'yours is itemized on the right',
      'yours is itemized in THE BILL under the stage',
    )
    // B2-9.2 (F22): MEMORY's deck label Q-number Q2 -> Q3 (it renders as its own
    // line after the label; READS keeps its own Q2).
    if (l === 'Q2' && (lines[i - 1] ?? '').startsWith('MEMORY')) l = 'Q3'
    // decision 1: the YOU row's vantage "You" -> "Your design" (the .vant
    // cell is uppercased by CSS, so innerText reads "YOU"; the line after
    // "You", "now").
    if (l === 'YOU' && lines[i - 1] === 'now' && lines[i - 2] === 'You') l = 'YOUR DESIGN'
    // B2-9.3 (F22): the "From the full problem page" backlink is hidden when the
    // artifact is embedded on the page, so the served page never shows it.
    l = l.replace(/ ?From the full problem page at behindscale\.com →/, '')
    if (l === '') continue // a line that was only the (now-removed) backlink drops out
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

    // §6 (F18): the ONE new string -- the diagram-row outbound link moved from
    // the <summary> into the body ("Read the article ↗"). It is not in the
    // reference; assert it appears (once per linked company row) and pull it out
    // before the multiset compare, so parity still proves nothing else changed.
    const READ_ARTICLE = 'Read the article ↗'
    expect(servedLines.filter((l) => l === READ_ARTICLE).length).toBeGreaterThan(0)
    const servedForParity = servedLines.filter((l) => l !== READ_ARTICLE)

    // Batch 1 §1 reorders the mission's internal layout (the two-column working
    // surface), so parity is now a MULTISET check: the same lines with the same
    // counts, order-independent. This still catches any added, removed, or
    // DOUBLED line (the hidden-vertical-SVG concern) -- it only tolerates the
    // deliberate reorder. Report the first sorted divergence with context.
    const sortedServed = [...servedForParity].sort()
    const sortedFixture = [...fixtureLines].sort()
    const n = Math.max(sortedServed.length, sortedFixture.length)
    for (let i = 0; i < n; i++) {
      if (sortedServed[i] !== sortedFixture[i]) {
        const ctxLines = (arr: string[]) => arr.slice(Math.max(0, i - 2), i + 3).map((l, k) => `${k === Math.min(i, 2) ? '>' : ' '} ${l}`).join('\n')
        throw new Error(
          `text parity diverges (multiset) at index ${i}\n--- served:\n${ctxLines(sortedServed)}\n--- reference:\n${ctxLines(sortedFixture)}`,
        )
      }
    }
    expect(servedForParity.length).toBe(fixtureLines.length)
    expect(servedForParity.length).toBeGreaterThan(250)
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
  // The mission is visible without JavaScript: the six decision labels and the
  // five attack companies are static text in the outline card. B2-10 (F23)
  // dropped the noscript's duplicate lists, so the contiguous "<label> —
  // <options>" now lives only in the card, which wraps the label in a span.
  for (const label of ['Identity', 'Memory', 'Reads', 'Client on a timeout', 'Reply to a duplicate', 'Window']) {
    expect(html, label).toContain(`>${label}</span> — `)
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
    // (both live in the sticky right column now -- no toast needed).
    const together = await mission.evaluate(() => {
      const vh = window.innerHeight
      const vis = (r: DOMRect) => Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
      const stage = document.getElementById('bstage')!.getBoundingClientRect()
      const card = document.querySelector('#log .bcard')!.getBoundingClientRect()
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
      // Record every transient band label (font-size 10, in the anim layer) as
      // it is inserted, flagging any whose bbox centre falls inside a node rect.
      // Both bboxes are in the SVG's user units, so they compare directly.
      await mission.evaluate(() => {
        const w = window as unknown as { __hits: unknown[] }
        w.__hits = []
        const stage = document.getElementById('bstage')!
        const inside = (cx: number, cy: number, r: { x: number; y: number; width: number; height: number }) =>
          cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height
        const record = (t: Element) => {
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
          if (e.tagName === 'text' && e.getAttribute('font-size') === '10') record(e)
          e.querySelectorAll?.('text[font-size="10"]').forEach(record)
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
      expect(hits, `labels landed on a node rect: ${JSON.stringify(hits)}`).toEqual([])
    })
  }
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
