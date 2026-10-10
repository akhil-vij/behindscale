import { describe, expect, it } from 'vitest'
import { shareImageProblems, SITE_URL } from '../check-share-images'

const IMG = `${SITE_URL}/og-default.png`
const head = (og: string, tw: string, card = 'summary_large_image') =>
  `<head><meta property="og:image" content="${og}" /><meta name="twitter:card" content="${card}" /><meta name="twitter:image" content="${tw}" /></head>`
const exists = (p: string) => p === 'og-default.png'

describe('shareImageProblems', () => {
  it('passes a page whose share image exists', () => {
    expect(shareImageProblems([{ file: 'index.html', html: head(IMG, IMG) }], exists)).toEqual([])
  })

  it('fails when the image file is missing', () => {
    const missing = `${SITE_URL}/og-missing.png`
    const problems = shareImageProblems([{ file: 'index.html', html: head(missing, IMG) }], exists)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('dist/og-missing.png does not exist')
  })

  it('fails a relative or off-site URL', () => {
    const problems = shareImageProblems([{ file: 'a.html', html: head('/og-default.png', 'https://example.com/og-default.png') }], exists)
    expect(problems).toHaveLength(2)
    expect(problems.every((p) => p.includes('not an absolute'))).toBe(true)
  })

  it('fails a page with no share tags or the wrong card type', () => {
    expect(shareImageProblems([{ file: 'a.html', html: '<head></head>' }], exists)).toEqual([
      'a.html: no og:image',
      'a.html: no twitter:image',
      'a.html: twitter:card must be "summary_large_image" (found none)',
    ])
    expect(shareImageProblems([{ file: 'b.html', html: head(IMG, IMG, 'summary') }], exists)).toEqual([
      'b.html: twitter:card must be "summary_large_image" (found "summary")',
    ])
  })
})
