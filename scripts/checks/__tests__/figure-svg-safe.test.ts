import { describe, it, expect } from 'vitest'
import { figureSvgSafe } from '../figure-svg-safe'
import { article, figure, makeContent, pattern } from './fixtures'

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
}

function contentWithSvg(
  articleSlug: string,
  figureSlug: string,
  svgSource: string,
) {
  const a = {
    ...article(articleSlug, ['p']),
    figures: [figure(figureSlug)],
  }
  return makeContent({
    articles: [a],
    patterns: [pattern('p')],
    figureSvgs: new Map([
      [
        `${articleSlug}/${figureSlug}`,
        {
          path: `content/figures/${articleSlug}/${figureSlug}.svg`,
          contents: svgSource,
        },
      ],
    ]),
  })
}

describe('figure-svg-safe', () => {
  it('passes a benign SVG with only shapes and text', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<rect x="0" y="0" width="100" height="100" fill="#F4F2EE" /><text x="10" y="20">Hello</text>'),
    )
    expect(figureSvgSafe.run(c)).toEqual([])
  })

  it('rejects <script>', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<script>alert(1)</script><rect />'),
    )
    expect(figureSvgSafe.run(c).length).toBeGreaterThan(0)
    expect(figureSvgSafe.run(c)[0]?.message).toContain('<script>')
  })

  it('rejects <foreignObject>', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<foreignObject width="10" height="10"><div /></foreignObject>'),
    )
    expect(figureSvgSafe.run(c)[0]?.message).toContain('<foreignObject>')
  })

  it('rejects <style>', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<style>rect { fill: red; }</style><rect />'),
    )
    expect(figureSvgSafe.run(c)[0]?.message).toContain('<style>')
  })

  it('rejects on* event handler attributes', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<rect onclick="alert(1)" />'),
    )
    expect(figureSvgSafe.run(c)[0]?.message).toContain('on*')
  })

  it('rejects javascript: URLs', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<a href="javascript:alert(1)"><rect /></a>'),
    )
    expect(figureSvgSafe.run(c).map((e) => e.message).join(' ')).toContain(
      'javascript:',
    )
  })

  it('rejects <image href="data:..."> base64 raster', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg(
        '<image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10" />',
      ),
    )
    expect(figureSvgSafe.run(c).map((e) => e.message).join(' ')).toContain(
      'base64 raster',
    )
  })

  it('rejects off-repo href on <image>', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg('<image href="https://evil.example/x.png" width="10" height="10" />'),
    )
    const messages = figureSvgSafe.run(c).map((e) => e.message).join(' ')
    expect(messages).toContain('off-repo')
    expect(messages).toContain('https://evil.example/x.png')
  })

  it('accepts in-document fragment refs on <use>', () => {
    const c = contentWithSvg(
      'a',
      'f',
      svg(
        '<defs><rect id="r" /></defs><use href="#r" /><use xlink:href="#r" />',
      ),
    )
    expect(figureSvgSafe.run(c)).toEqual([])
  })

  it('skips figures whose SVG contents are null (figure-svg-exists handles those)', () => {
    const a = { ...article('a', ['p']), figures: [figure('f')] }
    const c = makeContent({
      articles: [a],
      patterns: [pattern('p')],
      figureSvgs: new Map([
        ['a/f', { path: 'content/figures/a/f.svg', contents: null }],
      ]),
    })
    expect(figureSvgSafe.run(c)).toEqual([])
  })

  it('reports the file path in the error for locate-ability', () => {
    const c = contentWithSvg('a', 'f', svg('<script>bad</script>'))
    const errors = figureSvgSafe.run(c)
    expect(errors[0]?.file).toBe('content/figures/a/f.svg')
    expect(errors[0]?.articleSlug).toBe('a')
  })
})
