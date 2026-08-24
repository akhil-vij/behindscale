// Splits a paragraph-separated plain-text string on blank lines and
// renders each chunk as a <p>. This is the rendering contract for
// Article.problem, Article.solution, and PatternDefinition.definition
// per architecture.md's Content Contract -- those fields are NOT
// markdown today. Markdown rendering is deferred to Unit 7+ (when real
// Claude output arrives); at that point this component swaps for a
// real markdown renderer and consumers stay unchanged.
//
// Figures extension (docs/figures-design.md §6.3, 2026-08-10). When
// the caller passes `slug` (the figure host's slug -- article OR
// pattern) + `figures`, any paragraph chunk matching
// FIGURE_MARKER_EXACT (`{{figure:<slug>}}` alone) resolves to the
// corresponding Figure entry and renders as a <Figure> component
// instead of a <p>. Callers that pass neither prop get the
// today-identical behavior. This is proseRaw() territory per §0.3 --
// the marker must remain in the string so the renderer can see it.
//
// Lists extension (docs/lists-design.md, 2026-08-11). A chunk whose
// lines are all supported list items renders as a <ul>/<ol> instead
// of a <p>. This is the same "one more chunk classification" move as
// figures. parseList() is the shared classifier; the build-time
// `list-block-well-formed` check has already rejected every malformed
// shape, so the renderer trusts it and falls a null result through to
// a <p>.

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FIGURE_MARKER_EXACT } from '../lib/proseText'
import { parseList } from '../lib/proseList'
import type { Figure as FigureType } from '../types'
import Figure from './Figure'

interface ProseProps {
  children: string
  slug?: string
  figures?: readonly FigureType[]
}

// Inline internal cross-links: `[text](/path)` renders as a react-router
// <Link>. INTERNAL only -- the target must start with `/` (the regex won't
// match `http(s)://`), so no external navigation is introduced and the site
// stays static-by-construction. Applied inside paragraphs and list items.
// `/patterns/<slug>` targets are guarded against 404 by the build-time
// `inline-link-targets` check. See docs/Corrections_pattern.md PP-54.
const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]+)\)/g

function renderInline(text: string): ReactNode {
  if (!text.includes('](/')) return text // fast path: no internal links
  const nodes: ReactNode[] = []
  let last = 0
  let k = 0
  INLINE_LINK.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_LINK.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(
      <Link
        key={k++}
        to={m[2]!}
        className="text-accent-primary underline underline-offset-2 hover:text-accent-hover"
      >
        {m[1]}
      </Link>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export default function Prose({ children, slug, figures }: ProseProps) {
  const paragraphs = children.split(/\n{2,}/).filter((p) => p.trim().length > 0)
  const figureBySlug = new Map<string, FigureType>(
    (figures ?? []).map((f) => [f.slug, f]),
  )

  return (
    <div className="mt-4 flex flex-col gap-4">
      {paragraphs.map((p, i) => {
        const trimmed = p.trim()
        const match = trimmed.match(FIGURE_MARKER_EXACT)
        if (match !== null && slug !== undefined) {
          const figureSlug = match[1]!
          const figure = figureBySlug.get(figureSlug)
          if (figure !== undefined) {
            return <Figure key={i} slug={slug} figure={figure} />
          }
          // No matching figure entry: fall through to render as a <p>
          // so nothing renders as blank at runtime. The build-time
          // orphan-figure-markers check catches this case before it
          // ships, so this branch is defense-in-depth for dev
          // preview only.
        }
        const list = parseList(trimmed)
        if (list) {
          const listClass = `ml-5 space-y-2 marker:text-text-muted ${
            list.ordered ? 'list-decimal' : 'list-disc'
          }`
          const items = list.items.map((item, j) => (
            <li key={j} className="pl-1 leading-relaxed text-text-secondary">
              {renderInline(item)}
            </li>
          ))
          return list.ordered ? (
            <ol key={i} className={listClass}>
              {items}
            </ol>
          ) : (
            <ul key={i} className={listClass}>
              {items}
            </ul>
          )
        }
        return (
          <p key={i} className="leading-relaxed text-text-secondary">
            {renderInline(p)}
          </p>
        )
      })}
    </div>
  )
}
