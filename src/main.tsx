import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import AppRoutes from './AppRoutes'
import './index.css'

// Self-hosted webfonts (invariant 1 -- no runtime network fetching for
// content; fonts are bundled by Vite at build time).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

// hydrateRoot, not createRoot: the per-route HTML is emitted at build
// time by scripts/prerender.ts; React's job here is to take over the
// already-rendered DOM and wire up interactivity (navigation, source
// filter, artifact iframe HEAD probe). See architecture.md Rendering
// section for the build-time + runtime split.
//
// <Analytics /> mounts client-only at the client entry, never inside
// AppRoutes. The SSR entry (ssr-entry.tsx) imports only AppRoutes, so
// the analytics tracker is never invoked during prerender. Invariant
// 1's spirit is preserved: analytics is a progressive enhancement,
// not content (architecture.md Article Reading Arc / Unit 10).
hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)
