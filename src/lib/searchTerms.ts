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

// An article's browse-surface as weighted search terms. Recall reaches `tags`
// + authored `keywords` + the class label, not just title/summary; a non-title
// hit drives the card's `matched:` line. BODIES (problem/solution/tradeoffs)
// stay OUT -- they would match half the library on a common word, the noise the
// matched: line exists to prevent.
export function articleTerms(article: Article): Term[] {
  const terms: Term[] = [
    { kind: 'title', value: article.title, weight: 10 },
    { kind: 'summary', value: article.cruxSummary, weight: 8, long: true },
    { kind: 'crux', value: article.crux, weight: 3, long: true },
    { kind: 'company', value: article.source.company, weight: 4 },
    { kind: 'source', value: article.source.name, weight: 3 },
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

// A pattern's search terms. name + one-line + aliases carry the signal;
// category label/gloss + companies widen recall; the FULL definition is a
// low-weight second net (Batch 3 note 1) so words like "backlog" -- present in
// a definition but dropped from the derived one-liner -- still match for
// patterns the authoring agent hasn't given aliases yet.
export function patternTerms(pattern: PatternDefinition): Term[] {
  const stats = patternStats.get(pattern.slug)
  const companies = [...(stats?.companies ?? [])].sort((a, b) => a.localeCompare(b))
  const oneLine = oneLineFor(pattern)
  const cat = patternCategoryById.get(pattern.category ?? '')
  const terms: Term[] = [
    { kind: 'name', value: pattern.name, weight: 10 },
    { kind: 'definition', value: oneLine, weight: 6, long: true },
  ]
  if (cat?.label) terms.push({ kind: 'category', value: cat.label, weight: 2 })
  if (cat?.gloss) terms.push({ kind: 'category', value: cat.gloss, weight: 1, long: true })
  for (const c of companies) terms.push({ kind: 'company', value: c, weight: 3 })
  for (const a of pattern.aliases ?? []) terms.push({ kind: 'alias', value: a, weight: 6 })
  terms.push({ kind: 'definition', value: pattern.definition, weight: 1, long: true })
  return terms
}
