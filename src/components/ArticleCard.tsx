import { Link } from 'react-router-dom'
import type { Article } from '../types'
import { patternBySlug } from '../content'
import PatternChip from './PatternChip'
import SourceAttribution from './SourceAttribution'

const MAX_VISIBLE_CHIPS = 3

const OVERFLOW_CHIP_CLASSES =
  'inline-flex items-center rounded-md border border-border-default bg-bg-surface px-2 py-0.5 font-mono text-xs leading-5 text-text-secondary transition-colors hover:bg-bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary'

interface ArticleCardProps {
  article: Article
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const visiblePatterns = article.patterns.slice(0, MAX_VISIBLE_CHIPS)
  const overflowCount = article.patterns.length - visiblePatterns.length

  return (
    <article className="rounded-xl border border-border-default bg-bg-surface p-6">
      <SourceAttribution
        source={article.source}
        publishedAt={article.publishedAt}
        variant="card"
      />
      <h2 className="mt-3 text-xl font-semibold tracking-tight">
        <Link
          to={`/articles/${article.slug}`}
          className="text-text-primary hover:text-accent-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-sm"
        >
          {article.title}
        </Link>
      </h2>
      <p className="mt-3 text-text-secondary line-clamp-3">{article.summary}</p>
      {article.patterns.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {visiblePatterns.map((ref) => {
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
          {overflowCount > 0 && (
            <Link
              to={`/articles/${article.slug}`}
              className={OVERFLOW_CHIP_CLASSES}
              aria-label={`${overflowCount} more pattern${overflowCount === 1 ? '' : 's'}`}
            >
              +{overflowCount}
            </Link>
          )}
        </div>
      )}
    </article>
  )
}
