import { describe, it, expect } from 'vitest'
import { problemEssay as problemEssayCheck } from '../problem-essay'
import { makeContent, article, problemEssay } from './fixtures'

const base = {
  articles: [article('a', [])],
  patterns: [],
}

describe('problem-essay check', () => {
  it('passes with no essays (the normal derived-only state)', () => {
    expect(problemEssayCheck.run(makeContent(base))).toEqual([])
  })

  it('passes when the essay cruxTag resolves and the filename matches', () => {
    const errs = problemEssayCheck.run(
      makeContent({ ...base, problemEssays: [problemEssay('test-fixture-crux')] }),
    )
    expect(errs).toEqual([])
  })

  it('errors when the cruxTag has no registry entry', () => {
    const errs = problemEssayCheck.run(
      makeContent({ ...base, problemEssays: [problemEssay('no-such-crux')] }),
    )
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('no entry in content/cruxtags.json')
  })

  it('errors when the filename does not equal the cruxTag', () => {
    const errs = problemEssayCheck.run(
      makeContent({
        ...base,
        problemEssays: [problemEssay('test-fixture-crux')],
        problemEssayPaths: new Map([
          ['test-fixture-crux', 'content/problems/wrong-name.json'],
        ]),
      }),
    )
    expect(errs).toHaveLength(1)
    expect(errs[0]?.message).toContain('must equal its cruxTag')
  })

  it('errors when two essays declare the same cruxTag', () => {
    const errs = problemEssayCheck.run(
      makeContent({
        ...base,
        problemEssays: [
          problemEssay('test-fixture-crux'),
          problemEssay('test-fixture-crux'),
        ],
      }),
    )
    expect(errs.some((e) => e.message.includes('more than one problem essay'))).toBe(
      true,
    )
  })
})
