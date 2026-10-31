import { test, expect, type Page } from '@playwright/test'

// The newsletter signup card (SignupCard) in its three placements -- the
// landing, the end of every lesson, the end of every article -- and the
// footer's Newsletter link. The button must open the Substack subscribe page
// in a new tab; essay-only problem pages carry no card.

const SUBSCRIBE_URL = 'https://behindscale.substack.com/subscribe'
const NEWSLETTER_URL = 'https://behindscale.substack.com'
const LESSONS = ['/problems/ambiguous-timeouts', '/problems/queue-backlog']

async function expectSignupCard(page: Page, size: 'lg' | 'md') {
  const card = page.locator(`main [data-signup-card="${size}"]`)
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('One real failure every two weeks')
  await expect(card).toContainText('EVERY TWO WEEKS · FREE · UNSUBSCRIBE ANY TIME')
  await expect(card).not.toContainText('Latest:')
  const button = card.getByRole('link', { name: 'Subscribe free on Substack ↗' })
  await expect(button).toHaveAttribute('href', SUBSCRIBE_URL)
  await expect(button).toHaveAttribute('target', '_blank')
  await expect(button).toHaveAttribute('rel', /\bnoopener\b/)
  await button.scrollIntoViewIfNeeded()
  const box = await button.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  return card
}

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('landing: the card sits before "Browse all … systems →"', async ({ page }) => {
      await page.goto('/')
      const card = await expectSignupCard(page, 'lg')
      const cta = page.getByRole('link', { name: /^Browse all \d+ systems →$/ })
      const [cardBox, ctaBox] = [await card.boundingBox(), await cta.boundingBox()]
      expect(cardBox!.y + cardBox!.height).toBeLessThan(ctaBox!.y)
    })

    for (const path of LESSONS) {
      test(`lesson ${path}: the card ends the page, outside the mission frame`, async ({ page }) => {
        await page.goto(path)
        await expectSignupCard(page, 'md')
      })
    }
  })
}

test('every article ends on the signup card', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const articles = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/articles\/[^<]+)<\/loc>/g)].map((m) => m[1]!)
  expect(articles.length).toBeGreaterThan(40)
  const missing: string[] = []
  for (const path of articles) {
    const html = await (await request.get(path)).text()
    if (!html.includes('data-signup-card="md"') || !html.includes(`href="${SUBSCRIBE_URL}"`)) missing.push(path)
  }
  expect(missing).toEqual([])
})

test('essay-only problem pages carry no signup card', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const problems = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/problems\/[^<]+)<\/loc>/g)]
    .map((m) => m[1]!)
    .filter((p) => !LESSONS.includes(p))
  expect(problems.length).toBeGreaterThan(5)
  for (const path of problems) {
    const html = await (await request.get(path)).text()
    expect(html, path).not.toContain('data-signup-card')
  }
})

test('footer: "Newsletter ↗" opens the publication in a new tab', async ({ page }) => {
  await page.goto('/patterns')
  const link = page.locator('footer').getByRole('link', { name: 'Newsletter ↗' })
  await expect(link).toHaveAttribute('href', NEWSLETTER_URL)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /\bnoopener\b/)
})
