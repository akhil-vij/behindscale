import { describe, expect, it } from 'vitest'
import { standalonePageFor, standalonePages } from '../artifact-pages'
import { loadContent } from '../load-content'
import { article, makeContent, pattern, problemEssay } from '../checks/__tests__/fixtures'

describe('standalonePages', () => {
  it('maps each host kind to its parent page', () => {
    const a = { ...article('a1', []), artifact: { path: '/artifacts/a1/index.html', teaser: 'Article teaser.' } }
    const p = { ...pattern('p1'), name: 'Pattern One', artifact: { path: '/artifacts/p1/index.html', teaser: 'Pattern teaser.' } }
    const e = problemEssay('crux-x', {
      tryIt: { artifactSlug: 'x-tryit', teaser: 'Try teaser.', caption: 'c' },
      mission: { artifactSlug: 'x-mission', teaser: 'Mission teaser.', title: 'Build it', intro: 'i' },
    } as never)
    const pages = standalonePages(
      makeContent({
        articles: [a],
        patterns: [p],
        problemEssays: [e],
        cruxTagRegistry: { 'crux-x': { label: 'Crux X', definition: 'd', urlSlug: 'crux-x-page' } },
      }),
    )
    expect(standalonePageFor(pages, 'a1')).toEqual({
      ok: true,
      page: { name: 'Article a1', description: 'Article teaser.', parentPath: '/articles/a1' },
    })
    expect(standalonePageFor(pages, 'p1')).toEqual({
      ok: true,
      page: { name: 'Pattern One', description: 'Pattern teaser.', parentPath: '/patterns/p1' },
    })
    expect(standalonePageFor(pages, 'x-tryit')).toEqual({
      ok: true,
      page: { name: 'The wall: Crux X', description: 'Try teaser.', parentPath: '/problems/crux-x-page' },
    })
    expect(standalonePageFor(pages, 'x-mission')).toEqual({
      ok: true,
      page: { name: 'Build it: Crux X', description: 'Mission teaser.', parentPath: '/problems/crux-x-page' },
    })
  })

  it('reports an artifact with no owner, or two, instead of guessing', () => {
    const a = { ...article('a1', []), artifact: { path: '/artifacts/shared/index.html' } }
    const b = { ...article('b1', []), artifact: { path: '/artifacts/shared/index.html' } }
    const pages = standalonePages(makeContent({ articles: [a, b], patterns: [] }))
    expect(standalonePageFor(pages, 'shared')).toEqual({
      ok: false,
      reason: 'many-parents',
      owners: ['article a1', 'article b1'],
    })
    expect(standalonePageFor(pages, 'nobody')).toEqual({ ok: false, reason: 'no-parent', owners: [] })
  })

  it('gives every artifact source in content/ exactly one parent page', () => {
    const { content } = loadContent()
    const pages = standalonePages(content)
    const orphans = [...content.artifactSourceSlugs].filter((s) => !standalonePageFor(pages, s).ok)
    expect(orphans).toEqual([])
  })
})
