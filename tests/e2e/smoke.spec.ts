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

  // 2. Click the article title -> /articles/:slug.
  await page
    .getByRole('link', {
      name: /designing robust and predictable apis with idempotency/i,
    })
    .click()
  await expect(page).toHaveURL(/#\/articles\/stripe-idempotency$/)
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
  await page.getByRole('link', { name: 'Atomic Phases' }).first().scrollIntoViewIfNeeded()
  const yBeforeNav = await page.evaluate(() => window.scrollY)
  expect(yBeforeNav).toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Atomic Phases' }).first().click()
  await expect(page).toHaveURL(/#\/patterns\/atomic-phases$/)
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
  // doesn't land mid-page (the ScrollToTop component in App.tsx). Without
  // this assertion, the bug that prompted it could regress silently.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  // 4. Click "Patterns" in the navbar -> /patterns.
  await page.getByRole('navigation').getByRole('link', { name: 'Patterns' }).click()
  await expect(page).toHaveURL(/#\/patterns$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Patterns' }),
  ).toBeVisible()
  // The single sample PatternCard renders.
  await expect(
    page.getByRole('heading', { level: 3, name: 'Atomic Phases' }),
  ).toBeVisible()
})
