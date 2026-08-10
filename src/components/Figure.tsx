// Figure: renders one article figure inline between paragraphs of
// the Problem or Solution prose. The design and DOM shape match the
// sample.asp reference (uppercase mono eyebrow above, sandboxed SVG
// in the middle, plain-English figcaption below).
//
// Rendering strategy is <img src="/figures/<article>/<slug>.svg">,
// not inline SVG. The browser's <img>-sandbox is what prevents SVG
// scripts from executing (per spec) -- the reading shell adds no
// dangerouslySetInnerHTML surface here. See
// docs/figures-design.md §0.2 for the rationale.
//
// Prose.tsx calls this component for any prose paragraph that
// matches FIGURE_MARKER_EXACT after the article's figures[] map is
// resolved. A marker with no matching figure entry is caught at
// build time by orphan-figure-markers, so this component can trust
// its props.
//
// Accepted cost: <img>-loaded SVGs don't inherit the page's loaded
// web fonts, so in-diagram JetBrains Mono labels fall back to the
// system monospace. See §0.2 for the per-figure escape hatch
// (data-URI @font-face inside the SVG file).

import type { Figure as FigureType } from '../types'

interface FigureProps {
  articleSlug: string
  figure: FigureType
}

export default function Figure({ articleSlug, figure }: FigureProps) {
  const svgUrl = `/figures/${articleSlug}/${figure.slug}.svg`
  return (
    <figure className="my-6 rounded-xl border border-border-default bg-bg-surface px-5 py-4">
      <div className="mb-1.5 font-mono text-xs uppercase tracking-widest text-text-muted">
        {figure.eyebrow}
      </div>
      <img
        src={svgUrl}
        alt={figure.ariaLabel}
        className="block h-auto w-full"
      />
      <figcaption className="mt-2.5 text-sm leading-relaxed text-text-secondary">
        {figure.caption}
      </figcaption>
    </figure>
  )
}
