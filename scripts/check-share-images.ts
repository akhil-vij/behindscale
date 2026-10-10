#!/usr/bin/env tsx
// Post-build share-image guard. Runs last in `npm run build`, after every
// page (prerendered routes, standalone artifact pages) is in dist/. Fails the
// build if any page's share card would come out blank:
//   - og:image and twitter:image must both be present, absolute URLs on the
//     site's own origin,
//   - each must name a file that exists in dist/ (the og-default.png 404 that
//     shipped every link as a blank card),
//   - twitter:card must be summary_large_image.
// The rules are a pure function (shareImageProblems) so the unit test feeds
// it HTML strings without a build.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE_URL = 'https://www.behindscale.com'

export interface SharePage {
  // dist-relative path of the HTML file, for error messages.
  readonly file: string
  readonly html: string
}

function metaContent(html: string, attr: 'property' | 'name', key: string): string[] {
  const out: string[] = []
  const tag = /<meta\b[^>]*>/gi
  for (const m of html.matchAll(tag)) {
    const t = m[0]
    if (!new RegExp(`\\b${attr}="${key.replace(/[.:]/g, '\\$&')}"`).test(t)) continue
    const c = /\bcontent="([^"]*)"/.exec(t)
    out.push(c ? c[1]!.replace(/&amp;/g, '&') : '')
  }
  return out
}

// One problem per line; empty when every page is sound. `fileExists` takes a
// dist-relative path ("og-default.png").
export function shareImageProblems(
  pages: readonly SharePage[],
  fileExists: (distPath: string) => boolean,
): string[] {
  const problems: string[] = []
  for (const { file, html } of pages) {
    for (const [attr, key] of [
      ['property', 'og:image'],
      ['name', 'twitter:image'],
    ] as const) {
      const values = metaContent(html, attr, key)
      if (values.length === 0) {
        problems.push(`${file}: no ${key}`)
        continue
      }
      for (const v of values) {
        if (!v.startsWith(`${SITE_URL}/`)) {
          problems.push(`${file}: ${key} "${v}" is not an absolute ${SITE_URL} URL`)
          continue
        }
        const path = decodeURIComponent(new URL(v).pathname).replace(/^\//, '')
        if (!fileExists(path)) problems.push(`${file}: ${key} points to ${v}, but dist/${path} does not exist`)
      }
    }
    const card = metaContent(html, 'name', 'twitter:card')
    if (card.length !== 1 || card[0] !== 'summary_large_image') {
      problems.push(`${file}: twitter:card must be "summary_large_image" (found ${card.length === 0 ? 'none' : card.map((c) => `"${c}"`).join(', ')})`)
    }
  }
  return problems
}

function htmlFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...htmlFiles(p))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const pages = htmlFiles(DIST).map((p) => ({ file: relative(DIST, p), html: readFileSync(p, 'utf8') }))
  const problems = shareImageProblems(pages, (p) => existsSync(join(DIST, p)))
  if (problems.length > 0) {
    console.error(`check-share-images: ${problems.length} problem${problems.length === 1 ? '' : 's'}`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }
  console.log(`check-share-images: ${pages.length} pages, every share image resolves.`)
}
