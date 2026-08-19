// A "content host" is any content entity that can carry embedded media:
// inline **figures** and/or an interactive **artifact**. This is the
// single registry both capabilities read, capability-gated -- the
// convergence described in docs/pattern-artifacts-design.md §2.
//
// It generalizes the earlier figure-only host abstraction
// (docs/figures-design.md §8). Two capability views are exported:
//
//   figureHosts(content)   -> hosts that declare figures[]  (unchanged
//                             shape + callers; the eight figure checks,
//                             the SVG loader, and copy-figures use this)
//   artifactHosts(content) -> hosts that declare a non-null artifact
//                             (the artifact-* checks use this)
//
// Adding a new host kind (category, company, question, ...) is one
// branch in contentHosts() that sets whichever capabilities that kind
// carries -- no check, loader, or component changes. The host kinds
// listed in HostKind beyond article/pattern are documented registration
// points; they attach when their pages are built.
//
// Storage/URL conventions are flat and host-agnostic (Approach A,
// ratified 2026-08-19):
//   figures:   content/figures/<host-slug>/<fig-slug>.svg -> /figures/<host-slug>/<fig-slug>.svg
//   artifacts: content/artifacts/<host-slug>.jsx          -> /artifacts/<host-slug>/index.html
// where <host-slug> is the host's slug regardless of kind. Because the
// namespace is shared across kinds, artifact-slug-unique / figure-svg-exists
// guard against two kinds claiming the same slug.

import type { ContentSet } from './types'
import type { Figure } from '../src/types'

export type HostKind =
  | 'article'
  | 'pattern'
  | 'problem'
  | 'category'
  | 'company'
  | 'question'
  | 'site'

// CheckError locator for a host, spread into pushed errors.
export type HostRef =
  | { articleSlug: string }
  | { patternSlug: string }
  | { problemSlug: string }
  | { categorySlug: string }
  | { companySlug: string }
  | { questionSlug: string }
  | { siteSlug: string }

export interface ContentHost {
  // The host's slug; drives the figures dir + artifact path + public URLs.
  readonly slug: string
  readonly kind: HostKind
  readonly ref: HostRef

  // ── Figure capability (undefined ⇒ host carries no figures) ──
  readonly figures?: readonly Figure[]
  // Fields where {{figure:...}} markers are ALLOWED: [displayName, text].
  readonly markerFields?: ReadonlyArray<readonly [string, string]>
  // Fields where markers are FORBIDDEN: [displayName, text].
  readonly forbiddenFields?: ReadonlyArray<readonly [string, string]>

  // ── Artifact capability (undefined/null ⇒ host carries no artifact) ──
  readonly artifact?: { readonly path: string; readonly teaser?: string } | null
}

// The single registry. Every capability view is a filter over this.
export function contentHosts(content: ContentSet): ContentHost[] {
  const hosts: ContentHost[] = []

  for (const a of content.articles) {
    const forbidden: Array<readonly [string, string]> = [
      ['summary', a.summary],
      ['crux', a.crux],
      ['cruxSummary', a.cruxSummary],
    ]
    for (const t of a.tradeoffs) forbidden.push(['tradeoffs[]', t])
    for (const p of a.patterns) {
      forbidden.push([`patterns["${p.slug}"].note`, p.note])
    }
    hosts.push({
      slug: a.slug,
      kind: 'article',
      ref: { articleSlug: a.slug },
      figures: a.figures ?? [],
      markerFields: [
        ['problem', a.problem],
        ['solution', a.solution],
      ],
      forbiddenFields: forbidden,
      artifact: a.artifact,
    })
  }

  for (const p of content.patterns) {
    const forbidden: Array<readonly [string, string]> = []
    for (const w of p.whenItApplies) forbidden.push(['whenItApplies[]', w])
    for (const t of p.tradeoffs) forbidden.push(['tradeoffs[]', t])
    hosts.push({
      slug: p.slug,
      kind: 'pattern',
      ref: { patternSlug: p.slug },
      figures: p.figures ?? [],
      markerFields: [['definition', p.definition]],
      forbiddenFields: forbidden,
      artifact: p.artifact ?? null,
    })
  }

  return hosts
}

// ── Figure capability view ──
// Narrows to hosts that declare figures[], with the figure fields
// non-optional so the eight figure checks read them directly. Callers
// and shape are identical to the previous scripts/figure-hosts.ts export.
export interface FigureHost {
  readonly slug: string
  readonly kind: HostKind
  readonly figures: readonly Figure[]
  readonly markerFields: ReadonlyArray<readonly [string, string]>
  readonly forbiddenFields: ReadonlyArray<readonly [string, string]>
  readonly ref: HostRef
}

export function figureHosts(content: ContentSet): FigureHost[] {
  const hosts: FigureHost[] = []
  for (const h of contentHosts(content)) {
    if (h.figures === undefined) continue
    hosts.push({
      slug: h.slug,
      kind: h.kind,
      figures: h.figures,
      markerFields: h.markerFields ?? [],
      forbiddenFields: h.forbiddenFields ?? [],
      ref: h.ref,
    })
  }
  return hosts
}

// ── Artifact capability view ──
// Narrows to hosts that declare a NON-null artifact (a real bundle to
// validate). `artifact` is non-null on the returned type.
export interface ArtifactHost {
  readonly slug: string
  readonly kind: HostKind
  readonly artifact: { readonly path: string; readonly teaser?: string }
  readonly ref: HostRef
}

export function artifactHosts(content: ContentSet): ArtifactHost[] {
  const hosts: ArtifactHost[] = []
  for (const h of contentHosts(content)) {
    if (h.artifact === undefined || h.artifact === null) continue
    hosts.push({
      slug: h.slug,
      kind: h.kind,
      artifact: h.artifact,
      ref: h.ref,
    })
  }
  return hosts
}
