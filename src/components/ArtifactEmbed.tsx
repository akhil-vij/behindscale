import { useEffect, useRef, useState } from 'react'
import { track } from '@vercel/analytics'

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
//
// Unit 10 instrumentation:
//
//   - artifact_viewed: IntersectionObserver on the wrapper, fires
//     once on first intersection at threshold=0.5.
//   - artifact_interacted: postMessage from the iframe (the
//     entryStub posts {type:'artifact:interacted', slug} on first
//     pointerdown). Parent gates by event.source comparison (NOT
//     origin -- the sandboxed frame has opaque origin so
//     event.origin === "null"; an origin allowlist would be
//     meaningless here). See architecture.md Article Reading Arc.
//
// Both are useEffect-gated; SSR never touches window or
// IntersectionObserver.

interface ArtifactEmbedProps {
  artifactPath: string
  articleSlug: string
  articleTitle: string
}

const IFRAME_HEIGHT_PX = 600

export default function ArtifactEmbed({
  artifactPath,
  articleSlug,
  articleTitle,
}: ArtifactEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // HEAD probe -- catches load failures the iframe's onerror misses.
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

  // artifact_viewed via IntersectionObserver.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          track('artifact_viewed', { slug: articleSlug })
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [articleSlug])

  // artifact_interacted via postMessage from the sandboxed iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Source comparison, not origin -- a sandboxed frame's origin
      // is the string "null" so an origin allowlist would be
      // meaningless. The source check pins the message to THIS
      // iframe's contentWindow regardless of origin.
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data as { type?: string } | null
      if (!data || data.type !== 'artifact:interacted') return
      track('artifact_interacted', { slug: articleSlug })
      window.removeEventListener('message', handleMessage)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [articleSlug])

  if (loadFailed) {
    return <ErrorFrame />
  }

  return (
    <div
      ref={wrapperRef}
      className="rounded-xl border border-art-border bg-art-bg overflow-hidden shadow-sm"
    >
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
