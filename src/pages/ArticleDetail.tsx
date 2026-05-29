import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { articleBySlug, patternBySlug } from '../content'
import PatternChip from '../components/PatternChip'
import Prose from '../components/Prose'
import SourceAttribution from '../components/SourceAttribution'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? articleBySlug.get(slug) : undefined

  // Skip + flag on missing entry per invariant 6 — never crash.
  if (!article) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Article not found
        </h1>
        <p className="mt-4 text-text-secondary">
          No article with slug{' '}
          <code className="font-mono text-text-primary">
            {slug ?? '(missing)'}
          </code>{' '}
          exists in the library.
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

  return (
    <article className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        {article.title}
      </h1>
      <div className="mt-3">
        <SourceAttribution
          source={article.source}
          publishedAt={article.publishedAt}
          variant="header"
          articleUrl={article.url}
        />
      </div>
      <p className="mt-6 text-lg leading-relaxed text-text-secondary">
        {article.summary}
      </p>

      <Section title="Problem">
        <Prose>{article.problem}</Prose>
      </Section>

      <Section title="Solution">
        <Prose>{article.solution}</Prose>
      </Section>

      {article.tradeoffs.length > 0 && (
        <Section title="Tradeoffs">
          <ul className="mt-4 flex list-none flex-col gap-3">
            {article.tradeoffs.map((tradeoff, i) => (
              <li
                key={i}
                className="leading-relaxed text-text-secondary"
              >
                {tradeoff}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {article.patterns.length > 0 && (
        <Section title="Patterns in this article">
          <ul className="mt-4 flex list-none flex-col gap-5">
            {article.patterns.map((ref) => {
              const def = patternBySlug.get(ref.slug)
              return (
                <li key={ref.slug} className="flex flex-col items-start gap-2">
                  <PatternChip
                    slug={ref.slug}
                    name={def?.name ?? ref.slug}
                    category={def?.category}
                  />
                  <p className="leading-relaxed text-text-secondary">
                    {ref.note}
                  </p>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}
