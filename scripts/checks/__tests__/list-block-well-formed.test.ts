import { describe, it, expect } from 'vitest'
import { listBlockWellFormed } from '../list-block-well-formed'
import { makeContent, article, pattern } from './fixtures'
import type { Article } from '../../../src/types'

function articleWithProse(
  slug: string,
  prose: { problem?: string; solution?: string },
): Article {
  return {
    ...article(slug, ['p1']),
    problem: prose.problem ?? '',
    solution: prose.solution ?? '',
  }
}

function run(prose: { problem?: string; solution?: string }) {
  return listBlockWellFormed.run(
    makeContent({
      articles: [articleWithProse('a', prose)],
      patterns: [pattern('p1')],
    }),
  )
}

describe('listBlockWellFormed', () => {
  it('passes prose with no lists', () => {
    expect(
      run({ problem: 'One paragraph.\n\nAnother paragraph, no lists here.' }),
    ).toEqual([])
  })

  it('passes a well-formed unordered list of two+ items', () => {
    expect(
      run({
        solution: 'Lead-in:\n\n- first item here\n- second item here\n- third item',
      }),
    ).toEqual([])
  })

  it('passes a well-formed ordered list', () => {
    expect(
      run({
        solution: 'Three properties:\n\n1. rows never change\n2. no joins\n3. tiny working set',
      }),
    ).toEqual([])
  })

  it('flags a mixed chunk (lead-in glued to the list, no blank line)', () => {
    const errors = run({
      solution: 'The requirements:\n- isolation\n- reordering',
    })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('non-list prose')
  })

  it('flags mixed markers in one block', () => {
    const errors = run({ solution: 'x\n\n- one\n2. two' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('mixes')
  })

  it('flags a single-item list', () => {
    const errors = run({ solution: 'x\n\n- only one item' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('single-item')
  })

  it('flags items separated by blank lines as one grouped error', () => {
    const errors = run({ solution: 'x\n\n- first\n\n- second\n\n- third' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('separated by blank lines')
  })

  it('flags an indented (nested) list item', () => {
    const errors = run({ solution: 'x\n\n- top\n  - nested one\n- back' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('indented')
  })

  it('flags unsupported bullet markers (* and +)', () => {
    const errors = run({ solution: 'x\n\n* one\n* two' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('unsupported bullet')
  })

  it('flags unsupported ordered form (N))', () => {
    const errors = run({ solution: 'x\n\n1) one\n2) two' })
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('unsupported ordered')
  })

  it('reports every field and defaults to error severity', () => {
    const errors = run({
      problem: 'x\n\n- lonely',
      solution: 'y\n\n- lonely too',
    })
    expect(errors).toHaveLength(2)
    expect(errors.every((e) => e.severity === undefined)).toBe(true)
    expect(errors.map((e) => e.message.split(':')[0]).sort()).toEqual([
      'problem',
      'solution',
    ])
  })

  it('checks pattern definitions too', () => {
    const errors = listBlockWellFormed.run(
      makeContent({
        articles: [article('a', ['p1'])],
        patterns: [{ ...pattern('p1'), definition: 'x\n\n- lonely' }],
      }),
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]?.patternSlug).toBe('p1')
    expect(errors[0]?.message).toContain('definition')
  })
})
