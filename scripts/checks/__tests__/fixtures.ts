// In-memory fixtures for check tests. Each check is pure and synchronous
// (takes a ContentSet, returns errors), so tests construct the
// ContentSet directly without touching the filesystem.

import type {
  Article,
  CruxTagRegistry,
  PatternDefinition,
} from '../../../src/types'
import type { ContentSet } from '../../types'

export function article(slug: string, patternSlugs: readonly string[]): Article {
  return {
    slug,
    title: `Article ${slug}`,
    url: 'https://example.com/article',
    publishedAt: '2026-01-01',
    addedAt: '2026-01-02',
    source: {
      name: 'Example Engineering',
      slug: 'example-engineering',
      company: 'Example',
      url: 'https://example.com/engineering',
      feed: 'https://example.com/engineering.rss',
    },
    summary: '',
    crux: 'placeholder crux for test fixture -- not editorial output.',
    cruxTag: 'test-fixture-crux',
    cruxSummary: 'A one-line crux summary for the test fixture.',
    problem: '',
    solution: '',
    tradeoffs: [],
    tags: [],
    patterns: patternSlugs.map((s) => ({ slug: s, note: '' })),
    artifact: null,
  }
}

export function pattern(slug: string): PatternDefinition {
  return {
    slug,
    name: slug,
    definition: '',
    whenItApplies: [],
    tradeoffs: [],
  }
}

// A default registry that covers the fixture article's placeholder
// cruxTag, so tests that don't care about registry coverage don't
// trip cruxtag-registry-coverage by default. Tests that need
// registry variations pass a `cruxTagRegistry` override.
const DEFAULT_REGISTRY: CruxTagRegistry = {
  'test-fixture-crux': {
    label: 'Test fixture crux',
    definition: 'Placeholder cruxTag entry for test fixtures.',
  },
}

export function makeContent(input: {
  articles: readonly Article[]
  patterns: readonly PatternDefinition[]
  cruxTagRegistry?: CruxTagRegistry
}): ContentSet {
  return {
    articles: input.articles,
    patterns: input.patterns,
    cruxTagRegistry: input.cruxTagRegistry ?? DEFAULT_REGISTRY,
    articlePaths: new Map(
      input.articles.map((a) => [a.slug, `content/articles/${a.slug}.json`]),
    ),
    patternPaths: new Map(
      input.patterns.map((p) => [p.slug, `content/patterns/${p.slug}.json`]),
    ),
  }
}
