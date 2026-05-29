import { useParams } from 'react-router-dom'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <p className="font-mono text-text-muted text-sm uppercase tracking-wide">
        Route: /articles/:slug
      </p>
      <h1 className="text-3xl font-semibold text-text-primary tracking-tight mt-2">
        Article Detail
      </h1>
      <p className="text-text-secondary mt-4">
        slug ={' '}
        <code className="font-mono text-text-primary">{slug}</code>
      </p>
      <p className="text-text-secondary mt-4">
        Stub — real reading view lands in Unit 3c.
      </p>
    </main>
  )
}
