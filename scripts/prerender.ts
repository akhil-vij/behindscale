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
import type { Article, PatternDefinition } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..')
const DIST = join(ROOT, 'dist')
const DIST_SSR = join(ROOT, 'dist-ssr')

const SITE_URL = 'https://www.behindscale.com'
const SITE_NAME = 'behindscale'
const SITE_DESCRIPTION =
  'A library of carefully dissected engineering blog posts, organized by reusable system-design patterns.'
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
  patterns: PatternDefinition[]
}
const { render, articles, patterns } = ssrModule

// --- Load the client template emitted by `vite build` ---

const templatePath = join(DIST, 'index.html')
if (!existsSync(templatePath)) {
  throw new Error(
    `prerender: client template not found at ${templatePath}. Did you run "vite build" first?`,
  )
}
const template = readFileSync(templatePath, 'utf8')

// --- Helpers ---

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
  jsonLd: unknown | null
}

function homeMeta(): Meta {
  return {
    title: `${SITE_NAME} — engineering blog dissections by pattern`,
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    ogType: 'website',
    jsonLd: null,
  }
}

function patternsIndexMeta(): Meta {
  return {
    title: `Patterns — ${SITE_NAME}`,
    description:
      'Reusable system-design patterns identified across engineering blog dissections on behindscale.',
    canonical: `${SITE_URL}/patterns`,
    ogType: 'website',
    jsonLd: null,
  }
}

function articleMeta(article: Article): Meta {
  return {
    title: `${article.title} — ${SITE_NAME}`,
    description: article.summary,
    canonical: `${SITE_URL}/articles/${article.slug}`,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.summary,
      datePublished: article.addedAt,
      dateModified: article.addedAt,
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
      // isBasedOn deliberately omits `name`: our title is editorial
      // and may diverge from the source post's title (see
      // architecture.md Rendering section).
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
    },
  }
}

function patternMeta(pattern: PatternDefinition): Meta {
  const firstParagraph = pattern.definition.split(/\n\s*\n/)[0] ?? ''
  return {
    title: `${pattern.name} — patterns — ${SITE_NAME}`,
    description: firstParagraph.slice(0, 220),
    canonical: `${SITE_URL}/patterns/${pattern.slug}`,
    ogType: 'article',
    jsonLd: null,
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
    lines.push(
      `<script type="application/ld+json">${jsonLdInline(m.jsonLd)}</script>`,
    )
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
  { path: '/', outPath: 'index.html', meta: homeMeta() },
  { path: '/patterns', outPath: 'patterns.html', meta: patternsIndexMeta() },
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
