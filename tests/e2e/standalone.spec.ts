import { test, expect, type Page } from '@playwright/test'

// Standalone simulation pages (pre-distribution batch A, item 2). The "Open
// full screen" target /artifacts/<slug>/index.html is shared directly, so on
// its own it names itself and carries a bar back to the site; inside our own
// embeds the same file must never show that bar.

const SAMPLES = [
  {
    kind: 'article simulation',
    slug: 'stripe-idempotency',
    title: 'Designing robust and predictable APIs with idempotency · behindscale',
    parent: '/articles/stripe-idempotency',
  },
  {
    kind: 'pattern demo',
    slug: 'idempotency-keys',
    title: 'Idempotency Keys · behindscale',
    parent: '/patterns/idempotency-keys',
  },
  {
    kind: 'problem-page artifact',
    slug: 'problem-ambiguous-timeouts-mission',
    title: 'Survive a day of payments · behindscale',
    parent: '/problems/ambiguous-timeouts',
  },
] as const

for (const s of SAMPLES) {
  test(`standalone ${s.kind}: title, head and bar, both links work`, async ({ page }) => {
    await page.goto(`/artifacts/${s.slug}/index.html`)
    await expect(page).toHaveTitle(s.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://www.behindscale.com/artifacts/${s.slug}`,
    )
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description?.length ?? 0).toBeGreaterThan(20)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://www.behindscale.com/og-default.png',
    )

    const bar = page.locator('#bs-standalone-bar')
    await expect(bar).toBeVisible()
    const home = bar.getByRole('link', { name: 'behindscale' })
    const breakdown = bar.getByRole('link', { name: /Read the full breakdown/ })
    await expect(home).toHaveAttribute('href', '/')
    await expect(breakdown).toHaveAttribute('href', s.parent)

    await breakdown.click()
    await expect(page).toHaveURL(new RegExp(`${s.parent}$`))
    await expect(page.locator('h1').first()).toBeVisible()

    await page.goBack()
    await page.locator('#bs-standalone-bar').getByRole('link', { name: 'behindscale' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('h1').first()).toBeVisible()
  })
}

async function barStateInFrame(page: Page, slug: string) {
  await expect
    .poll(() => page.frames().some((f) => f.url().includes(`/artifacts/${slug}/`)))
    .toBe(true)
  const frame = page.frames().find((f) => f.url().includes(`/artifacts/${slug}/`))!
  await frame.waitForLoadState('domcontentloaded')
  return frame.evaluate(() => {
    const bar = document.getElementById('bs-standalone-bar')
    return { present: bar !== null, hidden: bar?.hidden, height: bar?.getBoundingClientRect().height }
  })
}

test('embedded simulations on the site never show the standalone bar', async ({ page }) => {
  const embeds: Array<[string, string[]]> = [
    ['/articles/stripe-idempotency', ['stripe-idempotency']],
    ['/patterns/idempotency-keys', ['idempotency-keys']],
    ['/problems/ambiguous-timeouts', ['problem-ambiguous-timeouts-tryit', 'problem-ambiguous-timeouts-mission']],
  ]
  for (const [path, slugs] of embeds) {
    await page.goto(path)
    for (const slug of slugs) {
      // The bar is in the file (the same shell serves both cases) but stays
      // hidden and takes no space.
      expect(await barStateInFrame(page, slug), `${slug} on ${path}`).toEqual({
        present: true,
        hidden: true,
        height: 0,
      })
    }
  }
})
