import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import AppRoutes from './AppRoutes'

// SSR entry consumed by scripts/prerender.ts. Built with
// `vite build --ssr src/ssr-entry.tsx --outDir dist-ssr` before the
// prerender script imports the compiled output and calls render(url)
// once per known route.
//
// Also re-exports the content arrays: the prerender script needs to
// enumerate articles and patterns to know what URLs to render, and
// import.meta.glob is a Vite build-time transform -- it doesn't work
// at runtime under tsx/Node. Routing the content through the SSR
// bundle keeps a single source of truth (Vite resolves the globs
// once, at SSR build time).
export { articles, cruxtags, patterns } from './content'

export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}
