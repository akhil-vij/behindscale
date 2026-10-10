import { test, expect } from '@playwright/test'

// Every page's title and share tags, read from the prerendered HTML of every
// sitemap page (2026-10-10):
//   - no long dash in the title (a colon splits the title, "·" sets off the
//     site name), and og:title and twitter:title say exactly the same;
//   - no long dash in the description, which og:description repeats;
//   - every page points at the same versioned share image, as og:image and
//     twitter:image, once each, with the same width and height, so no page
//     type can drift from the others.

// Descriptions taken verbatim from content that still carry a long dash
// (2026-10-10). Known, not yet rewritten: article summaries, the first
// paragraph of a pattern's definition (no oneLineDefinition), problem ledes.
// The list only shrinks: a page that loses its dash must leave it, and any
// other page with a dash fails. "Logical–Physical" (an en dash joining two
// words in a pattern name) is not punctuation and is allowed everywhere.
const KNOWN_CONTENT_DASHES = new Set([
  '/articles/doordash-aperture-global-failure-mitigation',
  '/articles/google-colossus-ssd-placement',
  '/patterns/checkpoint-bounded-scans',
  '/patterns/compile-time-boundary-enforcement',
  '/patterns/content-free-change-events',
  '/patterns/database-as-a-queue',
  '/patterns/dead-letter-queue',
  '/patterns/deadline-propagation',
  '/patterns/designated-source-of-truth',
  '/patterns/hibernation-vs-polling',
  '/patterns/hot-data-first-migration',
  '/patterns/id-encoded-placement',
  '/patterns/loose-foreign-keys',
  '/patterns/rehearsed-restore',
  '/patterns/selective-acknowledgment',
  '/patterns/sharding-behind-a-proxy',
  '/patterns/simulated-policy-selection',
  '/patterns/throttled-readmission',
  '/patterns/violation-ratchet',
  '/problems/blind-data-placement',
  '/problems/blind-load-shedding',
  '/problems/gray-failure',
  '/problems/outgrowing-one-cluster',
  '/problems/outgrowing-one-table',
])

const hasLongDash = (s: string) => /[—–]/.test(s.replace(/Logical–Physical/g, ''))

const attr = (html: string, key: string) =>
  [...html.matchAll(new RegExp(`<meta (?:property|name)="${key.replace(/:/g, '\\:')}" content="([^"]*)"`, 'g'))].map((m) =>
    m[1]!.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
  )

test('every page: dash-free title and description, repeated by the og and twitter tags; one shared, versioned share image', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const paths = [...sitemap.matchAll(/<loc>https:\/\/www\.behindscale\.com(\/[^<]*)<\/loc>/g)].map((m) => m[1]!)
  paths.push('/404')
  expect(paths.length).toBeGreaterThan(100)
  const problems: string[] = []
  const images = new Set<string>()
  for (const path of paths) {
    const html = await (await request.get(path)).text()
    const title = (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    if (hasLongDash(title)) problems.push(`${path}: title has a long dash: ${title}`)
    const description = attr(html, 'description')
    if (description.length !== 1 || attr(html, 'og:description').join('\n') !== description[0]) {
      problems.push(`${path}: needs one description, repeated exactly by og:description`)
    }
    const dashed = hasLongDash(description.join(' '))
    if (dashed && !KNOWN_CONTENT_DASHES.has(path)) problems.push(`${path}: description has a long dash: ${description[0]}`)
    if (!dashed && KNOWN_CONTENT_DASHES.has(path)) problems.push(`${path}: description is dash-free now, so drop it from KNOWN_CONTENT_DASHES`)
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
  expect([...images][0]).toMatch(/^https:\/\/www\.behindscale\.com\/og-default\.png\?v=[0-9a-f]{8}$/)
})

test('homepage and a problem page carry the owner\'s titles', async ({ request }) => {
  const title = async (p: string) => /<title>([^<]*)<\/title>/.exec(await (await request.get(p)).text())?.[1]
  expect(await title('/')).toBe('behindscale: real production systems, taken apart. You break them, then fix them.')
  expect(await title('/problems/ambiguous-timeouts')).toBe(
    'Ambiguous failure under retry: how Stripe, AWS, Airbnb, Shopify and Segment prevent double payments · behindscale',
  )
})

// The RSS feed: no long dash in the feed's title and subtitle or in any entry
// title; entry summaries are article summaries and wall copy from content, so
// the two known article summaries (KNOWN_CONTENT_DASHES) are the only ones
// allowed one.
test('RSS feed: dash-free titles and subtitle; summaries dash-free apart from the known content', async ({ request }) => {
  const feed = await (await request.get('/rss.xml')).text()
  const problems: string[] = []
  const head = feed.split('<entry>')[0]!
  for (const tag of ['title', 'subtitle']) {
    const v = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(head)?.[1] ?? ''
    if (v === '' || hasLongDash(v)) problems.push(`feed ${tag}: ${v}`)
  }
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]!)
  expect(entries.length).toBeGreaterThan(40)
  for (const e of entries) {
    const path = (/<link href="https:\/\/www\.behindscale\.com([^"]*)"/.exec(e)?.[1]) ?? '?'
    const title = /<title>([^<]*)<\/title>/.exec(e)?.[1] ?? ''
    const summary = /<summary>([^<]*)<\/summary>/.exec(e)?.[1] ?? ''
    if (hasLongDash(title)) problems.push(`${path}: entry title ${title}`)
    if (hasLongDash(summary) && !KNOWN_CONTENT_DASHES.has(path)) problems.push(`${path}: entry summary has a long dash`)
  }
  expect(problems).toEqual([])
  expect(feed).toContain('<title>Ambiguous failure under retry: 5 systems, side by side</title>')
})
