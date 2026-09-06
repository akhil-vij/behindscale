import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // `vite preview` mirrors production's static-asset CORS header. Artifact
  // iframes run with sandbox="allow-scripts" (opaque origin), and a module
  // script fetched from an opaque origin is a CORS request: without
  // Access-Control-Allow-Origin the browser blocks every artifact bundle.
  // Vercel sends `access-control-allow-origin: *` on static assets; the
  // preview server needs the same so the Playwright suite can exercise the
  // artifacts (added with the problem-page v7.3 port, 2026-09-06).
  preview: {
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
})
