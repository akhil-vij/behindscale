#!/usr/bin/env tsx
// Renders the default share image (public/og-default.png, 1200x630) that every
// page's og:image / twitter:image points to. Not part of `npm run build`: the
// PNG is committed, and this script is the source to re-run when the wordmark
// or the line changes (`npx tsx scripts/make-og-image.ts`).
//
// The card mirrors the landing hero: the site background, the yellow square
// wordmark from the navbar, and the hero line set in the hero's serif with the
// same gold underline under its second half. Fonts load from the @fontsource
// packages the site already ships, so the render is the site's own type.
// Colours are the ui-context.md token values (src/index.css): this file is a
// build tool outside src/, so it can't read the CSS variables at render time.

import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'og-default.png')

// Inlined as data: URIs so the page needs no file access to load them.
const font = (pkg: string, file: string) =>
  `data:font/woff2;base64,${readFileSync(join(ROOT, 'node_modules', pkg, 'files', file)).toString('base64')}`

// Token values (src/index.css).
const BG_BASE = '#FBFAF8'
const TEXT_PRIMARY = '#1A1A1F'
const TEXT_SECONDARY = '#52525B'
const BORDER_DEFAULT = '#E7E4DE'
const BRAND_GOLD = '#F5B841'

const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @font-face { font-family: Inter; font-weight: 600; src: url(${font('@fontsource/inter', 'inter-latin-600-normal.woff2')}) format('woff2'); }
  @font-face { font-family: Newsreader; font-weight: 200 800; font-style: normal; src: url(${font('@fontsource-variable/newsreader', 'newsreader-latin-opsz-normal.woff2')}) format('woff2'); }
  @font-face { font-family: Newsreader; font-weight: 200 800; font-style: italic; src: url(${font('@fontsource-variable/newsreader', 'newsreader-latin-opsz-italic.woff2')}) format('woff2'); }
  html, body { margin: 0; }
  .card {
    box-sizing: border-box; width: 1200px; height: 630px; padding: 88px 96px;
    background: ${BG_BASE}; border-bottom: 14px solid ${BRAND_GOLD};
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .mark { display: flex; align-items: center; gap: 22px; font: 600 46px/1 Inter, sans-serif; letter-spacing: -0.02em; color: ${TEXT_PRIMARY}; }
  .sq { width: 40px; height: 40px; border-radius: 7px; background: ${BRAND_GOLD}; box-shadow: 0 0 0 9px rgba(245,184,65,0.18); }
  h1 { margin: 0; font: 500 78px/1.06 Newsreader, Georgia, serif; letter-spacing: -0.02em; color: ${TEXT_PRIMARY}; max-width: 980px; }
  em { font-style: italic; text-decoration: underline; text-decoration-color: ${BRAND_GOLD}; text-decoration-thickness: 5px; text-underline-offset: 12px; }
  .url { font: 600 26px/1 Inter, sans-serif; color: ${TEXT_SECONDARY}; border-top: 2px solid ${BORDER_DEFAULT}; padding-top: 28px; }
</style></head>
<body><div class="card">
  <div class="mark"><span class="sq"></span>behindscale</div>
  <h1>Real production systems, taken apart. You <em>break them, then fix them.</em></h1>
  <div class="url">behindscale.com</div>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate('document.fonts.ready')
await page.locator('.card').screenshot({ path: OUT })
await browser.close()
console.log(`make-og-image: wrote ${OUT}`)
