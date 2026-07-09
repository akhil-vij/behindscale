import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Client-side redirect for legacy /?source=<slug> URLs. Landed with the
// 2026-07-08 landing/navigation phase when the article feed moved from
// / to /catalog. Vercel-level 301 was explicitly skipped (low traffic;
// spec §5 "do it if cheap"), so this component handles it in the
// browser via useEffect.
//
// Rendered above <Landing /> inside the / route so it fires on hydration
// for the narrow case (a user landing on / with a stale source query
// string from a shared bookmark). The redirect uses navigate() with
// replace=true so the browser back button skips the intermediate
// state. On the common case (no ?source=), the effect no-ops and the
// component renders nothing.
//
// The redirect is client-only by design: SSR/StaticRouter renders the
// component to an empty string (the useEffect runs only in the
// browser), so dist/index.html stays free of a redirect flash.

export default function CatalogRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const source = searchParams.get('source')
    if (source) navigate(`/catalog?source=${source}`, { replace: true })
  }, [navigate, searchParams])

  return null
}
