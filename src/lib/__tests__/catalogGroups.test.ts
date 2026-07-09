import { describe, it, expect } from 'vitest'
import {
  catalogGroups,
  canonicalCompanies,
  companySourceSlugMap,
} from '../catalogGroups'
import type { Article, CruxTagRegistry } from '../../types'

// Minimal Article fixture -- the grouping module only reads
// slug/title/source/cruxTag, so the rest is stubbed. Do not import
// from the checks/__tests__/fixtures.ts to keep the src/ boundary
// clean (checks tests operate on scripts/ ContentSet; this module
// tests a src/lib/ pure function).
function art(
  slug: string,
  cruxTag: string,
  company: string,
  sourceSlug = `${company.toLowerCase().replace(/\W+/g, '-')}-eng`,
): Article {
  return {
    slug,
    title: `Article ${slug}`,
    url: 'https://example.com',
    publishedAt: '2026-01-01',
    addedAt: '2026-01-01',
    source: {
      name: `${company} Engineering`,
      slug: sourceSlug,
      company,
      url: 'https://example.com',
      feed: 'https://example.com/rss',
    },
    summary: '',
    crux: 'placeholder crux for grouping test.',
    cruxTag,
    cruxSummary: 'placeholder crux summary.',
    problem: '',
    solution: '',
    tradeoffs: [],
    tags: [],
    patterns: [],
    artifact: null,
  }
}

const REGISTRY: CruxTagRegistry = {
  'priority-blind-load-shedding': {
    label: 'Priority-blind load shedding',
    definition: 'Shedding without priority.',
  },
  'single-table-scaling-ceiling': {
    label: 'Single-table scaling ceiling',
    definition: 'A single table outgrows its instance.',
  },
  'partial-completion-under-crashes': {
    label: 'Partial completion under crashes',
    definition: 'Interruption between steps.',
  },
}

describe('catalogGroups', () => {
  it('groups articles by cruxTag and returns count + companies per group', () => {
    const groups = catalogGroups({
      articles: [
        art('netflix', 'priority-blind-load-shedding', 'Netflix'),
        art('uber', 'priority-blind-load-shedding', 'Uber'),
        art('figma', 'single-table-scaling-ceiling', 'Figma'),
      ],
      registry: REGISTRY,
    })
    expect(groups).toHaveLength(2)
    const shed = groups.find((g) => g.slug === 'priority-blind-load-shedding')
    expect(shed?.count).toBe(2)
    expect(shed?.companies).toEqual(['Netflix', 'Uber'])
    expect(shed?.label).toBe('Priority-blind load shedding')
  })

  it('sorts groups by count descending, alphabetical label as tie-break', () => {
    const groups = catalogGroups({
      articles: [
        // 1 article each in two groups; tie-broken alphabetically.
        art('a', 'single-table-scaling-ceiling', 'Figma'),
        art('b', 'partial-completion-under-crashes', 'Airbnb'),
        // 2 articles in a third group -- should sort first.
        art('c', 'priority-blind-load-shedding', 'Netflix'),
        art('d', 'priority-blind-load-shedding', 'Uber'),
      ],
      registry: REGISTRY,
    })
    expect(groups.map((g) => g.slug)).toEqual([
      'priority-blind-load-shedding',
      'partial-completion-under-crashes',
      'single-table-scaling-ceiling',
    ])
  })

  it('dedupes company entries within a group (canonical source.company)', () => {
    const groups = catalogGroups({
      articles: [
        // Two Uber articles under one crux -- should collapse to one company.
        art('a', 'priority-blind-load-shedding', 'Uber', 'uber-blog-1'),
        art('b', 'priority-blind-load-shedding', 'Uber', 'uber-blog-2'),
      ],
      registry: REGISTRY,
    })
    expect(groups[0]?.companies).toEqual(['Uber'])
  })

  it('renders an unlabeled slug when the registry lacks an entry (skip + flag)', () => {
    const groups = catalogGroups({
      articles: [art('a', 'unknown-tag', 'Netflix')],
      registry: REGISTRY,
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('unknown-tag')
    expect(groups[0]?.definition).toBe('')
  })

  it('returns an empty array for an empty article set', () => {
    expect(catalogGroups({ articles: [], registry: REGISTRY })).toEqual([])
  })
})

describe('canonicalCompanies', () => {
  it('returns distinct source.company values sorted alphabetically', () => {
    const companies = canonicalCompanies([
      art('a', 't1', 'Uber'),
      art('b', 't2', 'Netflix'),
      art('c', 't3', 'Amazon (AWS)'),
      // Duplicate company -- distinct source.slug -- collapses to one entry.
      art('d', 't1', 'Uber', 'uber-blog-2'),
    ])
    expect(companies).toEqual(['Amazon (AWS)', 'Netflix', 'Uber'])
  })
})

describe('companySourceSlugMap', () => {
  it('maps each canonical company to one representative source slug', () => {
    const map = companySourceSlugMap([
      art('a', 't1', 'Netflix', 'netflix-tech'),
      art('b', 't2', 'Uber', 'uber-eng'),
      // Second Uber article shouldn't override the first mapping.
      art('c', 't3', 'Uber', 'uber-blog-2'),
    ])
    expect(map.get('Netflix')).toBe('netflix-tech')
    expect(map.get('Uber')).toBe('uber-eng')
  })
})
