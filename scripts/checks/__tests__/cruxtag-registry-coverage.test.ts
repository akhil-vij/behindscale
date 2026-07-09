import { describe, it, expect } from 'vitest'
import { cruxTagRegistryCoverage } from '../cruxtag-registry-coverage'
import { makeContent, article, pattern } from './fixtures'
import type { Article, CruxTagRegistry } from '../../../src/types'

function articleWithTag(slug: string, cruxTag: string): Article {
  return { ...article(slug, ['p1']), cruxTag }
}

const REGISTRY_ONE: CruxTagRegistry = {
  'known-bottleneck': {
    label: 'Known bottleneck',
    definition: 'A test cruxTag entry that covers one article.',
  },
}

describe('cruxTagRegistryCoverage', () => {
  it('passes when every article`s cruxTag has a registry entry', () => {
    const content = makeContent({
      articles: [articleWithTag('a', 'known-bottleneck')],
      patterns: [pattern('p1')],
      cruxTagRegistry: REGISTRY_ONE,
    })
    expect(cruxTagRegistryCoverage.run(content)).toEqual([])
  })

  it('errors on an article whose cruxTag is missing from the registry', () => {
    const content = makeContent({
      articles: [articleWithTag('a', 'orphan-tag')],
      patterns: [pattern('p1')],
      cruxTagRegistry: REGISTRY_ONE,
    })
    const errors = cruxTagRegistryCoverage.run(content)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.articleSlug).toBe('a')
    expect(errors[0]?.message).toMatch(/orphan-tag/)
    expect(errors[0]?.severity).toBeUndefined()
  })

  it('allows a registry entry with zero matching articles (no reverse orphan check)', () => {
    const registry: CruxTagRegistry = {
      ...REGISTRY_ONE,
      'unused-entry': {
        label: 'Unused entry',
        definition: 'Never referenced by any article -- allowed by design.',
      },
    }
    const content = makeContent({
      articles: [articleWithTag('a', 'known-bottleneck')],
      patterns: [pattern('p1')],
      cruxTagRegistry: registry,
    })
    expect(cruxTagRegistryCoverage.run(content)).toEqual([])
  })

  it('reports each article independently when several tags are missing', () => {
    const content = makeContent({
      articles: [
        articleWithTag('one', 'known-bottleneck'),
        articleWithTag('two', 'missing-a'),
        articleWithTag('three', 'missing-b'),
      ],
      patterns: [pattern('p1')],
      cruxTagRegistry: REGISTRY_ONE,
    })
    const errors = cruxTagRegistryCoverage.run(content)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.articleSlug).sort()).toEqual(['three', 'two'])
  })

  it('emits nothing when the article set is empty', () => {
    const content = makeContent({
      articles: [],
      patterns: [pattern('p1')],
      cruxTagRegistry: REGISTRY_ONE,
    })
    expect(cruxTagRegistryCoverage.run(content)).toEqual([])
  })
})
