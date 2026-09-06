import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { problemEssay as problemEssayCheck } from '../problem-essay'
import { makeContent, article, pattern, problemEssay } from './fixtures'
import type { ProblemEssay, CruxTagRegistry } from '../../../src/types'

const base = {
  articles: [article('a', [])],
  patterns: [],
}

// The authored v7.3 essay + a registry entry + five member articles carrying
// its patterns, so the rich cross-reference rules run against the real
// content shape. Inline SVGs come from the essay's directory on disk.
const AUTHORED = JSON.parse(
  readFileSync(join('content', 'problems', 'ambiguous-failure-under-retry.json'), 'utf8'),
) as ProblemEssay
const WALL = 'ambiguous-failure-under-retry'
const REGISTRY: CruxTagRegistry = {
  'test-fixture-crux': { label: 'Test fixture crux', definition: 'Placeholder.' },
  [WALL]: { label: 'Ambiguous failure under retry', definition: 'A timeout hides the outcome.' },
}
const MEMBER_SLUGS = [
  'stripe-idempotency',
  'segment-exactly-once-delivery',
  'airbnb-orpheus-idempotent-payments',
  'aws-idempotent-apis',
  'shopify-resilient-payments',
]
const MEMBER_PATTERNS = AUTHORED.patterns?.order ?? []
function members() {
  return MEMBER_SLUGS.map((slug) => ({ ...article(slug, MEMBER_PATTERNS), cruxTag: WALL }))
}
function svgs() {
  const map = new Map<string, { path: string; contents: string }>()
  for (const name of ['anat-stripe', 'anat-aws', 'anat-airbnb', 'anat-shopify', 'anat-segment', 'you-empty', 'you-filled', 'windows']) {
    const path = join('content', 'problems', WALL, `${name}.svg`)
    map.set(`${WALL}/${name}`, { path, contents: readFileSync(path, 'utf8') })
  }
  return map
}
function richContent(patch: (e: ProblemEssay) => void = () => {}, svgOverride?: Map<string, { path: string; contents: string }>) {
  const essay = JSON.parse(JSON.stringify(AUTHORED)) as ProblemEssay
  patch(essay)
  return makeContent({
    articles: members(),
    patterns: MEMBER_PATTERNS.map(pattern),
    cruxTagRegistry: REGISTRY,
    problemEssays: [essay],
    problemSvgs: svgOverride ?? svgs(),
  })
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

  describe('v7.3 rich blocks (the authored ambiguous-timeouts essay)', () => {
    it('passes the authored essay against its members, SVGs, and wall module', () => {
      expect(problemEssayCheck.run(richContent())).toEqual([])
    })

    it('errors when sources / card teasers / diagram rows name a non-member', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.sources!.items[0]!.articleSlug = 'not-a-member'
          e.cards!.teasers = { 'also-not-a-member': 'x' }
          e.comparison!.diagramRows[0]!.articleSlug = 'nope'
        }),
      )
      expect(errs.map((x) => x.message)).toEqual([
        expect.stringContaining('sources.items[0] names article "not-a-member"'),
        expect.stringContaining('cards.teasers names article "also-not-a-member"'),
        expect.stringContaining('comparison.diagramRows[0] names article "nope"'),
      ])
    })

    it('errors when patterns.order names a pattern no member embodies', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.patterns!.order = ['not-a-class-pattern']
        }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.message).toContain('patterns.order[0] "not-a-class-pattern"')
    })

    it('errors when a steal qref names no question', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.steal!.items[0]!.qref = 'q42'
        }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.message).toContain('steal.items[0].qref "q42"')
    })

    it('errors when a decide row highlights a column the comparison lacks', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.decide!.rows[0]!.highlights = ['Stripe', 'Google']
        }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.message).toContain('decide.rows[0].highlights "Google" is not a comparison column')
      expect(errs[0]?.fix?.[0]).toContain('Stripe, AWS, Airbnb, Shopify, Segment')
    })

    it('warns (not errors) when rows highlight columns but the essay has no comparison', () => {
      const errs = problemEssayCheck
        .run(
          richContent((e) => {
            delete e.comparison
          }),
        )
        .filter((x) => x.message.includes('highlights'))
      expect(errs.length).toBeGreaterThan(0)
      expect(errs.every((x) => x.severity === 'warning')).toBe(true)
      expect(errs[0]?.message).toContain('no comparison table to highlight')
    })

    it('errors when a station targets an anchor the page will not render', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.stations!.push({ id: 'ghost', anchor: 'nowhere', label: 'GHOST', minutes: null })
        }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.message).toContain('targets #nowhere')
      expect(errs[0]?.fix?.[0]).toContain('cards')
    })

    it('errors when a referenced inline SVG is missing or unsafe', () => {
      const svgMap = svgs()
      svgMap.delete(`${WALL}/anat-aws`)
      svgMap.set(`${WALL}/windows`, {
        path: 'content/problems/x/windows.svg',
        contents: '<svg><script>alert(1)</script></svg>',
      })
      const errs = problemEssayCheck.run(richContent(() => {}, svgMap))
      expect(errs.map((x) => x.message)).toEqual([
        expect.stringContaining('comparison.diagramRows[1].svg "anat-aws" has no file'),
        expect.stringContaining('"windows" contains a <script> tag'),
      ])
    })

    it('errors when a matrix row or YOU slot has no youMapping() key', () => {
      const svgMap = svgs()
      svgMap.set(`${WALL}/you-filled`, {
        path: 'content/problems/x/you-filled.svg',
        contents: '<svg><text>{{dKey}}</text><text>{{dNope}}</text></svg>',
      })
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.comparison!.matrixRows[0]!.id = 'caller'
        }, svgMap),
      )
      expect(errs.map((x) => x.message)).toEqual([
        expect.stringContaining('row "caller" has no youMapping() key'),
        expect.stringContaining('slot {{dNope}} has no youMapping() key'),
      ])
    })

    it('errors when the interview has a different follow-up count than the wall has attacks', () => {
      const errs = problemEssayCheck.run(
        richContent((e) => {
          e.interview!.followups.pop()
        }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.message).toContain('has 4 rows but the wall\'s mission runs 5 attacks')
    })

    it('warns (never errors) when a class has a comparison but no wall module', () => {
      const essay = JSON.parse(JSON.stringify(AUTHORED)) as ProblemEssay
      essay.cruxTag = 'test-fixture-crux'
      essay.sources = undefined
      essay.cards = undefined
      essay.patterns = undefined
      essay.comparison!.diagramRows.forEach((r) => delete r.articleSlug)
      const svgMap = new Map<string, { path: string; contents: string }>()
      for (const [k, v] of svgs()) svgMap.set(k.replace(`${WALL}/`, 'test-fixture-crux/'), v)
      const errs = problemEssayCheck.run(
        makeContent({ ...base, problemEssays: [essay], problemSvgs: svgMap }),
      )
      expect(errs).toHaveLength(1)
      expect(errs[0]?.severity).toBe('warning')
      expect(errs[0]?.message).toContain('no wall module')
    })
  })
})
