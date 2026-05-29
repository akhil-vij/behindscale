import { HashRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ArticleIndex from './pages/ArticleIndex'
import ArticleDetail from './pages/ArticleDetail'
import PatternIndex from './pages/PatternIndex'
import PatternDetail from './pages/PatternDetail'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-full">
        <Navbar />
        <Routes>
          <Route path="/" element={<ArticleIndex />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/patterns" element={<PatternIndex />} />
          <Route path="/patterns/:slug" element={<PatternDetail />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
