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
//
// v7.3 problem-page port (2026-09-06): the host<->artifact protocol
// generalizes the same door. `onMessage` receives every message whose
// `event.source` is THIS iframe's contentWindow (the gate lives here, once)
// together with a `reply()` that posts back into the frame; `height`
// overrides the fixed pixel height so a host can size the frame from the
// artifact's own `size` message (or make it the scrollport on phones);
// `noscript` renders a one-line no-JS fallback in the frame's position.

interface ArtifactEmbedProps {
  artifactPath: string
  // The host's slug/title (article OR pattern, etc. -- the ContentHost
  // convergence, docs/pattern-artifacts-design.md §5). Analytics payload
  // keeps the `{ slug }` shape unchanged.
  hostSlug: string
  hostTitle: string
  // `bare` drops the component's own dark frame + "Open in full" footer so it
  // can mount inside a caller-supplied shell (e.g. the pattern page's mechanism
  // section, which provides its own border + "OPEN FULL SCREEN" link). The HEAD
  // probe, error frame (invariant 2), and analytics are unchanged.
  bare?: boolean
  // Override the fixed iframe height (default 600). The mechanism-section
  // mount runs shorter to match the artifact's content.
  heightPx?: number
  // A CSS height that wins over `heightPx` when set (e.g. `${h}px` from the
  // artifact's size message, or '90dvh' for the phone scrollport mode).
  height?: string
  // Override the iframe's accessible title (default names the host).
  title?: string
  // Source-gated message handler: called for every message posted by THIS
  // iframe's window. `reply` posts back into the frame (target '*' -- the
  // sandboxed frame's origin is opaque, so there is nothing to pin).
  onMessage?: (data: unknown, reply: (message: unknown) => void) => void
  // One-line no-JS fallback rendered where the iframe sits.
  noscript?: string
  // Optional detail after that line, as HTML the caller has already escaped
  // (the mission's static outline as plain lists). Same dashed frame.
  noscriptDetail?: string
  // Wrapper element attributes (an anchor id for in-page nav, extra classes).
  wrapperId?: string
  wrapperClassName?: string
}

const IFRAME_HEIGHT_PX = 600

export default function ArtifactEmbed({
  artifactPath,
  hostSlug,
  hostTitle,
  bare = false,
  heightPx = IFRAME_HEIGHT_PX,
  height,
  title,
  onMessage,
  noscript,
  noscriptDetail,
  wrapperId,
  wrapperClassName,
}: ArtifactEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // Latest handler without re-subscribing the listener on every render.
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

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
          track('artifact_viewed', { slug: hostSlug })
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hostSlug])

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
      track('artifact_interacted', { slug: hostSlug })
      window.removeEventListener('message', handleMessage)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [hostSlug])

  // Host protocol messages (same source gate; the handler decides what the
  // payload means). Subscribed once per mount; the ref carries the latest
  // callback.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const frame = iframeRef.current
      if (!frame || event.source !== frame.contentWindow) return
      const handler = onMessageRef.current
      if (!handler) return
      handler(event.data, (message) => {
        frame.contentWindow?.postMessage(message, '*')
      })
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (loadFailed) {
    return <ErrorFrame />
  }

  const frame = (
    <iframe
      ref={iframeRef}
      src={artifactPath}
      sandbox="allow-scripts"
      title={title ?? `Interactive visualization for "${hostTitle}"`}
      className="block w-full border-0"
      style={{ height: height ?? `${heightPx}px` }}
      onError={() => {
        console.warn(`[artifact] iframe onerror for ${artifactPath}`)
        setLoadFailed(true)
      }}
    />
  )

  // The no-JS line goes through innerHTML so server and client agree
  // byte-for-byte: browsers with scripting on keep <noscript> content as
  // raw text, which is exactly what React compares on hydration. The
  // prerendered <iframe> still loads without scripting (a dark, empty
  // frame), so the same <noscript> hides it and the fallback takes its place.
  const hideFrame = wrapperId !== undefined ? `<style>#${wrapperId} iframe{display:none}</style>` : ''
  const noscriptEl =
    noscript !== undefined ? (
      <noscript
        dangerouslySetInnerHTML={{
          __html: `${hideFrame}<div class="artifact-noscript"><p>${escapeHtml(noscript)}</p>${noscriptDetail ?? ''}</div>`,
        }}
      />
    ) : null

  // Bare: just the iframe (the caller's shell owns the frame + full-screen
  // link). wrapperRef still hosts the IntersectionObserver for artifact_viewed.
  if (bare) {
    return (
      <div
        ref={wrapperRef}
        id={wrapperId}
        className={`overflow-hidden ${wrapperClassName ?? ''}`.trim()}
      >
        {frame}
        {noscriptEl}
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      id={wrapperId}
      className={`rounded-xl border border-art-border bg-art-bg overflow-hidden shadow-sm ${wrapperClassName ?? ''}`.trim()}
    >
      {frame}
      {noscriptEl}
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
