import { describe, it, expect } from 'vitest'
import { PATTERN_CATEGORIES } from '../patternCategories'

// The listing dot (/patterns, pattern pages) and the pattern chip read the
// same PATTERN_CATEGORIES entry. These pin the docs/design-spec.md §2
// mapping and keep each entry's dot and chip on one colour token.

const colourOf = (classes: string, prefix: 'bg' | 'text') =>
  classes.match(new RegExp(`(?:^|\\s)${prefix}-cat-([a-z]+)(?:\\s|$)`))?.[1]

describe('PATTERN_CATEGORIES', () => {
  it('maps each category to its design-spec colour', () => {
    const byId = Object.fromEntries(
      PATTERN_CATEGORIES.map((c) => [c.id, colourOf(c.dotClass, 'bg')]),
    )
    expect(byId).toEqual({
      resilience: 'blue',
      throughput: 'green',
      consistency: 'purple',
      observability: 'cyan',
      performance: 'orange',
    })
  })

  it('gives each entry one colour for its dot and its chip', () => {
    for (const c of PATTERN_CATEGORIES) {
      expect(colourOf(c.chipClass, 'text'), c.id).toBe(colourOf(c.dotClass, 'bg'))
    }
  })
})
