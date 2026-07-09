#!/usr/bin/env tsx
// Unit 9 prerender script (architecture.md Rendering section). Runs
// after `vite build` (client bundle -> dist/) and
// `vite build --ssr src/ssr-entry.tsx --outDir dist-ssr` (SSR bundle).
// For each known route, renders the React component tree to HTML via
// renderToString + StaticRouter (imported from the SSR bundle),
// splices the result into dist/index.html alongside per-route head
// tags, and writes one HTML file per route into dist/.
//
// Defensive properties locked in architecture.md:
//   1. Every string replacement asserts the needle exists and that
//      output differs from input. Throws on either failure -- the
//      script refuses to emit a page it could not fully populate.
//   2. JSON-LD inline injection escapes < to < after
//      JSON.stringify to prevent script-tag breakout when content
//      contains </script>.
//   3. Attribute-context escapes cover &, <, >, ", '.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { catalogGroups } from '../src/lib/catalogGroups'
import type {
  Article,
  CruxTagRegistry,
  PatternDefinition,
  Source,
} from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..')
const DIST = join(ROOT, 'dist')
const DIST_SSR = join(ROOT, 'dist-ssr')

const SITE_URL = 'https://www.behindscale.com'
const SITE_NAME = 'behindscale'
const OG_IMAGE = `${SITE_URL}/og-default.png`

// --- Load SSR render function from the vite --ssr output ---

const ssrEntryPath = join(DIST_SSR, 'ssr-entry.js')
if (!existsSync(ssrEntryPath)) {
  throw new Error(
    `prerender: SSR bundle not found at ${ssrEntryPath}. Did you run "vite build --ssr src/ssr-entry.tsx --outDir dist-ssr" first?`,
  )
}
const ssrModule = (await import(pathToFileURL(ssrEntryPath).href)) as {
  render: (url: string) => string
  articles: Article[]
  cruxtags: CruxTagRegistry
  feeds: readonly Source[]
  patterns: PatternDefinition[]
}
const { render, articles, cruxtags, feeds, patterns } = ssrModule

// --- Load the client template emitted by `vite build` ---

const templatePath = join(DIST, 'index.html')
if (!existsSync(templatePath)) {
  throw new Error(
    `prerender: client template not found at ${templatePath}. Did you run "vite build" first?`,
  )
}
const template = readFileSync(templatePath, 'utf8')

// --- Helpers ---

// Truncate a meta description at a word boundary, max 160 chars
// (the safe sweet spot across Google snippets and OpenGraph
// unfurlers). Adds an ellipsis when truncated. Returns the original
// string untouched when already <= max. The word-boundary cut means
// we don't ship descriptions ending mid-word.
function truncateForMeta(s: string, max = 160): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  // Prefer the last space if it's not too far back (>60% of max);
  // otherwise hard-cut to avoid a tiny truncation.
  const cutAt = lastSpace > max * 0.6 ? lastSpace : max
  return slice.slice(0, cutAt).replace(/[.,;:—–-]+$/, '').trimEnd() + '…'
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonLdInline(obj: unknown): string {
  // Escape < to < after stringify so a legitimate `</script>`
  // inside any string field cannot terminate the inline JSON-LD
  // <script> tag. The escape is valid JSON and parses identically.
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

function safeReplace(
  haystack: string,
  needle: string,
  replacement: string,
  context: string,
): string {
  if (!haystack.includes(needle)) {
    throw new Error(
      `prerender: needle not found in template (context: ${context}). Template has drifted; emitting this page would silently ship an unpopulated shell. Needle: ${JSON.stringify(needle)}`,
    )
  }
  const result = haystack.replace(needle, replacement)
  if (result === haystack) {
    throw new Error(
      `prerender: replacement no-op for needle ${JSON.stringify(needle)} (context: ${context}). includes() said yes but replace produced no diff -- investigate.`,
    )
  }
  return result
}

// --- Per-route meta builders ---

interface Meta {
  title: string
  description: string
  canonical: string
  ogType: 'website' | 'article'
  // A single JSON-LD object, an array of them (for pages carrying
  // multiple typed blocks like TechArticle + BreadcrumbList +
  // DefinedTermSet references, landed in Commit 6), or null. The
  // headTags() renderer emits one <script type="application/ld+json">
  // per block, each escaped via jsonLdInline().
  jsonLd: unknown | readonly unknown[] | null
}

function landingMeta(): Meta {
  const description =
    'A library of top engineering blog posts dissected into structured summaries and interactive artifacts, grouped by the bottleneck each system was built to solve.'

  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-default.png`,
  }

  // WebSite with a SearchAction pointing at /catalog?q=... so Google
  // can offer a sitelinks searchbox that lands the query on the
  // catalog's search field. `{search_term_string}` is Google's
  // placeholder token -- the required literal shape for the query
  // input pattern.
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description,
    publisher: { '@id': `${SITE_URL}#organization` },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/catalog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return {
    title: `${SITE_NAME} — engineering blog dissections by problem class`,
    description,
    canonical: `${SITE_URL}/`,
    ogType: 'website',
    jsonLd: [website, organization],
  }
}

// URL helpers for the cross-page JSON-LD @id contract. Every article's
// TechArticle.about references a cruxTag DefinedTerm by its
// `/catalog#term-<slug>` anchor (emitted by src/pages/Catalog.tsx's
// group header wrappers); article-page TechArticle.mentions references
// a pattern DefinedTerm by its `/patterns/<slug>#term` anchor (Commit
// 6). Assertion pass in Commit 6 will verify every referenced @id
// resolves to a real emitted DefinedTerm.
function cruxTagTermId(slug: string): string {
  return `${SITE_URL}/catalog#term-${slug}`
}

function patternTermId(slug: string): string {
  return `${SITE_URL}/patterns#term-${slug}`
}

function catalogMeta(): Meta {
  // Build the taxonomy DefinedTermSet from the registry -- one
  // DefinedTerm per cruxTag entry. The @id is the same in-page anchor
  // (`/catalog#term-<slug>`) that Catalog.tsx emits on each group
  // header wrapper; the design decision locks this correspondence so
  // structured-data cross-references from article pages land on a
  // real DOM target (spec §8.3 refinement / plan-level guardrail).
  const registryEntries = Object.entries(cruxtags)
    .slice()
    .sort(([a], [b]) => a.localeCompare(b))

  const cruxtagTerms = registryEntries.map(([slug, entry]) => ({
    '@type': 'DefinedTerm',
    '@id': cruxTagTermId(slug),
    name: entry.label,
    description: entry.definition,
    termCode: slug,
  }))

  const definedTermSet = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${SITE_URL}/catalog#taxonomy`,
    name: 'behindscale bottleneck taxonomy',
    description:
      'The classes of system-design bottlenecks (crux tags) used across the behindscale catalog to group articles by the underlying problem they solve.',
    inLanguage: 'en',
    hasDefinedTerm: cruxtagTerms,
  }

  // CollectionPage with an ItemList of problem-class groups. Each
  // group carries its own nested ItemList of member article URLs, so
  // an LLM reading the catalog sees "here is a problem class, here
  // are the systems that solved it" as a first-class structure.
  const groups = catalogGroups({ articles, registry: cruxtags })

  const groupItems = groups.map((group, groupIdx) => ({
    '@type': 'ListItem',
    position: groupIdx + 1,
    item: {
      '@type': 'ItemList',
      '@id': cruxTagTermId(group.slug),
      name: group.label,
      description: group.definition,
      numberOfItems: group.count,
      itemListElement: group.articles.map((article, articleIdx) => ({
        '@type': 'ListItem',
        position: articleIdx + 1,
        url: `${SITE_URL}/articles/${article.slug}`,
        name: article.title,
      })),
    },
  }))

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/catalog`,
    url: `${SITE_URL}/catalog`,
    name: `Catalog — ${SITE_NAME}`,
    description:
      'Browse behindscale dissections by problem class. Grouped by the crux — the bottleneck that made each system hard — with a company filter and search.',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: groups.length,
      itemListElement: groupItems,
    },
  }

  return {
    title: `Catalog — ${SITE_NAME}`,
    description:
      'Browse behindscale dissections by problem class. Grouped by the crux — the bottleneck that made each system hard — with a company filter and search.',
    canonical: `${SITE_URL}/catalog`,
    ogType: 'website',
    jsonLd: [collectionPage, definedTermSet],
  }
}

function patternsIndexMeta(): Meta {
  // Pattern DefinedTermSet: the taxonomy of solutions. Referenced by
  // article-page TechArticle.mentions via each pattern's @id. The
  // pattern index page renders each pattern card with
  // id="term-<slug>" so the @id target resolves to a real anchor.
  //
  // Sorted alphabetically inside the set to match the DOM order and
  // the cruxTag DefinedTermSet on /catalog.
  const orderedPatterns = patterns
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const patternTerms = orderedPatterns.map((pattern) => ({
    '@type': 'DefinedTerm',
    '@id': patternTermId(pattern.slug),
    name: pattern.name,
    description: pattern.definition.split(/\n\s*\n/)[0] ?? '',
    termCode: pattern.slug,
    url: `${SITE_URL}/patterns/${pattern.slug}`,
  }))

  const definedTermSet = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${SITE_URL}/patterns#patterns-taxonomy`,
    name: 'behindscale pattern library',
    description:
      'Reusable system-design patterns identified across engineering blog dissections on behindscale. Each pattern is defined independently of any one company or product.',
    inLanguage: 'en',
    hasDefinedTerm: patternTerms,
  }

  return {
    title: `Patterns — ${SITE_NAME}`,
    description:
      'Reusable system-design patterns identified across engineering blog dissections on behindscale.',
    canonical: `${SITE_URL}/patterns`,
    ogType: 'website',
    jsonLd: [definedTermSet],
  }
}

function articleMeta(article: Article): Meta {
  const cruxTagEntry = cruxtags[article.cruxTag]
  const cruxTagLabel = cruxTagEntry?.label ?? article.cruxTag
  const patternNames = article.patterns
    .map((p) => {
      const def = patterns.find((pd) => pd.slug === p.slug)
      return def?.name ?? p.slug
    })
    .filter(Boolean)

  // TechArticle upgrade (was Article). Landed 2026-07-08 for the
  // navigation/SEO phase. isBasedOn keeps the same shape it had on
  // the Article node so source attribution stays canonical -- see
  // architecture.md JSON-LD field map. `about` references the
  // cruxTag DefinedTerm on /catalog by @id (locked correspondence
  // with the id="term-<slug>" DOM anchor emitted by
  // src/pages/Catalog.tsx group headers). `mentions` references
  // each pattern DefinedTerm on /patterns by @id.
  const techArticle = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${SITE_URL}/articles/${article.slug}`,
    headline: article.title,
    description: article.summary,
    abstract: article.crux,
    datePublished: article.addedAt,
    dateModified: article.updatedAt ?? article.addedAt,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/articles/${article.slug}`,
    image: OG_IMAGE,
    isBasedOn: {
      '@type': 'Article',
      url: article.url,
      datePublished: article.publishedAt,
      publisher: {
        '@type': 'Organization',
        name: article.source.name,
        url: article.source.url,
      },
    },
    citation: article.url,
    about: { '@id': cruxTagTermId(article.cruxTag) },
    mentions: article.patterns.map((p) => ({
      '@id': patternTermId(p.slug),
    })),
    keywords: [cruxTagLabel, ...patternNames].join(', '),
  }

  // BreadcrumbList: Home → Catalog → [problem-class label] → Article.
  // The problem-class breadcrumb points at /catalog#term-<slug> so
  // clicking that crumb (in a rich-results display) lands the reader
  // on the same DOM anchor everything else does.
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Catalog',
        item: `${SITE_URL}/catalog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: cruxTagLabel,
        item: cruxTagTermId(article.cruxTag),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: article.title,
        item: `${SITE_URL}/articles/${article.slug}`,
      },
    ],
  }

  return {
    title: `${article.title} — ${SITE_NAME}`,
    description: truncateForMeta(article.summary),
    canonical: `${SITE_URL}/articles/${article.slug}`,
    ogType: 'article',
    jsonLd: [techArticle, breadcrumbs],
  }
}

function patternMeta(pattern: PatternDefinition): Meta {
  const firstParagraph = pattern.definition.split(/\n\s*\n/)[0] ?? ''

  // DefinedTerm for the pattern itself, referenced by article
  // TechArticle.mentions from every article that embodies this
  // pattern. The @id matches the DOM anchor
  // src/components/PatternCard.tsx emits on /patterns
  // (id="term-<slug>") -- clicking `mentions` in structured data
  // rich results lands the reader on the pattern-index page
  // scrolled to this card.
  const definedTerm = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': patternTermId(pattern.slug),
    name: pattern.name,
    description: firstParagraph,
    termCode: pattern.slug,
    inDefinedTermSet: { '@id': `${SITE_URL}/patterns#patterns-taxonomy` },
    url: `${SITE_URL}/patterns/${pattern.slug}`,
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Patterns',
        item: `${SITE_URL}/patterns`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: pattern.name,
        item: `${SITE_URL}/patterns/${pattern.slug}`,
      },
    ],
  }

  return {
    title: `${pattern.name} — patterns — ${SITE_NAME}`,
    description: truncateForMeta(firstParagraph),
    canonical: `${SITE_URL}/patterns/${pattern.slug}`,
    ogType: 'article',
    jsonLd: [definedTerm, breadcrumbs],
  }
}

function sourcesMeta(): Meta {
  // The sources page is the visible enumeration of invariant 7
  // (official engineering blogs only, no aggregators). Its JSON-LD
  // is a CollectionPage whose mainEntity is an ItemList of the
  // allowlisted engineering blogs -- each item points at the
  // canonical first-party URL. This is the machine-readable
  // "here are the primary sources this library is built on"
  // signal that reinforces the AI-citability bet.
  //
  const counts = new Map<string, number>()
  for (const article of articles) {
    counts.set(article.source.slug, (counts.get(article.source.slug) ?? 0) + 1)
  }
  const items = feeds
    .slice()
    .sort((a, b) => a.company.localeCompare(b.company))
    .map((feed, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Organization',
        name: feed.name,
        url: feed.url,
        // Signal the count as a plain property so an ingesting LLM
        // sees the coverage per source without needing to compute
        // it.
        'numberOfDissections': counts.get(feed.slug) ?? 0,
      },
    }))

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/sources`,
    url: `${SITE_URL}/sources`,
    name: `Sources — ${SITE_NAME}`,
    description:
      'The official engineering blogs behindscale draws every dissection from — first-party sources only, no aggregators or third-party summaries.',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items,
    },
  }

  return {
    title: `Sources — ${SITE_NAME}`,
    description:
      'The official engineering blogs behindscale draws every dissection from — first-party sources only.',
    canonical: `${SITE_URL}/sources`,
    ogType: 'website',
    jsonLd: [collectionPage],
  }
}

function notFoundMeta(): Meta {
  return {
    title: `Page not found — ${SITE_NAME}`,
    description: 'The page you are looking for does not exist on behindscale.',
    canonical: `${SITE_URL}/404`,
    ogType: 'website',
    jsonLd: null,
  }
}

// --- Head-tags string builder ---

function headTags(m: Meta): string {
  const lines = [
    `<meta name="description" content="${escapeAttr(m.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(m.canonical)}" />`,
    `<meta property="og:type" content="${m.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeAttr(m.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(m.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(m.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(OG_IMAGE)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ]
  if (m.jsonLd !== null) {
    // A meta can carry either a single JSON-LD object or an array of
    // them (article pages need TechArticle + BreadcrumbList; the
    // catalog needs CollectionPage + DefinedTermSet). Emit one
    // <script> per block. Each block passes through jsonLdInline() so
    // the </script> escape applies uniformly.
    const blocks = Array.isArray(m.jsonLd) ? m.jsonLd : [m.jsonLd]
    for (const block of blocks) {
      lines.push(
        `<script type="application/ld+json">${jsonLdInline(block)}</script>`,
      )
    }
  }
  return lines.join('\n    ')
}

// --- Route table ---

interface RouteEntry {
  path: string
  outPath: string
  meta: Meta
}

const routes: RouteEntry[] = [
  { path: '/', outPath: 'index.html', meta: landingMeta() },
  { path: '/catalog', outPath: 'catalog.html', meta: catalogMeta() },
  { path: '/patterns', outPath: 'patterns.html', meta: patternsIndexMeta() },
  { path: '/sources', outPath: 'sources.html', meta: sourcesMeta() },
  ...articles.map(
    (a): RouteEntry => ({
      path: `/articles/${a.slug}`,
      outPath: `articles/${a.slug}.html`,
      meta: articleMeta(a),
    }),
  ),
  ...patterns.map(
    (p): RouteEntry => ({
      path: `/patterns/${p.slug}`,
      outPath: `patterns/${p.slug}.html`,
      meta: patternMeta(p),
    }),
  ),
  { path: '/404', outPath: '404.html', meta: notFoundMeta() },
]

// --- Cross-page @id contract assertion (Commit 6, plan-level
//     guardrail) ---
//
// Every @id an article's TechArticle references (cruxTag `about`,
// pattern `mentions`) must resolve to a real DefinedTerm anchor
// emitted somewhere else in the site. This pass verifies the
// *rendered anchor emission* rather than the underlying data --
// the content-level checks in scripts/validate-content.ts already
// prevent an article JSON from referencing missing cruxTags or
// missing pattern definitions. What THIS pass catches is a bug in
// the JSON-LD builder itself: a slug transform mismatch, a URL
// prefix drift, an off-by-one in the anchor id -- failures that
// would silently ship dangling structured data.
//
// The assertion mirrors the "needle exists AND replacement diffs"
// defensive discipline of safeReplace(): rather than shipping
// broken output on first fault, the build refuses to emit at all
// and prints a diff of expected vs actual.
{
  const emittedTermIds = new Set<string>()
  for (const [slug] of Object.entries(cruxtags)) {
    emittedTermIds.add(cruxTagTermId(slug))
  }
  for (const pattern of patterns) {
    emittedTermIds.add(patternTermId(pattern.slug))
  }

  const referencedTermIds = new Set<string>()
  for (const article of articles) {
    referencedTermIds.add(cruxTagTermId(article.cruxTag))
    for (const p of article.patterns) {
      referencedTermIds.add(patternTermId(p.slug))
    }
  }

  const dangling: string[] = []
  for (const referenced of referencedTermIds) {
    if (!emittedTermIds.has(referenced)) dangling.push(referenced)
  }

  if (dangling.length > 0) {
    throw new Error(
      `prerender: dangling JSON-LD @id references (${dangling.length}). ` +
        `Each referenced @id must resolve to a real DefinedTerm anchor ` +
        `emitted somewhere in the site (id="term-<slug>" DOM anchor + ` +
        `matching DefinedTerm in the JSON-LD). Referenced but not ` +
        `emitted:\n  ${dangling.slice(0, 20).join('\n  ')}` +
        (dangling.length > 20 ? `\n  ... (${dangling.length - 20} more)` : ''),
    )
  }
}

// --- Render + write loop ---

console.log(`prerender: ${routes.length} routes`)

for (const route of routes) {
  const body = render(route.path)

  let html = template

  html = safeReplace(
    html,
    '<title>behindscale</title>',
    `<title>${escapeAttr(route.meta.title)}</title>`,
    `title for ${route.path}`,
  )

  html = safeReplace(
    html,
    '</head>',
    `    ${headTags(route.meta)}\n  </head>`,
    `head tags for ${route.path}`,
  )

  html = safeReplace(
    html,
    '<div id="root"></div>',
    `<div id="root">${body}</div>`,
    `body for ${route.path}`,
  )

  const outFile = join(DIST, route.outPath)
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, html)
  console.log(`  ok   ${route.path} -> ${route.outPath}`)
}
