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
})
