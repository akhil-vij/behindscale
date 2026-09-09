import { describe, it, expect } from 'vitest'
import { articles, patterns } from '../../content'
import { matchTerms } from '../search'
import { articleTerms, patternTerms } from '../searchTerms'

// The list pages surface a result when matchTerms(query, terms) is non-null.
// These helpers apply that exact gate to the REAL content so the Batch 3
// minimum-bar recall targets are enforced against what actually ships.
function articleHits(q: string): string[] {
  return articles
    .filter((a) => matchTerms(q, articleTerms(a)) !== null)
    .map((a) => a.slug)
}
function patternHits(q: string): string[] {
  return patterns
    .filter((p) => matchTerms(q, patternTerms(p)) !== null)
    .map((p) => p.slug)
}

describe('list search recall (Batch 3 minimum bar)', () => {
  // Passes today via the full-definition second net (note 1): seven pattern
  // definitions contain "backlog". Authored aliases will sharpen the top hits;
  // recall already clears the bar without any keyword data.
  it('"backlog" on /patterns returns >= 2 patterns', () => {
    const hits = patternHits('backlog')
    expect(hits.length).toBeGreaterThanOrEqual(2)
    expect(hits).toContain('durable-front-buffer')
  })

  // Passes today: the codename is in the article TITLE. The other articles that
  // mention "Orpheus" only in body prose are correctly NOT returned -- bodies
  // are unindexed, which is exactly what keeps the extra recall trustworthy.
  it('"Orpheus" finds the Airbnb idempotency article, and only Airbnb', () => {
    const hits = articleHits('Orpheus')
    expect(hits).toContain('airbnb-orpheus-idempotent-payments')
    const companies = new Set(
      articles.filter((a) => hits.includes(a.slug)).map((a) => a.source.company),
    )
    expect(companies).toEqual(new Set(['Airbnb']))
  })

  // Tags are now indexed (F19): recall on "Kafka" rises from the two title hits
  // to the four kafka-TAGGED articles. Full recall needs keyword data on the
  // Kafka articles that carry no kafka tag -- see the pending test below.
  it('"Kafka" on /problems reaches the kafka-tagged articles (was title-only)', () => {
    const hits = articleHits('Kafka')
    for (const slug of [
      'doordash-rabbitmq-kafka',
      'segment-exactly-once-delivery',
      'uber-kafka-consumer-proxy',
      'slack-scaling-job-queue',
    ]) {
      expect(hits).toContain(slug)
    }
    expect(hits.length).toBeGreaterThanOrEqual(4)
  })

  // PENDING until keywords/articles.json lands. The corpus has SIX articles
  // that discuss Kafka (the brief's "7" predates the current set); two of them
  // -- segment-centrifuge-database-queue, uber-cadence-workflow-platform --
  // name Kafka only in body prose, which is (deliberately) unindexed. They need
  // `kafka` in keywords/articles.json to be found. Promote this to a real
  // assertion when that file arrives.
  it.todo('"Kafka" returns every article about Kafka (needs keywords/articles.json)')
})
