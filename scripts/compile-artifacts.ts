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

const ARTIFACTS_SRC_DIR = 'content/artifacts'
const ARTIFACTS_OUT_DIR = 'public/artifacts'

// Minimal HTML shell. Inline styles for dark background + font fallback
// so the artifact paints something coherent even before its bundle
// executes. Loads index.js as a module; the bundle does the React
// mount inside its top-level error boundary (see entryStub below).
const HTML_SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>behindscale artifact</title>
    <style>
      html, body, #root { margin: 0; padding: 0; min-height: 100%; }
      body { background: #08090D; color: #C8CDD8; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.js"></script>
  </body>
</html>
`

// The per-artifact entry that esbuild bundles. Imports the artifact's
// default export, wraps it in a top-level error boundary that converts
// a render exception into the same muted error message the parent
// renders for load failures (architecture.md invariant 2: two failure
// modes -> one visible surface).
function entryStub(sourcePath: string): string {
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
): Promise<CompileResult> {
  const outDir = join(ARTIFACTS_OUT_DIR, slug)
  try {
    mkdirSync(outDir, { recursive: true })
    await build({
      stdin: {
        contents: entryStub(sourcePath),
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
    writeFileSync(join(outDir, 'index.html'), HTML_SHELL)
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

  const results: CompileResult[] = []
  for (const file of files) {
    const slug = basename(file, '.jsx')
    const sourcePath = join(ARTIFACTS_SRC_DIR, file)
    const result = await compileArtifact(slug, sourcePath)
    results.push(result)
    if (result.ok) {
      console.log(`  ok   ${slug}`)
    } else {
      const oneLine = result.error?.split('\n')[0] ?? 'unknown error'
      console.error(`  skip ${slug}: ${oneLine}`)
    }
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
