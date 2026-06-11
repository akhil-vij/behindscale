import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import NotFound from './components/NotFound'
import ScrollToTop from './components/ScrollToTop'
import ArticleDetail from './pages/ArticleDetail'
import ArticleIndex from './pages/ArticleIndex'
import PatternDetail from './pages/PatternDetail'
import PatternIndex from './pages/PatternIndex'

// Router-agnostic route tree. Wrapped at the two entry points:
//   src/main.tsx        wraps with BrowserRouter for client hydration
//   src/ssr-entry.tsx   wraps with StaticRouter for build-time prerender
//
// The /404 route exists so scripts/prerender.ts can emit dist/404.html;
// the trailing "*" catchall handles runtime navigation to unknown
// routes (single-page-app fallback before Vercel sees the URL).
export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <div className="min-h-full">
        <Navbar />
        <Routes>
          <Route path="/" element={<ArticleIndex />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/patterns" element={<PatternIndex />} />
          <Route path="/patterns/:slug" element={<PatternDetail />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}
