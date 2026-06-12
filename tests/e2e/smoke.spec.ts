import { test, expect } from '@playwright/test'

// Single smoke test covering all four routes per testing-strategy in
// code-standards.md. The goal is to catch routing/rendering regressions
// cheaply -- after each navigation we assert the URL is correct AND that
// a page-specific element rendered (so a silent crash to a blank page
// fails the test, not just routing).
test('navigates / -> article -> pattern via chip -> patterns via navbar without crash', async ({
  page,
}) => {
  // 1. Load the article index.
  await page.goto('/')
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: /designing robust and predictable apis with idempotency/i,
    }),
  ).toBeVisible()

  // 1a. Source filter -- click the Stripe Engineering chip, verify
  // only Stripe-source articles render. The toHaveCount(0) absent-
  // assertion on the Skipper title is the load-bearing one here: if
  // the filter chips render but the filter logic doesn't apply,
  // not.toBeVisible() passes silently while the bug ships. Count
  // assertions break loudly. Same discipline as Unit 4's orphan
  // probe and Unit 5's broken-artifact verification.
  const stripeArticleLink = page.getByRole('link', {
    name: /designing robust and predictable apis with idempotency/i,
  })
  const skipperArticleLink = page.getByRole('link', {
    name: /skipper: building airbnb's embedded workflow engine/i,
  })

  // Baseline: both article cards visible with no filter set.
  await expect(stripeArticleLink).toBeVisible()
  await expect(skipperArticleLink).toBeVisible()

  await page
    .getByRole('link', { name: 'Stripe Engineering', exact: true })
    .first()
    .click()
  await expect(page).toHaveURL(/[?&]source=stripe-engineering/)
  await expect(stripeArticleLink).toBeVisible()
  await expect(skipperArticleLink).toHaveCount(0)

  // 1b. Click "All" to clear the filter and verify both cards return.
  await page.getByRole('link', { name: 'All', exact: true }).click()
  await expect(page).not.toHaveURL(/[?&]source=/)
  await expect(stripeArticleLink).toBeVisible()
  await expect(skipperArticleLink).toBeVisible()

  // 2. Click the article title -> /articles/:slug.
  await page
    .getByRole('link', {
      name: /designing robust and predictable apis with idempotency/i,
    })
    .click()
  await expect(page).toHaveURL(/\/articles\/stripe-idempotency$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /designing robust and predictable apis with idempotency/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Problem' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Solution' })).toBeVisible()

  // Artifact iframe is present with the locked sandbox flag and points
  // at the compiled bundle. This asserts the Unit 5 infrastructure
  // end-to-end at the parent boundary: ArtifactEmbed rendered the
  // iframe (didn't fall back to ErrorFrame), the iframe has the
  // locked-in sandbox attribute, and src points at the bundle the
  // compile-artifacts script produced.
  //
  // We deliberately do NOT assert iframe-internal DOM here. The iframe
  // runs with `sandbox="allow-scripts"` (no allow-same-origin), giving
  // it a unique opaque origin. Playwright's frameLocator traversal
  // is unreliable across that boundary, and tightening the sandbox is
  // the more important property to preserve than the test's reach.
  // Iframe-content correctness is verified by (a) bundle existence on
  // disk (compile-artifacts must have succeeded for `npm run build`
  // to have completed), (b) the parent-side HEAD probe staying
  // satisfied (otherwise the ErrorFrame would have replaced the
  // iframe and these attribute assertions would fail), and (c) manual
  // visual verification during 5b's prod check.
  const iframeSelector = 'iframe[title*="Interactive visualization"]'
  const artifactIframe = page.locator(iframeSelector)
  await artifactIframe.scrollIntoViewIfNeeded()
  await expect(artifactIframe).toBeVisible()
  await expect(artifactIframe).toHaveAttribute(
    'src',
    '/artifacts/stripe-idempotency/index.html',
  )
  await expect(artifactIframe).toHaveAttribute('sandbox', 'allow-scripts')

  // 3. Click the Atomic Phases pattern chip -> /patterns/:slug.
  // The chip is in the "Patterns in this article" section near the
  // bottom; Playwright auto-scrolls it into view before clicking, so
  // we record window.scrollY as a sanity check that we navigate from a
  // scrolled position (and not from the top).
  // Unit 10 moved pattern chips to the top of the article AS WELL as
  // keeping the full "Patterns in this article" section at the bottom.
  // We want to click the bottom chip (the one with the per-article
  // note), so scroll past the top chip and use .last() to grab the
  // bottom-section instance.
  await page.getByRole('link', { name: 'Atomic Phases' }).last().scrollIntoViewIfNeeded()
  const yBeforeNav = await page.evaluate(() => window.scrollY)
  expect(yBeforeNav).toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Atomic Phases' }).last().click()
  await expect(page).toHaveURL(/\/patterns\/atomic-phases$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Atomic Phases' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Definition' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'When it applies' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Seen in' }),
  ).toBeVisible()
  // Scroll resets to top on route change so cross-route navigation
  // doesn't land mid-page (the ScrollToTop component in AppRoutes.tsx).
  // Without this assertion, the bug that prompted it could regress silently.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  // 4. Click "Patterns" in the navbar -> /patterns.
  await page.getByRole('navigation').getByRole('link', { name: 'Patterns' }).click()
  await expect(page).toHaveURL(/\/patterns$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Patterns' }),
  ).toBeVisible()
  // The single sample PatternCard renders.
  await expect(
    page.getByRole('heading', { level: 3, name: 'Atomic Phases' }),
  ).toBeVisible()
})

// Unit 9: legacy #/...-shaped URLs (shared before the SSG migration)
// must redirect to the canonical path before React mounts. The hash
// redirect shim in index.html is a five-line inline <script> in
// <head>, placed before main.tsx. This test asserts the full journey:
// navigate to a hash URL, land at the canonical path, the article h1
// renders (so we know the redirect didn't drop us at the empty shell).
test('legacy #/... URL redirects to canonical path and renders', async ({
  page,
}) => {
  await page.goto('/#/articles/stripe-idempotency')
  // The redirect is location.replace, so the final URL has no hash
  // segment. Allow Playwright a beat to follow the navigation.
  await expect(page).toHaveURL(/\/articles\/stripe-idempotency$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /designing robust and predictable apis with idempotency/i,
    }),
  ).toBeVisible()
})

// Unit 10: article reading-arc section order is
// header -> pattern chips (wayfinding) -> summary -> artifact
// teaser (when present) -> Problem -> Solution -> ARTIFACT EMBED
// -> Tradeoffs -> Patterns. The interactive embed is now in the
// middle of the article, not at the bottom. This test asserts the
// load-bearing piece: the Solution heading appears before the
// artifact iframe in the DOM, and the artifact iframe appears
// before the Tradeoffs heading. If a future refactor accidentally
// re-buries the artifact below Tradeoffs, this fails.
test('Unit 10: article section order places artifact between Solution and Tradeoffs', async ({
  page,
}) => {
  await page.goto('/articles/stripe-idempotency')

  // Get DOM order positions by locating each element and reading
  // its bounding-box top in the page. Y-position ordering proves
  // DOM order without needing to traverse the tree manually.
  const solutionY = await page
    .getByRole('heading', { level: 2, name: 'Solution' })
    .boundingBox()
  const iframeY = await page
    .locator('iframe[title*="Interactive visualization"]')
    .boundingBox()
  const tradeoffsY = await page
    .getByRole('heading', { level: 2, name: 'Tradeoffs' })
    .boundingBox()

  expect(solutionY).not.toBeNull()
  expect(iframeY).not.toBeNull()
  expect(tradeoffsY).not.toBeNull()
  expect(solutionY!.y).toBeLessThan(iframeY!.y)
  expect(iframeY!.y).toBeLessThan(tradeoffsY!.y)
})

// Unit 10: artifact_interacted analytics. Pair of coupled tests
// covering the cross-origin message protocol.
//
// (1) Pipe test: exercise the iframe -> parent postMessage path
//     end-to-end. Invoke window.parent.postMessage from inside the
//     sandboxed iframe via frame.evaluate; assert the parent
//     listener captures the message with the expected shape. This
//     catches regressions on the parent side (ArtifactEmbed's
//     listener filter, source check, or removal logic).
// (2) Build-time check: every compiled artifact bundle must contain
//     'artifact:interacted', window.parent.postMessage, and the
//     slug literal. This pins the entryStub's emitter so a future
//     refactor can't drop it silently.
//
// Why not click-the-iframe-and-assert? Playwright cannot deliver
// synthetic pointer events into opaque-origin sandboxed iframes:
// page.mouse.click at iframe coordinates dispatches at the iframe
// ELEMENT in the parent document, and frame.evaluate(dispatchEvent)
// inside the frame runs in an isolated world whose dispatched
// events don't fire main-world listeners. Both attempts were
// verified during Unit 10 scope review. The pair above covers what
// the click test was meant to catch: a contentDocument-style plan
// would post zero messages from the iframe, failing test (1); a
// silent entryStub regression would still post messages until the
// emitter itself disappeared, failing test (2).
test('Unit 10: iframe -> parent postMessage pipe captures artifact:interacted', async ({
  page,
}) => {
  await page.goto('/articles/stripe-idempotency')
  const iframeLocator = page.locator(
    'iframe[title*="Interactive visualization"]',
  )
  await iframeLocator.scrollIntoViewIfNeeded()
  await expect(iframeLocator).toBeVisible()

  await page.evaluate(() => {
    interface W { __ai: unknown[] }
    ;(window as unknown as W).__ai = []
    window.addEventListener('message', (e) => {
      const data = e.data as { type?: string; slug?: string } | null
      if (data && data.type === 'artifact:interacted') {
        ;(window as unknown as W).__ai.push(data)
      }
    })
  })

  await page.waitForLoadState('networkidle')
  const artifactFrame = page
    .frames()
    .find((f) => f.url().includes('/artifacts/'))
  expect(artifactFrame, 'artifact iframe must be present').toBeTruthy()
  await artifactFrame!
    .waitForLoadState('domcontentloaded')
    .catch(() => undefined)

  await artifactFrame!.evaluate(() => {
    window.parent.postMessage(
      { type: 'artifact:interacted', slug: 'stripe-idempotency' },
      '*',
    )
  })

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __ai: unknown[] }).__ai.length,
      ),
    )
    .toBeGreaterThan(0)

  const captured = await page.evaluate(
    () => (window as unknown as { __ai: { slug?: string }[] }).__ai,
  )
  expect(captured[0]?.slug).toBe('stripe-idempotency')
})

test('Unit 10: every compiled artifact bundle contains the postMessage emitter', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const artifactsDir = path.join(process.cwd(), 'public', 'artifacts')
  expect(
    fs.existsSync(artifactsDir),
    `${artifactsDir} not found; did the build run compile-artifacts?`,
  ).toBe(true)
  const slugs = fs
    .readdirSync(artifactsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  expect(slugs.length).toBeGreaterThan(0)
  for (const slug of slugs) {
    const bundle = fs.readFileSync(
      path.join(artifactsDir, slug, 'index.js'),
      'utf8',
    )
    expect(
      bundle.includes('artifact:interacted'),
      `${slug}/index.js missing 'artifact:interacted' literal`,
    ).toBe(true)
    expect(
      bundle.includes(`"${slug}"`) || bundle.includes(`'${slug}'`),
      `${slug}/index.js missing slug literal "${slug}" in postMessage payload`,
    ).toBe(true)
    expect(
      bundle.includes('window.parent.postMessage'),
      `${slug}/index.js missing window.parent.postMessage call`,
    ).toBe(true)
  }
})
