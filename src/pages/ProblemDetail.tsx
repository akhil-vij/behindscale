import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  articles,
  cruxtags,
  cruxTagByUrlSlug,
  patternBySlug,
} from '../content'
import SourceAttribution from '../components/SourceAttribution'

// Problem-class page (nav-IA Phase 3, D3). Renders one bottleneck class
// at `/problems/<urlSlug>` in STARTER state: everything is derived from
// article content (members, company count, embodied patterns) with no
// stored prose. The full-state essay branch (D3) lands in Phase 5, gated
// on `problemEssayBySlug.has(cruxTag)` -- until then every class is
// starter. Mirrors PatternDetail's structure and skip-and-flag posture
// (invariant 6: an unknown urlSlug renders an inline not-found, never
// throws).
export default function ProblemDetail() {
  const { urlSlug } = useParams<{ urlSlug: string }>()
  const cruxTag = urlSlug ? cruxTagByUrlSlug.get(urlSlug) : undefined

  if (!cruxTag) {
    return (
      <main className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Problem class not found
        </h1>
        <p className="mt-4 text-text-secondary">
          No problem class with slug{' '}
          <code className="font-mono text-text-primary">
            {urlSlug ?? '(missing)'}
          </code>{' '}
          exists.
        </p>
        <p className="mt-6">
          <Link
            to="/problems"
            className="text-accent-primary hover:text-accent-hover transition-colors"
          >
            ← Back to problems
          </Link>
        </p>
      </main>
    )
  }

  const entry = cruxtags[cruxTag]
  const label = entry?.label ?? cruxTag
  const definition = entry?.definition ?? ''

  // Members are already sorted publishedAt-desc (src/content/index.ts).
  const members = articles.filter((a) => a.cruxTag === cruxTag)
  const companyCount = new Set(members.map((a) => a.source.company)).size
  const companyLabel =
    companyCount === 1 ? '1 company' : `${companyCount} companies`

  // Patterns embodied by this class's members: union of members'
  // patterns[], deduped, resolved against the library, alphabetised.
  // Skip any slug without a definition (invariant 6).
  const classPatterns = Array.from(
    new Set(members.flatMap((a) => a.patterns.map((p) => p.slug))),
  )
    .map((slug) => patternBySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <article className="max-w-[720px] mx-auto px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
        Problem class
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
        {label}
      </h1>
      {definition && (
        <p className="mt-4 leading-relaxed text-text-secondary">{definition}</p>
      )}
      <p className="mt-4 font-mono text-xs text-text-muted">
        Seen at {companyLabel}
      </p>

      <Section title="Systems that hit this wall">
        {members.length === 0 ? (
          <p className="mt-4 text-text-secondary">
            No systems in this class yet.
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-4">
            {members.map((article) => (
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
                <p className="mt-2 leading-relaxed text-text-secondary">
                  {article.cruxSummary}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {classPatterns.length > 0 && (
        <Section title="Patterns in this class">
          <ul className="mt-4 flex flex-wrap gap-2">
            {classPatterns.map((pattern) => (
              <li key={pattern.slug}>
                <Link
                  to={`/patterns/${pattern.slug}`}
                  className="inline-flex items-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {pattern.name}
                </Link>
              </li>
            ))}
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
