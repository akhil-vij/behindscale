import { Link } from 'react-router-dom'

// Renders inside AppRoutes for both the /404 prerender (dist/404.html)
// and the runtime catchall ("*"). The shared component means the
// hand-typed-URL 404 and the unknown-route SPA fallback look identical.
export default function NotFound() {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
        Page not found
      </h1>
      <p className="mt-4 text-text-secondary">
        The page you're looking for doesn't exist on behindscale.
      </p>
      <p className="mt-6">
        <Link
          to="/"
          className="text-accent-primary hover:text-accent-hover transition-colors"
        >
          ← Back to articles
        </Link>
      </p>
    </main>
  )
}
