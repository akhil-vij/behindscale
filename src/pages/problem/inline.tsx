import type { ReactNode } from 'react'
import { renderInline } from '../../components/Prose'

// The problem page renders authored copy through the shared inline subset
// (`**bold**`, `[text](/path)`, `[text](#anchor)`) with the reference build's
// link styling (ink on hover, underline on hover -- not the article prose's
// always-underlined links).
export function pp(text: string): ReactNode {
  return renderInline(text, 'pp-link')
}

// Escape text for the inline-SVG slot substitution and the noscript HTML.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
