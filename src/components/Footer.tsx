import { Link } from 'react-router-dom'

// Site footer, shared by the landing and every inner page (findability task 10:
// inner pages were dead ends). Wordmark + primary nav + the RSS feed + the
// first-party promise. /rss.xml is a static build artifact (scripts/
// generate-feed.ts), not a React route, so it's a plain anchor.
export default function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-subtle">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-8">
        <Link
          to="/"
          className="flex items-center gap-2 font-sans font-semibold tracking-tight text-text-primary"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-gold"
            aria-hidden="true"
          />
          behindscale
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/problems" className="text-sm text-text-secondary hover:text-text-primary">
            Problems
          </Link>
          <Link to="/patterns" className="text-sm text-text-secondary hover:text-text-primary">
            Patterns
          </Link>
          <Link to="/sources" className="text-sm text-text-secondary hover:text-text-primary">
            Sources
          </Link>
          <a
            href="/rss.xml"
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            RSS
          </a>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-text-muted">
          First-party engineering blogs only
        </span>
      </div>
    </footer>
  )
}
