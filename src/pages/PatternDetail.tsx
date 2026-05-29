import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { articleBySlug, patternBySlug, patternStats } from '../content'
import Prose from '../components/Prose'
import SourceAttribution from '../components/SourceAttribution'

export default function PatternDetail() {
  const { slug } = useParams<{ slug: string }>()
  const pattern = slug ? patternBySlug.get(slug) : undefined

  // Skip + flag on missing entry per invariant 6 — never crash.
  if (!pattern) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Pattern not found
        </h1>
        <p className="mt-4 text-text-secondary">
          No pattern with slug{' '}
          <code className="font-mono text-text-primary">
            {slug ?? '(missing)'}
          </code>{' '}
          exists in the library.
        </p>
        <p className="mt-6">
          <Link
            to="/patterns"
            className="text-accent-primary hover:text-accent-hover transition-colors"
          >
            ← Back to patterns
          </Link>
        </p>
      </main>
    )
  }

  const stats = patternStats.get(pattern.slug)
  const seenIn = (stats?.articleSlugs ?? [])
    .map((articleSlug) => articleBySlug.get(articleSlug))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  return (
    <article className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        {pattern.name}
      </h1>
      {pattern.category && (
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-text-muted">
          {pattern.category}
        </p>
      )}

      <Section title="Definition">
        <Prose>{pattern.definition}</Prose>
      </Section>

      {pattern.whenItApplies.length > 0 && (
        <Section title="When it applies">
          <ul className="mt-4 flex list-none flex-col gap-3">
            {pattern.whenItApplies.map((item, i) => (
              <li key={i} className="leading-relaxed text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {pattern.tradeoffs.length > 0 && (
        <Section title="Tradeoffs">
          <ul className="mt-4 flex list-none flex-col gap-3">
            {pattern.tradeoffs.map((item, i) => (
              <li key={i} className="leading-relaxed text-text-secondary">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Seen in">
        {seenIn.length === 0 ? (
          <p className="mt-4 text-text-secondary">
            No articles embody this pattern yet.
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-4">
            {seenIn.map((article) => {
              const note = article.patterns.find(
                (p) => p.slug === pattern.slug,
              )?.note
              return (
                <li
                  key={article.slug}
                  className="rounded-xl border border-border-default bg-bg-surface p-5"
                >
                  <SourceAttribution
                    source={article.source}
                    publishedAt={article.publishedAt}
                    variant="card"
                  />
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    <Link
                      to={`/articles/${article.slug}`}
                      className="text-text-primary hover:text-accent-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-sm"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  {note && (
                    <p className="mt-2 leading-relaxed text-text-secondary">
                      {note}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>
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
