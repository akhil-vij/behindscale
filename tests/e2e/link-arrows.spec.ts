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

// The same rule on every page in the sitemap (articles, patterns, walls, the
// index pages), read from the prerendered HTML: an arrow inside a link to our
// own site is →, an arrow inside a link to anywhere else is ↗. Covers "Open in
// full →" under article simulations and "OPEN FULL SCREEN →" on pattern pages.
test('every page: → on links to our own pages, ↗ only on outside links', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const paths = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1]!)
  expect(paths.length).toBeGreaterThan(100)
  const problems: string[] = []
  let fullScreen = 0
  for (const path of paths) {
    const html = await (await request.get(path)).text()
    for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const href = m[1]!
      const text = m[2]!.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const internal =
        href.startsWith('/') || href.startsWith('#') || href.startsWith('https://www.behindscale.com')
      if (internal && text.includes('↗')) problems.push(`${path}: "${text}" -> ${href} uses ↗ for our own page`)
      if (!internal && text.includes('→')) problems.push(`${path}: "${text}" -> ${href} uses → for an outside link`)
      if (/^(Open in full|OPEN FULL SCREEN)/.test(text)) fullScreen += 1
    }
  }
  expect(problems).toEqual([])
  // Both full-screen links are present somewhere, so the check really saw them.
  expect(fullScreen).toBeGreaterThan(10)
})
