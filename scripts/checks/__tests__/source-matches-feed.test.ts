import { describe, it, expect } from 'vitest'
import { sourceMatchesFeed } from '../source-matches-feed'
import { makeContent, article, pattern, EXAMPLE_SOURCE } from './fixtures'
import type { Article } from '../../../src/types'

function withSource(slug: string, source: Partial<Article['source']>): Article {
  const a = article(slug, ['p1'])
  return { ...a, source: { ...a.source, ...source } }
}

describe('sourceMatchesFeed', () => {
  it('passes when the source block equals its feeds entry', () => {
    const content = makeContent({ articles: [article('foo', ['p1'])], patterns: [pattern('p1')] })
    expect(sourceMatchesFeed.run(content)).toEqual([])
  })

  it('flags a source slug the allowlist does not have', () => {
    const content = makeContent({
      articles: [withSource('foo', { slug: 'someones-substack' })],
      patterns: [pattern('p1')],
    })
    const errors = sourceMatchesFeed.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      articleSlug: 'foo',
      message: expect.stringContaining('`someones-substack` is not in content/feeds.json'),
    })
  })

  it('names every field that differs, with both values', () => {
    const content = makeContent({
      articles: [
        withSource('foo', {
          url: 'https://example.com/engineering/',
          feed: 'https://example.com/engineering',
        }),
      ],
      patterns: [pattern('p1')],
    })
    const errors = sourceMatchesFeed.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('`url` (has "https://example.com/engineering/"')
    expect(errors[0]?.message).toContain(`allowlist "${EXAMPLE_SOURCE.feed}"`)
    expect(errors[0]?.message).not.toContain('`name`')
    expect(errors[0]?.fix).toEqual([
      'copy the `example-engineering` entry from content/feeds.json into "source" verbatim',
    ])
  })

  it('reports each drifted article in one pass', () => {
    const content = makeContent({
      articles: [
        withSource('a', { company: 'Example Inc' }),
        article('b', ['p1']),
        withSource('c', { name: 'Example Eng' }),
      ],
      patterns: [pattern('p1')],
    })
    expect(sourceMatchesFeed.run(content).map((e) => e.articleSlug)).toEqual(['a', 'c'])
  })
})
