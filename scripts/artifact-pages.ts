// What a standalone artifact page (/artifacts/<slug>/index.html, the "Open full
// screen" target) says about itself: its name for the <title>, its teaser for
// the description, and the page it belongs to for the "Read the full
// breakdown" link in the standalone bar. Read by scripts/compile-artifacts.ts.
//
// The owner is the content host that declares the artifact (content-hosts.ts):
// an article's artifact belongs to the article, a pattern demo to its pattern
// page, a problem-page artifact (try-it, mission) to that problem page. Pages
// that only embed someone else's artifact (the landing hero) don't own it. An
// artifact with no owner, or more than one, gets no parent link and is listed
// by compile-artifacts rather than guessed.

import type { ContentSet } from './types'

export interface StandalonePage {
  // "<name> · behindscale" in the <title>.
  readonly name: string
  readonly description: string
  // Site-relative URL of the page the artifact belongs to.
  readonly parentPath: string
}

export type StandaloneResult =
  | { readonly ok: true; readonly page: StandalonePage }
  | { readonly ok: false; readonly reason: 'no-parent' | 'many-parents'; readonly owners: readonly string[] }

function slugOfPath(path: string): string {
  return path.replace(/^\/artifacts\//, '').replace(/\/index\.html$/, '')
}

export function standalonePages(content: ContentSet): Map<string, StandaloneResult> {
  const out = new Map<string, StandaloneResult>()
  const owners = new Map<string, StandalonePage[]>()
  const ownerNames = new Map<string, string[]>()
  const add = (slug: string, page: StandalonePage, owner: string) => {
    owners.set(slug, [...(owners.get(slug) ?? []), page])
    ownerNames.set(slug, [...(ownerNames.get(slug) ?? []), owner])
  }

  for (const a of content.articles) {
    if (a.artifact == null) continue
    add(slugOfPath(a.artifact.path), {
      name: a.title,
      description: a.artifact.teaser ?? a.summary,
      parentPath: `/articles/${a.slug}`,
    }, `article ${a.slug}`)
  }
  for (const p of content.patterns) {
    if (p.artifact == null) continue
    add(slugOfPath(p.artifact.path), {
      name: p.name,
      description: p.artifact.teaser ?? p.oneLineDefinition ?? '',
      parentPath: `/patterns/${p.slug}`,
    }, `pattern ${p.slug}`)
  }
  for (const e of content.problemEssays) {
    const entry = content.cruxTagRegistry[e.cruxTag]
    const urlSlug = entry?.urlSlug
    if (urlSlug === undefined) continue
    const label = entry!.label
    if (e.tryIt !== undefined) {
      add(e.tryIt.artifactSlug, {
        name: e.tryIt.name ?? `The wall: ${label}`,
        description: e.tryIt.teaser,
        parentPath: `/problems/${urlSlug}`,
      }, `problem ${urlSlug} (try it)`)
    }
    if (e.mission !== undefined) {
      add(e.mission.artifactSlug, {
        name: e.mission.name ?? `${e.mission.title}: ${label}`,
        description: e.mission.teaser,
        parentPath: `/problems/${urlSlug}`,
      }, `problem ${urlSlug} (mission)`)
    }
  }

  for (const [slug, pages] of owners) {
    out.set(
      slug,
      pages.length === 1
        ? { ok: true, page: pages[0]! }
        : { ok: false, reason: 'many-parents', owners: ownerNames.get(slug) ?? [] },
    )
  }
  return out
}

// The result for one artifact slug, including the no-owner case.
export function standalonePageFor(
  pages: ReadonlyMap<string, StandaloneResult>,
  slug: string,
): StandaloneResult {
  return pages.get(slug) ?? { ok: false, reason: 'no-parent', owners: [] }
}
