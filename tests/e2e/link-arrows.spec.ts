import { test, expect } from '@playwright/test'

// Link arrows on wall pages: → for our own pages, ↗ only for outside links;
// every link to one of our breakdowns reads "Read the breakdown →" when it
// is a "Read the ..." link. Covers every wall page in the sitemap.

test('wall pages: our own pages get →, outside links ↗, breakdown links read "Read the breakdown →"', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const walls = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/problems\/[^<]+)<\/loc>/g)].map((m) => m[1]!)
  expect(walls.length).toBeGreaterThan(5)
  const problems: string[] = []
  for (const path of walls) {
    await page.goto(path)
    const links = await page.locator('main a[href]').evaluateAll((as) =>
      as.map((a) => ({ href: a.getAttribute('href') ?? '', text: (a.textContent ?? '').trim() })),
    )
    for (const { href, text } of links) {
      const internal = href.startsWith('/') || href.startsWith('#')
      if (internal && text.includes('↗')) problems.push(`${path}: "${text}" -> ${href} uses ↗ for our own page`)
      if (!internal && text.includes('→')) problems.push(`${path}: "${text}" -> ${href} uses → for an outside link`)
      if (href.startsWith('/articles/') && /^Read the/.test(text) && text !== 'Read the breakdown →') {
        problems.push(`${path}: "${text}" -> ${href} should read "Read the breakdown →"`)
      }
    }
  }
  expect(problems).toEqual([])
})
