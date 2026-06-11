#!/usr/bin/env tsx
// Unit 9 sitemap + robots emitter. Runs after scripts/prerender.ts.
// Emits dist/sitemap.xml listing every prerendered route except /404
// (404 pages don't belong in sitemaps), plus dist/robots.txt pointing
// at the sitemap.
//
// Article lastmod = article.addedAt.
// Pattern lastmod = max(article.addedAt) across articles referencing
// the pattern (architecture.md Rendering section: truthful, the page's
// content last changed when its newest referencing article landed).

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Article, PatternDefinition } from '../src/types'

// Same pattern as scripts/prerender.ts: route content through the
// SSR bundle so import.meta.glob's build-time resolution applies.
const __filename_sitemap = fileURLToPath(import.meta.url)
const ssrEntryPath = join(
  dirname(__filename_sitemap),
  '..',
  'dist-ssr',
  'ssr-entry.js',
)
const { articles, patterns } = (await import(
  pathToFileURL(ssrEntryPath).href
)) as { articles: Article[]; patterns: PatternDefinition[] }

const ROOT = join(dirname(__filename_sitemap), '..')
const DIST = join(ROOT, 'dist')

const SITE_URL = 'https://www.behindscale.com'

function patternLastMod(patternSlug: string): string | undefined {
  const dates = articles
    .filter((a) => a.patterns.some((p) => p.slug === patternSlug))
    .map((a) => a.addedAt)
  if (dates.length === 0) return undefined
  return dates.reduce((latest, candidate) =>
    candidate > latest ? candidate : latest,
  )
}

interface SitemapEntry {
  url: string
  lastMod?: string
}

const entries: SitemapEntry[] = [
  { url: `${SITE_URL}/` },
  { url: `${SITE_URL}/patterns` },
  ...articles.map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastMod: a.addedAt,
  })),
  ...patterns.map((p) => ({
    url: `${SITE_URL}/patterns/${p.slug}`,
    lastMod: patternLastMod(p.slug),
  })),
]

const xmlEntries = entries
  .map((e) => {
    const lastModLine = e.lastMod ? `\n    <lastmod>${e.lastMod}</lastmod>` : ''
    return `  <url>\n    <loc>${e.url}</loc>${lastModLine}\n  </url>`
  })
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`

writeFileSync(join(DIST, 'sitemap.xml'), sitemap)

const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`

writeFileSync(join(DIST, 'robots.txt'), robots)

console.log(
  `generate-sitemap: ${entries.length} URLs in sitemap.xml; robots.txt emitted.`,
)
