import { articles } from '../content'
import ArticleCard from '../components/ArticleCard'

export default function ArticleIndex() {
  return (
    <main className="max-w-[960px] mx-auto px-6 py-12">
      {articles.length === 0 ? (
        <p className="text-text-secondary">No articles yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
