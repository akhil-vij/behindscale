#!/usr/bin/env tsx
// Atom feed emitter (findability task 10). Runs after scripts/prerender.ts,
// alongside generate-sitemap. Emits dist/rss.xml -- an Atom feed of the article
// dissections (title, summary, link, date) plus, as SEPARATE entries, the walls
// that carry a side-by-side comparison. Linked from <head> and the footer. A
// distribution surface as much as a findability one.
//
// Content routes through the SSR bundle, same as generate-sitemap, so
// import.meta.glob's build-time resolution applies (it doesn't run under tsx).

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Article, CruxTagRegistry, ProblemEssay } from '../src/types'

const __filename_feed = fileURLToPath(import.meta.url)
const ssrEntryPath = join(dirname(__filename_feed), '..', 'dist-ssr', 'ssr-entry.js')
const { articles, problemEssayByCruxTag, cruxtags, urlSlugByCruxTag } =
  (await import(pathToFileURL(ssrEntryPath).href)) as {
    articles: Article[]
    problemEssayByCruxTag: ReadonlyMap<string, ProblemEssay>
    cruxtags: CruxTagRegistry
    urlSlugByCruxTag: ReadonlyMap<string, string>
  }

const ROOT = join(dirname(__filename_feed), '..')
const DIST = join(ROOT, 'dist')
const SITE_URL = 'https://www.behindscale.com'
const SITE_NAME = 'behindscale'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// YYYY-MM-DD -> RFC-3339 datetime at UTC midnight (Atom requires a datetime).
function atomDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso
}

interface FeedEntry {
  title: string
  summary: string
  url: string
  date: string // YYYY-MM-DD
  category: 'dissection' | 'wall'
}

// Article dissections: date = addedAt (when it appeared on behindscale).
const articleEntries: FeedEntry[] = articles.map((a) => ({
  title: a.title,
  summary: a.summary,
  url: `${SITE_URL}/articles/${a.slug}`,
  date: a.addedAt,
  category: 'dissection',
}))

// Walls with a comparison, as separate entries. A wall's date is its newest
// member article's add date (its freshest content).
const wallEntries: FeedEntry[] = []
for (const [cruxTag, essay] of problemEssayByCruxTag) {
  if (essay.comparison === undefined) continue
  const urlSlug = urlSlugByCruxTag.get(cruxTag)
  if (!urlSlug) continue
  const members = articles.filter((a) => a.cruxTag === cruxTag)
  const date =
    members.map((a) => a.addedAt).sort().pop() ??
    essay.firstSentAt ??
    '1970-01-01'
  const label = essay.headline ?? cruxtags[cruxTag]?.label ?? cruxTag
  wallEntries.push({
    title: `${label} — ${members.length} systems, side by side`,
    summary:
      essay.searchQuestion?.description ??
      essay.lede ??
      cruxtags[cruxTag]?.definition ??
      '',
    url: `${SITE_URL}/problems/${urlSlug}`,
    date,
    category: 'wall',
  })
}

const entries = [...articleEntries, ...wallEntries].sort((a, b) =>
  b.date.localeCompare(a.date),
)
const updated = atomDate(entries[0]?.date ?? '1970-01-01')

const xmlEntries = entries
  .map(
    (e) => `  <entry>
    <title>${esc(e.title)}</title>
    <link href="${esc(e.url)}"/>
    <id>${esc(e.url)}</id>
    <updated>${atomDate(e.date)}</updated>
    <category term="${e.category}"/>
    <summary>${esc(e.summary)}</summary>
  </entry>`,
  )
  .join('\n')

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${SITE_NAME}</title>
  <subtitle>Real production systems, taken apart — the dissections and the walls, side by side.</subtitle>
  <link href="${SITE_URL}/rss.xml" rel="self"/>
  <link href="${SITE_URL}/"/>
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
${xmlEntries}
</feed>
`

writeFileSync(join(DIST, 'rss.xml'), feed)
console.log(
  `generate-feed: ${entries.length} entries (${articleEntries.length} dissections + ${wallEntries.length} walls) in rss.xml.`,
)
