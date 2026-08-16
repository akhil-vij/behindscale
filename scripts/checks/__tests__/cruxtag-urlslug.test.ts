import { describe, it, expect } from 'vitest'
import { cruxtagUrlslug } from '../cruxtag-urlslug'
import { makeContent, article, pattern } from './fixtures'
import type { CruxTagRegistry } from '../../../src/types'

function run(registry: CruxTagRegistry) {
  return cruxtagUrlslug.run(
    makeContent({
      articles: [article('a', ['p1'])],
      patterns: [pattern('p1')],
      cruxTagRegistry: registry,
    }),
  )
}

const entry = (urlSlug?: string) => ({
  label: 'A class',
  definition: 'A one-sentence class definition for the fixture.',
  ...(urlSlug !== undefined ? { urlSlug } : {}),
})

describe('cruxtag-urlslug', () => {
  it('passes when every entry has a unique kebab-case urlSlug', () => {
    expect(
      run({
        'ambiguous-failure-under-retry': entry('ambiguous-timeouts'),
        'buffer-degrades-under-backlog': entry('queue-backlog'),
      }),
    ).toEqual([])
  })

  it('errors when an entry is missing urlSlug', () => {
    const errs = run({ 'some-crux': entry() })
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('missing a urlSlug')
  })

  it('errors when a urlSlug is not kebab-case', () => {
    const errs = run({ 'some-crux': entry('Not_Kebab') })
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('not kebab-case')
  })

  it('errors when two entries share a urlSlug', () => {
    const errs = run({
      'crux-a': entry('load-shedding'),
      'crux-b': entry('load-shedding'),
    })
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('used by both')
  })
})
