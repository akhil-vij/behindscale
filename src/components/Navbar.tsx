import { Link, useLocation, useNavigate } from 'react-router-dom'

// Navbar reframed in the 2026-07-08 landing/navigation phase: Catalog +
// Patterns + Search (was Articles + Patterns). Wordmark links to the
// landing page.
//
// Search behavior:
// - On /catalog, "Search" focuses the #catalog-search input directly
//   (the catalog's search field, id assigned in Catalog.tsx via
//   Commit 4).
// - On any other route, "Search" navigates to /catalog first, then
//   focuses the input after mount. The setTimeout guard is a minimal
//   safety net -- React Router's navigate + hydration happen in the
//   same tick usually, but the input isn't guaranteed rendered at the
//   moment navigate() returns.

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const catalogActive =
    pathname === '/catalog' || pathname.startsWith('/articles')
  const patternsActive = pathname.startsWith('/patterns')

  const linkClass = (active: boolean) =>
    `text-sm transition-colors ${
      active
        ? 'text-text-primary font-medium'
        : 'text-text-secondary hover:text-text-primary'
    }`

  const focusCatalogSearch = () => {
    const focus = () => {
      const el = document.getElementById(
        'catalog-search',
      ) as HTMLInputElement | null
      el?.focus()
    }
    if (pathname === '/catalog') {
      focus()
    } else {
      navigate('/catalog')
      // Wait for hydration + first paint of the catalog before focusing.
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
          <Link to="/catalog" className={linkClass(catalogActive)}>
            Catalog
          </Link>
          <Link to="/patterns" className={linkClass(patternsActive)}>
            Patterns
          </Link>
          <button
            type="button"
            onClick={focusCatalogSearch}
            className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            Search
          </button>
        </div>
      </nav>
    </header>
  )
}
