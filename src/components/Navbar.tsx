import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  const articlesActive = pathname === '/' || pathname.startsWith('/articles')
  const patternsActive = pathname.startsWith('/patterns')

  const linkClass = (active: boolean) =>
    `text-sm transition-colors ${
      active
        ? 'text-text-primary font-medium'
        : 'text-text-secondary hover:text-text-primary'
    }`

  return (
    <header className="border-b border-border-default bg-bg-surface">
      <nav className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-sans text-text-primary font-semibold tracking-tight"
        >
          behindscale
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass(articlesActive)}>
            Articles
          </Link>
          <Link to="/patterns" className={linkClass(patternsActive)}>
            Patterns
          </Link>
        </div>
      </nav>
    </header>
  )
}
