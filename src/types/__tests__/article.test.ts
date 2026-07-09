import { describe, it, expect } from 'vitest'
import { isArticle } from '../predicates'

const validSource = {
  name: 'Stripe Engineering',
  slug: 'stripe-engineering',
  company: 'Stripe',
  url: 'https://stripe.com/blog/engineering',
  feed: 'https://stripe.com/blog/engineering.rss',
}

const validArticle = {
  slug: 'designing-robust-and-predictable-apis-with-idempotency',
  title: 'Designing robust and predictable APIs with idempotency',
  url: 'https://stripe.com/blog/idempotency',
  publishedAt: '2017-08-29',
  addedAt: '2026-05-29',
  source: validSource,
  summary: 'How Stripe makes payment APIs safe to retry by combining idempotency keys with atomic phase boundaries.',
  crux: 'Two of the three network-call failure modes leave the client unable to tell whether the operation happened, and for a payments API both guesses are catastrophic.',
  cruxTag: 'ambiguous-failure-under-retry',
  cruxSummary: 'A timed-out request leaves the client unable to tell whether it already happened.',
  problem: 'Network failures during payment requests leave the client uncertain whether the charge succeeded.',
  solution: 'Idempotency keys persisted alongside each phase let retries resume safely from the last committed boundary.',
  tradeoffs: [
    'Requires a durable key store with sufficient TTL.',
    'Adds per-request bookkeeping cost.',
  ],
  tags: ['payments', 'retries', 'idempotency'],
  patterns: [
    { slug: 'atomic-phases', note: 'Each network/DB step is its own commit point.' },
    { slug: 'bidirectional-idempotency', note: 'Both client and server agree on the key.' },
  ],
  relatedArticles: ['airbnb-reliable-workflows'],
  generatedAt: '2026-05-29T12:00:00.000Z',
  artifact: { path: '/artifacts/designing-robust-and-predictable-apis-with-idempotency/index.html' },
}

describe('Article', () => {
  it('accepts a fully-populated valid article (with relatedArticles, generatedAt, and artifact)', () => {
    expect(isArticle(validArticle)).toBe(true)
  })

  it('accepts an article without the optional relatedArticles field', () => {
    const { relatedArticles: _omit, ...withoutRelated } = validArticle
    void _omit
    expect(isArticle(withoutRelated)).toBe(true)
  })

  it('accepts an article without the optional generatedAt field', () => {
    const { generatedAt: _omit, ...withoutGenerated } = validArticle
    void _omit
    expect(isArticle(withoutGenerated)).toBe(true)
  })

  it('accepts an article with the optional updatedAt field', () => {
    expect(isArticle({ ...validArticle, updatedAt: '2026-06-12' })).toBe(true)
  })

  it('rejects when updatedAt is present but not a string', () => {
    expect(isArticle({ ...validArticle, updatedAt: 20260612 })).toBe(false)
  })

  it('rejects when crux is missing', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.crux
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects when crux is an empty string', () => {
    expect(isArticle({ ...validArticle, crux: '   ' })).toBe(false)
  })

  it('rejects when cruxTag is missing', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.cruxTag
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects a non-kebab-case cruxTag (uppercase)', () => {
    expect(isArticle({ ...validArticle, cruxTag: 'Ambiguous-Failure' })).toBe(false)
  })

  it('rejects a non-kebab-case cruxTag (leading hyphen)', () => {
    expect(isArticle({ ...validArticle, cruxTag: '-ambiguous-failure' })).toBe(false)
  })

  it('rejects a non-kebab-case cruxTag (double hyphen)', () => {
    expect(isArticle({ ...validArticle, cruxTag: 'ambiguous--failure' })).toBe(false)
  })

  it('rejects a non-kebab-case cruxTag (underscore)', () => {
    expect(isArticle({ ...validArticle, cruxTag: 'ambiguous_failure' })).toBe(false)
  })

  it('accepts multiple articles sharing the same cruxTag (reuse is the point)', () => {
    const stripe = { ...validArticle, slug: 'a', cruxTag: 'ambiguous-failure-under-retry' }
    const shopify = { ...validArticle, slug: 'b', cruxTag: 'ambiguous-failure-under-retry' }
    expect(isArticle(stripe)).toBe(true)
    expect(isArticle(shopify)).toBe(true)
  })

  it('rejects when cruxSummary is missing', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.cruxSummary
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects when cruxSummary is an empty string', () => {
    expect(isArticle({ ...validArticle, cruxSummary: '   ' })).toBe(false)
  })

  it('accepts a summary-only article (artifact = null)', () => {
    expect(isArticle({ ...validArticle, artifact: null })).toBe(true)
  })

  it('rejects when title is missing', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.title
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects when addedAt is missing (required field after Unit 9)', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.addedAt
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects when addedAt is present but not a string', () => {
    expect(isArticle({ ...validArticle, addedAt: 1717000000000 })).toBe(false)
  })

  it('rejects when source is malformed (missing feed)', () => {
    const badSource: Record<string, unknown> = { ...validSource }
    delete badSource.feed
    expect(isArticle({ ...validArticle, source: badSource })).toBe(false)
  })

  it('rejects when patterns is not an array', () => {
    expect(isArticle({ ...validArticle, patterns: 'atomic-phases' })).toBe(false)
  })

  it('rejects when any pattern reference in the array is malformed', () => {
    expect(
      isArticle({
        ...validArticle,
        patterns: [
          { slug: 'atomic-phases', note: 'fine' },
          { slug: 'no-note' },
        ],
      }),
    ).toBe(false)
  })

  it('rejects when tradeoffs contains a non-string element', () => {
    expect(isArticle({ ...validArticle, tradeoffs: ['ok', 42] })).toBe(false)
  })

  it('rejects when relatedArticles is present but not an array of strings', () => {
    expect(isArticle({ ...validArticle, relatedArticles: [1, 2] })).toBe(false)
  })

  it('rejects when generatedAt is present but not a string', () => {
    expect(isArticle({ ...validArticle, generatedAt: 1717000000000 })).toBe(false)
  })

  it('rejects when artifact is missing entirely (required field)', () => {
    const malformed: Record<string, unknown> = { ...validArticle }
    delete malformed.artifact
    expect(isArticle(malformed)).toBe(false)
  })

  it('rejects when artifact is malformed (path is not a string)', () => {
    expect(isArticle({ ...validArticle, artifact: { path: 42 } })).toBe(false)
  })

  it('rejects when artifact is a plain string instead of an object or null', () => {
    expect(isArticle({ ...validArticle, artifact: '/artifacts/foo' })).toBe(false)
  })

  it('accepts an artifact with the optional teaser field (Unit 10)', () => {
    expect(
      isArticle({
        ...validArticle,
        artifact: {
          path: '/artifacts/foo/index.html',
          teaser: 'Break each layer and watch what fails.',
        },
      }),
    ).toBe(true)
  })

  it('rejects when artifact.teaser is present but not a string', () => {
    expect(
      isArticle({
        ...validArticle,
        artifact: { path: '/artifacts/foo/index.html', teaser: 42 },
      }),
    ).toBe(false)
  })

  it('accepts an article with the optional stats array (Unit 10)', () => {
    expect(
      isArticle({
        ...validArticle,
        stats: [
          { value: '+80%', label: 'throughput under overload', placement: 'solution' },
          { value: '93%', label: 'fewer goroutines', placement: 'solution' },
        ],
      }),
    ).toBe(true)
  })

  it('accepts stats with placement = "tradeoffs"', () => {
    expect(
      isArticle({
        ...validArticle,
        stats: [{ value: '3x', label: 'tuning effort', placement: 'tradeoffs' }],
      }),
    ).toBe(true)
  })

  it('rejects stats when placement is not in the enum', () => {
    expect(
      isArticle({
        ...validArticle,
        stats: [{ value: '10x', label: 'speedup', placement: 'patterns' }],
      }),
    ).toBe(false)
  })

  it('rejects stats when an entry is missing label', () => {
    expect(
      isArticle({
        ...validArticle,
        stats: [{ value: '10x', placement: 'solution' }],
      }),
    ).toBe(false)
  })

  it('rejects when stats is present but not an array', () => {
    expect(isArticle({ ...validArticle, stats: 'two of them' })).toBe(false)
  })
})
