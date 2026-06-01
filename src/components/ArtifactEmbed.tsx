import { useEffect, useRef, useState } from 'react'

// Renders an artifact in a sandboxed iframe. Two failure modes converge
// to one visible surface (the muted error frame):
//
//   1. Load failure -- the bundle is missing (compile skipped) or
//      unreachable (network, 404). Detected here in the parent via a
//      HEAD probe AND iframe.onerror. Some browsers fire iframe.onload
//      even on 404s, so the HEAD probe is the reliable signal.
//   2. Render exception -- the artifact compiled fine but throws at
//      React render time. Caught by the iframe-internal ErrorBoundary
//      injected by scripts/compile-artifacts.ts.
//
// Per architecture.md invariant 2, both modes show the same muted
// single-line message in the same dark frame; the article still reads
// normally; other routes are unaffected.
//
// Sandbox attribute is exactly `allow-scripts`. Future capability
// needs go through postMessage, never by widening sandbox flags.

interface ArtifactEmbedProps {
  artifactPath: string
  articleTitle: string
}

const IFRAME_HEIGHT_PX = 600

export default function ArtifactEmbed({
  artifactPath,
  articleTitle,
}: ArtifactEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let canceled = false
    fetch(artifactPath, { method: 'HEAD' })
      .then((res) => {
        if (canceled) return
        if (!res.ok) {
          console.warn(
            `[artifact] load failed for ${artifactPath}: HTTP ${res.status}`,
          )
          setLoadFailed(true)
        }
      })
      .catch((err) => {
        if (canceled) return
        console.warn(
          `[artifact] load failed for ${artifactPath}: ${(err as Error).message}`,
        )
        setLoadFailed(true)
      })
    return () => {
      canceled = true
    }
  }, [artifactPath])

  if (loadFailed) {
    return <ErrorFrame />
  }

  return (
    <div className="rounded-xl border border-art-border bg-art-bg overflow-hidden shadow-sm">
      <iframe
        ref={iframeRef}
        src={artifactPath}
        sandbox="allow-scripts"
        title={`Interactive visualization for "${articleTitle}"`}
        className="block w-full border-0"
        style={{ height: `${IFRAME_HEIGHT_PX}px` }}
        onError={() => {
          console.warn(`[artifact] iframe onerror for ${artifactPath}`)
          setLoadFailed(true)
        }}
      />
      <div className="flex justify-end border-t border-art-border px-4 py-2">
        <a
          href={artifactPath}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-art-text-muted transition-colors hover:text-art-text"
        >
          Open in full <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  )
}

function ErrorFrame() {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-art-border bg-art-bg"
      style={{ minHeight: '12rem' }}
    >
      <p className="text-sm text-art-text-muted">
        This visualization couldn't load.
      </p>
    </div>
  )
}
