import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scroll behavior on route change. Two cases:
//
//   1. `#hash` present (e.g. clicking a landing preview row that
//      navigates to /catalog#term-single-table-scaling-ceiling, or
//      the article-page cruxTag chip's lateral link).
//      Scrolls to the element with the matching id, respecting the
//      `scroll-margin-top` the target sets so the anchor lands below
//      the sticky navbar.
//
//   2. No hash. Scrolls to the top of the page. React Router's
//      default is to preserve scroll position across navigations,
//      which is right for back/forward but wrong when the reader
//      clicks a pattern chip near the bottom of an article and
//      lands mid-page on the pattern detail.
//
// The hash-scroll path retries once after the next paint. Reason:
// when the navigation *also* swaps the component (/  ->
// /catalog#term-X), the target element isn't in the DOM at the
// moment the effect first fires. React Router runs sibling
// component effects in mount order, and the target component's
// tree may not have committed yet. `requestAnimationFrame` waits
// one paint frame -- enough for React to render the destination
// route.
//
// Refresh works today because the browser's own fragment handling
// runs on initial load once the DOM is ready; that path is
// unaffected. This component handles the client-side navigation
// case.

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    let cancelled = false
    // slice off the leading '#'; decode so an anchor id containing
    // encoded characters (unlikely, but safe) resolves correctly.
    const id = decodeURIComponent(hash.slice(1))

    const scrollToHash = () => {
      if (cancelled) return true
      const el = document.getElementById(id)
      if (!el) return false
      // scrollIntoView honors CSS `scroll-margin-top` on the
      // target -- Catalog group headers and pattern cards both
      // set 4.5rem so the anchor lands below the sticky navbar.
      el.scrollIntoView({ block: 'start' })
      return true
    }

    if (scrollToHash()) return

    // Element not in DOM yet -- the destination route probably
    // just mounted. Retry after the next paint.
    const raf = requestAnimationFrame(() => {
      scrollToHash()
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [pathname, hash])

  return null
}
