import { test, expect } from '@playwright/test'

// Every page's title and share tags, read from the prerendered HTML of every
// sitemap page (2026-10-10):
//   - no long dash in the title (a colon splits the title, "·" sets off the
//     site name), and og:title and twitter:title say exactly the same;
//   - every page points at the same share image, as og:image and
//     twitter:image, once each, with the same width and height, so no page
//     type can drift from the others.

const attr = (html: string, key: string) =>
  [...html.matchAll(new RegExp(`<meta (?:property|name)="${key.replace(/:/g, '\\:')}" content="([^"]*)"`, 'g'))].map((m) =>
    m[1]!.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
  )

test('every page: dash-free title matching og:title and twitter:title; one shared, versioned share image', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const paths = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1]!)
  paths.push('/404')
  expect(paths.length).toBeGreaterThan(100)
  const problems: string[] = []
  const images = new Set<string>()
  for (const path of paths) {
    const html = await (await request.get(path)).text()
    const title = (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    if (/[—–]/.test(title.replace('Logical–Physical', ''))) problems.push(`${path}: title has a long dash: ${title}`)
    if (!title.endsWith('· behindscale') && path !== '/') problems.push(`${path}: title doesn't end "· behindscale": ${title}`)
    for (const key of ['og:title', 'twitter:title']) {
      const v = attr(html, key)
      if (v.length !== 1 || v[0] !== title) problems.push(`${path}: ${key} ${JSON.stringify(v)} != title`)
    }
    for (const key of ['og:image', 'twitter:image']) {
      const v = attr(html, key)
      if (v.length !== 1) problems.push(`${path}: ${v.length} ${key} tags`)
      v.forEach((x) => images.add(x))
    }
    if (attr(html, 'og:image:width').join() !== '1200' || attr(html, 'og:image:height').join() !== '630') {
      problems.push(`${path}: og:image width/height missing or duplicated`)
    }
  }
  expect(problems).toEqual([])
  expect([...images]).toHaveLength(1)
})

test('homepage and a problem page carry the owner\'s titles', async ({ request }) => {
  const title = async (p: string) => /<title>([^<]*)<\/title>/.exec(await (await request.get(p)).text())?.[1]
  expect(await title('/')).toBe('behindscale: real production systems, taken apart. You break them, then fix them.')
  expect(await title('/problems/ambiguous-timeouts')).toBe(
    'Ambiguous failure under retry: how Stripe, AWS, Airbnb, Shopify and Segment prevent double payments · behindscale',
  )
})
