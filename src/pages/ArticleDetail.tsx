import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Article, ArticleStat } from '../types'
import { articleBySlug, articles, cruxtags, patternBySlug } from '../content'
import ArtifactEmbed from '../components/ArtifactEmbed'
import ArtifactTeaser from '../components/ArtifactTeaser'
import CruxCallout from '../components/CruxCallout'
import PatternChip from '../components/PatternChip'
import Prose from '../components/Prose'
import SourceAttribution from '../components/SourceAttribution'
import StatsRow from '../components/StatCallout'

// Article reading arc (Unit 10 + 2026-07-05 crux addition,
// architecture.md): header → top pattern chips (wayfinding) →
// summary → THE CRUX → artifact teaser → Problem →
// (stats[placement=problem]) → Solution → (stats[placement=solution])
// → ARTIFACT EMBED (anchor "#artifact") → Tradeoffs →
// (stats[placement=tradeoffs]) → Patterns (full, with notes).

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

  const statsByPlacement = (placement: ArticleStat['placement']): ArticleStat[] =>
    (article.stats ?? []).filter((s) => s.placement === placement)

  return (
    <article className="py-12">
      {/* Reading column at 720px for the narrative. */}
      <div className="max-w-[720px] mx-auto px-6">
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

        {/* Top pattern chips: wayfinding (Unit 10). Full "Patterns in
            this article" section with per-article notes stays at the
            bottom. */}
        {article.patterns.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.patterns.map((ref) => {
              const def = patternBySlug.get(ref.slug)
              return (
                <PatternChip
                  key={ref.slug}
                  slug={ref.slug}
                  name={def?.name ?? ref.slug}
                  category={def?.category}
                />
              )
            })}
          </div>
        )}

        <p className="mt-6 text-lg leading-relaxed text-text-secondary">
          {article.summary}
        </p>

        {/* THE CRUX (2026-07-05): the article's named bottleneck,
            placed before Problem so the is-this-my-problem scan
            happens first. Editorial (light) surface. Same crux is
            compressed inside the artifact's context block. The
            2026-07-08 landing/navigation phase added the cruxTag
            chip at the bottom of the callout as the article-page
            lateral link into the bottleneck taxonomy. */}
        <CruxCallout
          crux={article.crux}
          cruxTag={article.cruxTag}
          cruxTagLabel={cruxtags[article.cruxTag]?.label ?? article.cruxTag}
        />

        {/* Artifact teaser (Unit 10): renders only when teaser is
            present. Specificity principle. */}
        {article.artifact !== null && article.artifact.teaser && (
          <ArtifactTeaser teaser={article.artifact.teaser} />
        )}

        <Section title="Problem">
          <Prose>{article.problem}</Prose>
          <StatsRow stats={statsByPlacement('problem')} />
        </Section>

        <Section title="Solution">
          <Prose>{article.solution}</Prose>
          <StatsRow stats={statsByPlacement('solution')} />
        </Section>
      </div>

      {/* Artifact slot at 960px (Unit 10: moved between Solution and
          Tradeoffs). Width discontinuity (720 → 960 → 720) is by
          design per architecture.md Article Reading Arc. The id is
          the anchor target for ArtifactTeaser. */}
      {article.artifact !== null && (
        <div id="artifact" className="max-w-[960px] mx-auto px-6 mt-12">
          <ArtifactEmbed
            artifactPath={article.artifact.path}
            articleSlug={article.slug}
            articleTitle={article.title}
          />
        </div>
      )}

      <div className="max-w-[720px] mx-auto px-6">
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
            <StatsRow stats={statsByPlacement('tradeoffs')} />
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

        {/* "Also solving this" (2026-07-08): sibling articles that
            share this article's cruxTag. Rendered only when there
            is at least one sibling -- a single-article cruxTag skips
            the section rather than surfacing an empty "0 also
            solving this" list. The click destination on each
            sibling link goes straight to the article page; the
            cruxTag chip above already provides the "browse the
            whole class" affordance. */}
        <AlsoSolvingThis article={article} />
      </div>
    </article>
  )
}

function AlsoSolvingThis({ article }: { article: Article }) {
  const siblings = articles.filter(
    (a) => a.cruxTag === article.cruxTag && a.slug !== article.slug,
  )
  if (siblings.length === 0) return null

  const cruxTagLabel =
    cruxtags[article.cruxTag]?.label ?? article.cruxTag

  return (
    <Section title="Also solving this">
      <p className="mt-3 text-sm text-text-secondary">
        Other systems in behindscale's{' '}
        <Link
          to={`/catalog#term-${article.cruxTag}`}
          className="font-medium text-text-primary underline decoration-brand-gold underline-offset-4 hover:decoration-2"
        >
          {cruxTagLabel}
        </Link>{' '}
        class:
      </p>
      <ul className="mt-4 flex list-none flex-col gap-3">
        {siblings.map((s) => (
          <li key={s.slug} className="leading-relaxed">
            <Link
              to={`/articles/${s.slug}`}
              className="text-text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent-primary hover:text-accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              {s.title}
            </Link>
            <span className="ml-2 font-mono text-xs text-text-muted">
              {s.source.company}
            </span>
          </li>
        ))}
      </ul>
    </Section>
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
