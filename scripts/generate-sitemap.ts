#!/usr/bin/env tsx
// Unit 9 sitemap + robots emitter. Runs after scripts/prerender.ts.
// Emits dist/sitemap.xml listing every prerendered route except /404
// (404 pages don't belong in sitemaps), plus dist/robots.txt pointing
// at the sitemap.
//
// Article lastmod = article.updatedAt ?? article.addedAt -- when an
// article has been materially revised post-publish, the revision date
// supersedes the original prod-add date.
// Pattern lastmod = max(article.updatedAt ?? article.addedAt) across
// articles referencing the pattern (architecture.md Rendering section:
// truthful, the page's content last changed when its newest referencing
// article landed or was revised).

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

function articleLastMod(a: Article): string {
  return a.updatedAt ?? a.addedAt
}

function patternLastMod(patternSlug: string): string | undefined {
  const dates = articles
    .filter((a) => a.patterns.some((p) => p.slug === patternSlug))
    .map(articleLastMod)
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
  // /catalog has no content-modeled timestamp -- it's a browse
  // surface derived from article state, not itself dated. A
  // fabricated `lastmod` is worse than none (it lies to crawlers
  // about freshness), so this entry ships without one deliberately.
  // Landed 2026-07-08 with the landing/navigation phase.
  { url: `${SITE_URL}/catalog` },
  { url: `${SITE_URL}/patterns` },
  // /sources: same "derived surface, no content-modeled timestamp"
  // reasoning as /catalog. Landed 2026-07-09 as a trust artifact
  // (the visible enumeration of invariant 7's official-blogs-only
  // policy).
  { url: `${SITE_URL}/sources` },
  ...articles.map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastMod: articleLastMod(a),
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

// robots.txt with explicit named Allow blocks for AI + search
// crawlers (2026-07-08 landing/navigation phase, spec §8.1
// tier-1 SEO). The bare `User-agent: * / Allow: /` already
// permits everything, but some operators honor only explicit
// directives, and explicit allows are a stronger positive signal
// than a bare wildcard. Ship both.
//
// The named list covers Google search + AI training + AI
// answer-mode crawlers. The extra Allow blocks are additive --
// they never contradict the wildcard.
const NAMED_CRAWLERS: readonly string[] = [
  // General search crawlers
  'Googlebot',
  'Bingbot',
  // Google's AI-training opt-in (separate from Googlebot)
  'Google-Extended',
  // AI crawlers
  'GPTBot', // OpenAI training
  'ChatGPT-User', // OpenAI answer-mode
  'OAI-SearchBot', // OpenAI search index
  'ClaudeBot', // Anthropic training
  'Claude-Web', // Anthropic user-triggered fetch (legacy name)
  'anthropic-ai', // Anthropic (legacy user-agent)
  'PerplexityBot', // Perplexity
  'CCBot', // Common Crawl (feeds many downstream models)
]

const namedBlocks = NAMED_CRAWLERS.map(
  (agent) => `User-agent: ${agent}\nAllow: /\n`,
).join('\n')

const robots = `# behindscale robots.txt
# Wildcard: allow everything.
User-agent: *
Allow: /

# Explicit named Allow blocks for search + AI crawlers -- some
# operators honor only explicit directives (2026-07-08).
${namedBlocks}
Sitemap: ${SITE_URL}/sitemap.xml
`

writeFileSync(join(DIST, 'robots.txt'), robots)

console.log(
  `generate-sitemap: ${entries.length} URLs in sitemap.xml; robots.txt emitted.`,
)
