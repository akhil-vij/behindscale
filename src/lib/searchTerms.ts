// Term builders for list search (findability Batch 3, F19). One module so the
// /problems and /patterns pages AND the search test suite build the identical
// weighted surface for each content type -- no drift between what ships and
// what the tests assert. The matching itself lives in ./search (matchTerms);
// this module only decides WHICH fields, at WHAT weight, are searchable.

import type { Article, CruxTagEntry, PatternDefinition } from '../types'
import type { Term } from './search'
import { cruxtags, patternBySlug, patternStats } from '../content'
import { patternCategoryById } from './patternCategories'

// The card one-liner + definition search term. Prefer the authored
// `oneLineDefinition`; otherwise strip figure markers, unwrap inline links
// `[text](/path)` -> `text`, and take the first sentence (link chrome is
// structure, not prose). Exported because /patterns renders it on the card.
export function oneLineFor(pattern: {
  oneLineDefinition?: string
  definition: string
}): string {
  const authored = pattern.oneLineDefinition?.trim()
  if (authored) return authored
  const clean = pattern.definition
    .replace(/\{\{figure:[^}]+\}\}/g, ' ')
    .replace(/\[([^\]]+)\]\(\/[^)\s]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  const m = clean.match(/^(.*?[.!?])(?:\s|$)/)
  return (m ? m[1] : clean).trim()
}

// An article's browse-surface as weighted search terms (B3-1 field list): title,
// summary, tags, company, class label, linked pattern names, and authored
// keywords. Recall reaches tags + keywords + the class label, not just the
// title; a non-title hit drives the card's `matched:` line. Deliberately NOT
// indexed: the crux/cruxSummary and the bodies (problem/solution/tradeoffs) --
// they match half the library on a common word (the noise the matched: line and
// the authored keywords exist to replace). `summary` is the article's summary
// field, matching the authoring agent's search simulator.
export function articleTerms(article: Article): Term[] {
  const terms: Term[] = [
    { kind: 'title', value: article.title, weight: 10 },
    { kind: 'summary', value: article.summary, weight: 8, long: true },
    { kind: 'company', value: article.source.company, weight: 4 },
  ]
  const classLabel = cruxtags[article.cruxTag]?.label
  if (classLabel) terms.push({ kind: 'class', value: classLabel, weight: 5, long: true })
  for (const tag of article.tags) terms.push({ kind: 'tag', value: tag, weight: 5 })
  for (const kw of article.keywords ?? []) {
    terms.push({ kind: 'keyword', value: kw, weight: 6 })
  }
  for (const ref of article.patterns) {
    terms.push({
      kind: 'pattern',
      value: patternBySlug.get(ref.slug)?.name ?? ref.slug,
      weight: 2,
    })
  }
  return terms
}

// A problem class's search terms. A hit surfaces the WHOLE class as its own
// cluster on /problems (see Catalog); the class then drops out of the regular
// article results so it never double-renders.
export function cruxTagTerms(slug: string, entry: CruxTagEntry): Term[] {
  const terms: Term[] = [
    { kind: 'title', value: entry.label, weight: 10 },
    { kind: 'definition', value: entry.definition, weight: 3, long: true },
    { kind: 'slug', value: slug, weight: 1 },
  ]
  for (const kw of entry.keywords ?? []) {
    terms.push({ kind: 'keyword', value: kw, weight: 6 })
  }
  return terms
}

// A pattern's search terms: name + one-line definition + aliases carry the
// signal; category label/gloss + companies widen recall.
//
// NOTE (supersedes Batch 3 note 1): the full pattern definition was briefly
// indexed as a low-weight "second net" so words present in a definition but not
// the derived one-liner (e.g. "backlog") still matched for patterns the
// authoring agent hadn't reached. The agent has since delivered aliases across
// all 52 patterns, so the net is redundant AND harmful -- it re-surfaces
// footnote mentions ("backlog" hit 6 patterns via definitions, not the 4
// authored), breaking keywords/tests.md precision. Removed; authored aliases
// are the recall mechanism now.
export function patternTerms(pattern: PatternDefinition): Term[] {
  const stats = patternStats.get(pattern.slug)
  const companies = [...(stats?.companies ?? [])].sort((a, b) => a.localeCompare(b))
  const cat = patternCategoryById.get(pattern.category ?? '')
  const terms: Term[] = [{ kind: 'name', value: pattern.name, weight: 10 }]
  // Only the AUTHORED one-liner feeds search. The derived first-sentence
  // fallback (oneLineFor, used for the card DISPLAY) would drag in definition
  // prose the authoring agent deliberately didn't make searchable -- it
  // over-matched "watermark" (selective-acknowledgment) and "source of truth"
  // (content-free-change-events). Recall for un-authored one-liners comes from
  // the authored aliases instead.
  const authoredOneLine = pattern.oneLineDefinition?.trim()
  if (authoredOneLine) {
    terms.push({ kind: 'definition', value: authoredOneLine, weight: 6, long: true })
  }
  // Category LABEL only, not the gloss: the gloss is shared category-header copy
  // and matching it returns the whole category (its text literally contains
  // "exactly once", "shedding", "truth" ...), which breaks keywords/tests.md
  // precision. The label ("Resilience") is a legitimate per-pattern term.
  if (cat?.label) terms.push({ kind: 'category', value: cat.label, weight: 2 })
  for (const c of companies) terms.push({ kind: 'company', value: c, weight: 3 })
  for (const a of pattern.aliases ?? []) terms.push({ kind: 'alias', value: a, weight: 6 })
  return terms
}
