import { Link, useLocation, useNavigate } from 'react-router-dom'

// Navbar reframed in the 2026-07-08 landing/navigation phase: Problems +
// Patterns + Search (was Articles + Patterns). Wordmark links to the
// landing page. The workbench route was renamed /catalog -> /problems in
// the 2026-08 navigation-IA phase (D2); a 301 in vercel.json covers the
// old path.
//
// Search behavior:
// - On /problems, "Search" focuses the #problems-search input directly
//   (the workbench's search field, id assigned in Catalog.tsx).
// - On any other route, "Search" navigates to /problems first, then
//   focuses the input after mount. The setTimeout guard is a minimal
//   safety net -- React Router's navigate + hydration happen in the
//   same tick usually, but the input isn't guaranteed rendered at the
//   moment navigate() returns.

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const problemsActive =
    pathname === '/problems' || pathname.startsWith('/articles')
  const patternsActive = pathname.startsWith('/patterns')

  const linkClass = (active: boolean) =>
    `text-sm transition-colors ${
      active
        ? 'text-text-primary font-medium'
        : 'text-text-secondary hover:text-text-primary'
    }`

  const focusProblemsSearch = () => {
    const focus = () => {
      const el = document.getElementById(
        'problems-search',
      ) as HTMLInputElement | null
      el?.focus()
    }
    if (pathname === '/problems') {
      focus()
    } else {
      navigate('/problems')
      // Wait for hydration + first paint of the workbench before focusing.
      setTimeout(focus, 30)
    }
  }

  return (
    <header className="border-b border-border-default bg-bg-surface">
      <nav className="mx-auto flex h-14 max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-sans font-semibold tracking-tight text-text-primary"
        >
          <span
            className="inline-block h-3 w-3 rounded-sm bg-brand-gold"
            style={{ boxShadow: '0 0 0 3px rgba(245,184,65,0.18)' }}
            aria-hidden="true"
          />
          behindscale
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/problems" className={linkClass(problemsActive)}>
            Problems
          </Link>
          <Link to="/patterns" className={linkClass(patternsActive)}>
            Patterns
          </Link>
          <button
            type="button"
            onClick={focusProblemsSearch}
            className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            Search
          </button>
        </div>
      </nav>
    </header>
  )
}
