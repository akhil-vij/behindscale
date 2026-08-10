// Splits a paragraph-separated plain-text string on blank lines and
// renders each chunk as a <p>. This is the rendering contract for
// Article.problem, Article.solution, and PatternDefinition.definition
// per architecture.md's Content Contract -- those fields are NOT
// markdown today. Markdown rendering is deferred to Unit 7+ (when real
// Claude output arrives); at that point this component swaps for a
// real markdown renderer and consumers stay unchanged.
//
// Figures extension (docs/figures-design.md §6.3, 2026-08-10). When
// the caller passes `articleSlug` + `figures`, any paragraph chunk
// matching FIGURE_MARKER_EXACT (`{{figure:<slug>}}` alone) resolves
// to the corresponding Figure entry and renders as a <Figure>
// component instead of a <p>. Callers that pass neither prop (e.g.
// pattern definition pages) get the today-identical behavior. This
// is proseRaw() territory per §0.3 -- the marker must remain in the
// string so the renderer can see it.

import { FIGURE_MARKER_EXACT } from '../lib/proseText'
import type { Figure as FigureType } from '../types'
import Figure from './Figure'

interface ProseProps {
  children: string
  articleSlug?: string
  figures?: readonly FigureType[]
}

export default function Prose({ children, articleSlug, figures }: ProseProps) {
  const paragraphs = children.split(/\n{2,}/).filter((p) => p.trim().length > 0)
  const figureBySlug = new Map<string, FigureType>(
    (figures ?? []).map((f) => [f.slug, f]),
  )

  return (
    <div className="mt-4 flex flex-col gap-4">
      {paragraphs.map((p, i) => {
        const trimmed = p.trim()
        const match = trimmed.match(FIGURE_MARKER_EXACT)
        if (match !== null && articleSlug !== undefined) {
          const slug = match[1]!
          const figure = figureBySlug.get(slug)
          if (figure !== undefined) {
            return (
              <Figure key={i} articleSlug={articleSlug} figure={figure} />
            )
          }
          // No matching figure entry: fall through to render as a <p>
          // so nothing renders as blank at runtime. The build-time
          // orphan-figure-markers check catches this case before it
          // ships, so this branch is defense-in-depth for dev
          // preview only.
        }
        return (
          <p key={i} className="leading-relaxed text-text-secondary">
            {p}
          </p>
        )
      })}
    </div>
  )
}
