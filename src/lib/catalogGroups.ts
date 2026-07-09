// Catalog grouping module. Pure -- no React, no side effects, no data
// dependencies beyond what the caller passes in. Used by:
//   - src/pages/Catalog.tsx (renders the grouped article set)
//   - src/pages/Landing.tsx (renders the top-3 multi-company preview)
//   - scripts/prerender.ts (emits the /catalog JSON-LD CollectionPage
//     + ItemList of groups + cruxTag DefinedTermSet)
//
// The single source of truth for the group order + composition. Groups
// are sorted count-desc with an alphabetical tie-break, matching
// design-spec §6 and the acceptance criterion #3. Company names inside
// each group are canonical (`source.company`), deduped, and
// alphabetically sorted -- consistent with the Rendering section's
// "company canonicalization (navigation phase)" rule so Amazon/AWS
// collapses to a single chip on every consumer surface.
//
// The registry (`content/cruxtags.json`) is the source for group
// labels and definitions. An article whose cruxTag has no registry
// entry is a build-time error via the `cruxtag-registry-coverage`
// check -- this module trusts the check and does not gate on it. If
// an unknown cruxTag ever reaches this module at runtime, it renders
// as a group with a slug label + empty definition rather than
// crashing (skip + flag, per invariant 6).

import type { Article, CruxTagRegistry } from '../types'

export interface CatalogGroup {
  slug: string
  label: string
  definition: string
  count: number
  companies: readonly string[]
  articles: readonly Article[]
}

export interface CatalogGroupingInput {
  articles: readonly Article[]
  registry: CruxTagRegistry
}

export function catalogGroups(input: CatalogGroupingInput): CatalogGroup[] {
  const { articles, registry } = input
  const byTag = new Map<string, Article[]>()
  for (const article of articles) {
    const tag = article.cruxTag
    let bucket = byTag.get(tag)
    if (!bucket) {
      bucket = []
      byTag.set(tag, bucket)
    }
    bucket.push(article)
  }

  const groups: CatalogGroup[] = []
  for (const [slug, members] of byTag) {
    const entry = registry[slug]
    const companies = Array.from(
      new Set(members.map((a) => a.source.company)),
    ).sort((a, b) => a.localeCompare(b))
    groups.push({
      slug,
      label: entry?.label ?? slug,
      definition: entry?.definition ?? '',
      count: members.length,
      companies,
      articles: members,
    })
  }

  groups.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count
    return a.label.localeCompare(b.label)
  })

  return groups
}

// The canonical companies list -- the distinct `source.company` values
// across the article set, alphabetized. Feeds the catalog's company
// filter chips and the landing page's trust band. Amazon/AWS collapses
// to one entry per the canonicalization rule.
export function canonicalCompanies(
  articles: readonly Article[],
): string[] {
  return Array.from(new Set(articles.map((a) => a.source.company))).sort(
    (a, b) => a.localeCompare(b),
  )
}

// For each canonical company, return one representative source slug so
// the filter chip can link to `/catalog?source=<slug>`. Picks the first
// article for that company in the input order (articles are sorted by
// publishedAt desc in src/content/index.ts). The choice doesn't matter
// for filtering correctness -- Catalog.tsx filters by `source.slug`
// against every article, so any slug from the company's article set
// works.
export function companySourceSlugMap(
  articles: readonly Article[],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (const article of articles) {
    if (!map.has(article.source.company)) {
      map.set(article.source.company, article.source.slug)
    }
  }
  return map
}
