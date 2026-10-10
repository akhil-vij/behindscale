#!/usr/bin/env tsx
// Build-time artifact compiler. Walks content/artifacts/*.jsx, compiles
// each into a self-contained ESM bundle plus a minimal HTML shell at
// public/artifacts/{slug}/. Each bundle ships its own React copy --
// architecture.md decision: artifacts are self-contained for fault
// isolation, not optimization.
//
// Failure semantics per invariant 2: per-artifact esbuild failures
// stderr-log + skip + clean up partial output + continue. Never fail
// the build. The missing bundle surfaces at runtime as an iframe load
// error, which the parent's ArtifactEmbed handler turns into the muted
// error frame on the article page. Other artifacts and the rest of the
// site are unaffected.

import { build } from 'esbuild'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { standalonePageFor, standalonePages, type StandaloneResult } from './artifact-pages'
import { loadContent } from './load-content'

const ARTIFACTS_SRC_DIR = 'content/artifacts'
const ARTIFACTS_OUT_DIR = 'public/artifacts'
// The site's default share image (public/og-default.png; see
// scripts/prerender.ts and scripts/check-share-images.ts).
const SITE_URL = 'https://www.behindscale.com'
const SITE_NAME = 'behindscale'
const OG_IMAGE = `${SITE_URL}/og-default.png`

// Minimal HTML shell. Inline styles for dark background + font fallback
// so the artifact paints something coherent even before its bundle
// executes. Loads index.js as a module; the bundle does the React
// mount inside its top-level error boundary (see entryStub below).
//
// The script src must be slug-absolute, NOT relative (./index.js).
// Reason (Unit 9 regression caught 2026-06-11): Vercel's cleanUrls
// 308-redirects /artifacts/<slug>/index.html -> /artifacts/<slug>
// (no trailing slash). The browser then resolves a relative
// `./index.js` against `/artifacts/`, asking for `/artifacts/index.js`
// (404). A slug-absolute path always resolves correctly regardless
// of how Vercel rewrites the iframe URL.
//
// The same file is the "Open full screen" page people share directly, so it
// carries its own head (name, teaser, canonical, share image; see
// scripts/artifact-pages.ts) and a slim bar back to the site: the wordmark
// home and "Read the full breakdown" to the page the artifact belongs to.
// The bar ships `hidden` and an inline script reveals it only when the page
// is the top-level window, so it can never show inside our own embeds (the
// sandboxed iframe still sees window.top, just not its contents). Colours are
// the ui-context.md artifact tokens (--art-bg, --art-border, --art-text,
// --art-text-muted, --brand-gold), inlined because the shell loads no CSS.
function htmlShell(slug: string, standalone: StandaloneResult): string {
  const page = standalone.ok ? standalone.page : undefined
  const title = page ? `${page.name} · ${SITE_NAME}` : `${SITE_NAME} simulation`
  const canonical = `${SITE_URL}/artifacts/${slug}`
  const describe = page
    ? `
    <meta name="description" content="${escapeAttr(page.description)}" />
    <meta property="og:description" content="${escapeAttr(page.description)}" />`
    : ''
  const breakdown = page
    ? `<a class="bs-bar-link" href="${escapeAttr(page.parentPath)}">Read the full breakdown <span aria-hidden="true">→</span></a>`
    : ''
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeAttr(title)}</title>${describe}
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    <style>
      html, body, #root { margin: 0; padding: 0; min-height: 100%; }
      body { background: #08090D; color: #C8CDD8; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
      .bs-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #1F2333; font-size: 14px; line-height: 1.3; }
      .bs-bar[hidden] { display: none; }
      .bs-bar a { color: #C8CDD8; text-decoration: none; }
      .bs-bar a:hover, .bs-bar a:focus-visible { color: #EDEFF3; text-decoration: underline; }
      .bs-bar-home { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
      .bs-bar-home::before { content: ""; width: 10px; height: 10px; border-radius: 2px; background: #F5B841; }
      .bs-bar-link { text-align: right; }
    </style>
  </head>
  <body>
    <header class="bs-bar" id="bs-standalone-bar" hidden>
      <a class="bs-bar-home" href="/">${SITE_NAME}</a>
      ${breakdown}
    </header>
    <script>if (window.self === window.top) document.getElementById('bs-standalone-bar').hidden = false</script>
    <div id="root"></div>
    <script type="module" src="/artifacts/${slug}/index.js"></script>
  </body>
</html>
`
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// The per-artifact entry that esbuild bundles. Imports the artifact's
// default export, wraps it in a top-level error boundary that converts
// a render exception into the same muted error message the parent
// renders for load failures (architecture.md invariant 2: two failure
// modes -> one visible surface).
//
// Also installs the Unit 10 first-pointerdown emitter that posts
// {type: 'artifact:interacted', slug} to window.parent. The iframe
// runs with sandbox=allow-scripts (no allow-same-origin), so the
// parent can't read contentDocument; postMessage is the only direction
// the boundary allows -- this is the "never loosen sandbox, widen
// postMessage instead" decision (invariant 2 / Unit 5b) instantiated.
// Target origin is '*' because the sandbox makes the frame's own
// origin opaque and the parent origin varies between local dev and
// prod; the parent gates on event.source comparison, which is the
// correct mechanism for sandboxed-iframe -> parent messages.
function entryStub(sourcePath: string, slug: string): string {
  return `
import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import Artifact from './${sourcePath}'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error) {
    console.error('[artifact] render error:', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '12rem',
          padding: '2rem',
          color: '#6B7280',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: '0.95rem',
        }}>
          This visualization couldn't load.
        </div>
      )
    }
    return this.props.children
  }
}

const root = createRoot(document.getElementById('root'))
root.render(<ErrorBoundary><Artifact /></ErrorBoundary>)

// Unit 10: fire artifact_interacted on first pointerdown, via
// postMessage to the parent. Capture phase so React's event
// delegation (which attaches at the root element during the bubble
// phase) can't preempt or stopPropagation away from us. The "once"
// semantic lives in a closure flag rather than {once:true}: it
// turns out {once:true} can be consumed by stray browser-internal
// pointer events during the bundle's initial render and the
// listener disappears before any real user interaction; the closure
// flag survives that race.
;(function () {
  var fired = false
  window.addEventListener('pointerdown', function () {
    if (fired) return
    fired = true
    try {
      window.parent.postMessage(
        { type: 'artifact:interacted', slug: ${JSON.stringify(slug)} },
        '*'
      )
    } catch (err) {
      // Parent unreachable, postMessage blocked, etc. Telemetry is
      // best-effort -- never break the artifact itself.
    }
  }, { passive: true, capture: true })
})()
`
}

interface CompileResult {
  readonly slug: string
  readonly ok: boolean
  readonly error?: string
}

async function compileArtifact(
  slug: string,
  sourcePath: string,
  standalone: StandaloneResult,
): Promise<CompileResult> {
  const outDir = join(ARTIFACTS_OUT_DIR, slug)
  try {
    mkdirSync(outDir, { recursive: true })
    await build({
      stdin: {
        contents: entryStub(sourcePath, slug),
        resolveDir: process.cwd(),
        loader: 'jsx',
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      jsx: 'automatic',
      outfile: join(outDir, 'index.js'),
      minify: true,
      loader: { '.jsx': 'jsx' },
      logLevel: 'silent',
    })
    writeFileSync(join(outDir, 'index.html'), htmlShell(slug, standalone))
    return { slug, ok: true }
  } catch (err) {
    // Clean up partial output so a failed compile leaves no trace.
    if (existsSync(outDir)) {
      try {
        rmSync(outDir, { recursive: true })
      } catch {
        // best-effort cleanup; original compile error is what matters
      }
    }
    return { slug, ok: false, error: (err as Error).message }
  }
}

async function main(): Promise<void> {
  if (!existsSync(ARTIFACTS_SRC_DIR)) {
    console.log('compile-artifacts: no content/artifacts/ directory; nothing to compile')
    return
  }

  const files = readdirSync(ARTIFACTS_SRC_DIR)
    .filter((n) => n.endsWith('.jsx'))
    .sort()

  if (files.length === 0) {
    console.log('compile-artifacts: no .jsx artifacts to compile')
    return
  }

  // Wipe the output directory so stale bundles from removed sources
  // don't accumulate. (Vercel builds are always fresh; this is for
  // local dev hygiene.)
  if (existsSync(ARTIFACTS_OUT_DIR)) {
    rmSync(ARTIFACTS_OUT_DIR, { recursive: true })
  }
  mkdirSync(ARTIFACTS_OUT_DIR, { recursive: true })

  console.log(
    `compile-artifacts: compiling ${files.length} artifact${files.length === 1 ? '' : 's'}`,
  )

  // Who owns each artifact, for its standalone page head + bar. `validate`
  // has already run, so the content loads clean here.
  const pages = standalonePages(loadContent().content)

  const results: CompileResult[] = []
  const orphans: string[] = []
  for (const file of files) {
    const slug = basename(file, '.jsx')
    const sourcePath = join(ARTIFACTS_SRC_DIR, file)
    const standalone = standalonePageFor(pages, slug)
    if (!standalone.ok) {
      orphans.push(`${slug} (${standalone.reason}${standalone.owners.length ? `: ${standalone.owners.join(', ')}` : ''})`)
    }
    const result = await compileArtifact(slug, sourcePath, standalone)
    results.push(result)
    if (result.ok) {
      console.log(`  ok   ${slug}`)
    } else {
      const oneLine = result.error?.split('\n')[0] ?? 'unknown error'
      console.error(`  skip ${slug}: ${oneLine}`)
    }
  }

  if (orphans.length > 0) {
    console.warn(
      `compile-artifacts: ${orphans.length} standalone page${orphans.length === 1 ? '' : 's'} with no single parent page (no breakdown link): ${orphans.join('; ')}`,
    )
  }

  const skipped = results.filter((r) => !r.ok).length
  if (skipped > 0) {
    console.error(
      `compile-artifacts: ${skipped} artifact${skipped === 1 ? '' : 's'} skipped; build proceeds (invariant 2)`,
    )
  }
  // Always exit 0 -- artifact failures are content errors that surface
  // at runtime, not build-breaking infrastructure errors.
}

main().catch((err) => {
  console.error('compile-artifacts: catastrophic error', err)
  process.exit(1)
})
