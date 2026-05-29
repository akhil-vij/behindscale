import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Resets window scroll to the top on every pathname change. Mount inside
// <HashRouter>, before <Routes>. React Router's default is to preserve
// scroll position across navigations, which is the right behavior when
// you're navigating within a long page (back/forward) but feels broken
// when you jump between unrelated routes -- e.g. clicking a pattern
// chip near the bottom of an article and landing mid-page on the
// pattern detail.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
