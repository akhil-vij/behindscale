import { describe, it, expect } from 'vitest'
import { isSource } from '../predicates'

const validSource = {
  name: 'Uber Engineering',
  slug: 'uber-engineering',
  company: 'Uber',
  url: 'https://www.uber.com/blog/engineering/',
  feed: 'https://www.uber.com/blog/engineering/rss/',
}

describe('Source', () => {
  it('accepts a fully-populated valid source', () => {
    expect(isSource(validSource)).toBe(true)
  })

  it('rejects an object missing the required slug field', () => {
    const malformed: Record<string, unknown> = { ...validSource }
    delete malformed.slug
    expect(isSource(malformed)).toBe(false)
  })

  it('rejects when name is the wrong type', () => {
    expect(isSource({ ...validSource, name: 42 })).toBe(false)
  })

  it('rejects null, undefined, and non-objects', () => {
    expect(isSource(null)).toBe(false)
    expect(isSource(undefined)).toBe(false)
    expect(isSource('not an object')).toBe(false)
    expect(isSource([validSource])).toBe(false)
  })
})
