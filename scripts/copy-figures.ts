#!/usr/bin/env tsx
// Mirror content/figures/<host>/<slug>.svg into public/figures/, so
// Vite's build ships each SVG as a static asset at
// /figures/<host>/<slug>.svg. <host> is an article slug OR a pattern
// slug -- this script walks the filesystem host-agnostically. That URL
// is what:
//   - <img src=".../figures/..."> in Prose.tsx resolves (reader page)
//   - TechArticle.image JSON-LD points at (SEO / Google image
//     discovery)
//   - any future direct-link view of a figure serves
//
// Mirror semantics: a file present in content/figures/ but absent in
// public/figures/ is copied; a file present in public/figures/ but
// absent in content/figures/ is deleted (stale). This keeps the
// deployed set 1:1 with the authored set so a removed figure
// (docs/figures-design.md Q14) actually stops shipping.
//
// Safety: the content validator (scripts/validate-content.ts) runs
// figure-svg-safe against every SVG before the build reaches this
// step. `npm run build` gates on `npm run validate` succeeding, so
// this script trusts that any SVG it sees has already passed the
// allowlist -- no re-validation here.
//
// Emits one summary line to stdout; runs quietly on the current
// zero-figure corpus.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

const SRC_ROOT = 'content/figures'
const DST_ROOT = 'public/figures'

interface SvgRef {
  hostSlug: string
  figureSlug: string
  srcPath: string
  dstPath: string
}

function walkSourceSvgs(): SvgRef[] {
  const out: SvgRef[] = []
  if (!existsSync(SRC_ROOT)) return out
  for (const hostSlug of readdirSync(SRC_ROOT).sort()) {
    const hostDir = join(SRC_ROOT, hostSlug)
    if (!statSync(hostDir).isDirectory()) continue
    for (const name of readdirSync(hostDir).sort()) {
      if (!name.endsWith('.svg')) continue
      const figureSlug = name.slice(0, -'.svg'.length)
      out.push({
        hostSlug,
        figureSlug,
        srcPath: join(hostDir, name),
        dstPath: join(DST_ROOT, hostSlug, name),
      })
    }
  }
  return out
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function walkExistingDst(): Map<string, string> {
  // key: dstPath, value: dstPath (used as a set with fast has())
  const out = new Map<string, string>()
  if (!existsSync(DST_ROOT)) return out
  for (const hostSlug of readdirSync(DST_ROOT)) {
    if (hostSlug.startsWith('.')) continue // preserves .gitkeep
    const hostDir = join(DST_ROOT, hostSlug)
    if (!statSync(hostDir).isDirectory()) continue
    for (const name of readdirSync(hostDir)) {
      if (!name.endsWith('.svg')) continue
      const p = join(hostDir, name)
      out.set(p, p)
    }
  }
  return out
}

function main() {
  ensureDir(DST_ROOT)
  const sources = walkSourceSvgs()
  const existingDst = walkExistingDst()

  let copied = 0
  let unchanged = 0
  for (const ref of sources) {
    ensureDir(join(DST_ROOT, ref.hostSlug))
    const src = readFileSync(ref.srcPath, 'utf8')
    if (
      existsSync(ref.dstPath) &&
      readFileSync(ref.dstPath, 'utf8') === src
    ) {
      unchanged += 1
      existingDst.delete(ref.dstPath)
      continue
    }
    writeFileSync(ref.dstPath, src)
    copied += 1
    existingDst.delete(ref.dstPath)
  }

  // Anything left in existingDst is stale -- source no longer exists.
  let stale = 0
  for (const p of existingDst.keys()) {
    rmSync(p)
    stale += 1
  }

  console.log(
    `copy-figures: ${sources.length} source SVGs (${copied} copied, ${unchanged} unchanged, ${stale} stale removed).`,
  )
}

main()
