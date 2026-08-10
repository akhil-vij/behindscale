import { describe, it, expect } from 'vitest'
import {
  extractSvgTextNodes,
  figureTextVocabulary,
} from '../figure-text-vocabulary'
import { article, figure, makeContent, pattern } from './fixtures'

describe('extractSvgTextNodes', () => {
  it('extracts a single <text> node body', () => {
    expect(extractSvgTextNodes('<svg><text>Hello</text></svg>')).toEqual([
      'Hello',
    ])
  })

  it('extracts multiple <text> nodes with attributes on the opening tag', () => {
    const svg =
      '<svg><text x="10" y="20" fill="#000">First</text><text x="30" y="40">Second</text></svg>'
    expect(extractSvgTextNodes(svg)).toEqual(['First', 'Second'])
  })

  it('strips nested <tspan> markup and preserves the inner text', () => {
    const svg = '<svg><text>foo <tspan x="1">bar</tspan> baz</text></svg>'
    expect(extractSvgTextNodes(svg)).toEqual(['foo bar baz'])
  })

  it('decodes common XML entities', () => {
    const svg = '<svg><text>a &amp; b &lt;c&gt; d &#183; e</text></svg>'
    expect(extractSvgTextNodes(svg)).toEqual(['a & b <c> d · e'])
  })

  it('ignores empty <text> nodes', () => {
    const svg = '<svg><text></text><text>real</text><text>   </text></svg>'
    expect(extractSvgTextNodes(svg)).toEqual(['real'])
  })

  it('returns an empty array for an SVG with no <text> nodes', () => {
    expect(extractSvgTextNodes('<svg><rect /></svg>')).toEqual([])
  })

  it('is case-insensitive on the tag name', () => {
    expect(extractSvgTextNodes('<svg><TEXT>caps</TEXT></svg>')).toEqual([
      'caps',
    ])
  })
})

describe('figure-text-vocabulary (scaffold)', () => {
  it('passes when no articles declare figures', () => {
    const content = makeContent({
      articles: [article('a', ['p'])],
      patterns: [pattern('p')],
    })
    expect(figureTextVocabulary.run(content)).toEqual([])
  })

  it('runs cleanly on a well-formed SVG (zero rules today, still passes)', () => {
    const a = { ...article('a', ['p']), figures: [figure('f')] }
    const svgs = new Map([
      [
        'a/f',
        {
          path: 'content/figures/a/f.svg',
          contents:
            '<svg><text x="10" y="20">WHERE HODOR RUNS</text></svg>',
        },
      ],
    ])
    const content = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      figureSvgs: svgs,
    })
    expect(figureTextVocabulary.run(content)).toEqual([])
  })

  it('skips figures whose SVG contents are null', () => {
    const a = { ...article('a', ['p']), figures: [figure('f')] }
    const content = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      figureSvgs: new Map([
        ['a/f', { path: 'content/figures/a/f.svg', contents: null }],
      ]),
    })
    expect(figureTextVocabulary.run(content)).toEqual([])
  })
})
