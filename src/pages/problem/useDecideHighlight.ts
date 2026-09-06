import { useCallback, useRef, useState } from 'react'
import type { ProblemDecide } from '../../types'
import { NAV_OFFSET_PX } from './useWallHost'

// "Which answer is yours" rows point at the at-a-glance table: selecting a
// row highlights its `highlights` column(s) (the YOU column's own grammar);
// selecting it again, or another row, clears the previous one. When the
// table is off-screen the page scrolls to it -- window.scrollTo with the nav
// offset, never scrollIntoView (design changelog).
//
// Client-side state only; the prerendered page has no row selected.
export interface DecideHighlight {
  activeRow: number | null
  highlightColumns: readonly string[]
  select: (row: number) => void
}

const GLANCE_ID = 'glance'

// The sticky station nav wraps to two lines at some widths, so measure it
// (falling back to the constant the anchor messages use) and leave a little
// air under it.
function navOffset(): number {
  const nav = document.querySelector('nav.ppnav')
  const h = nav ? nav.getBoundingClientRect().height : NAV_OFFSET_PX
  return Math.ceil(h) + 8
}

export function useDecideHighlight(
  rows: ProblemDecide['rows'] | undefined,
): DecideHighlight {
  const [activeRow, setActiveRow] = useState<number | null>(null)
  // The current selection, readable synchronously in the click handler (the
  // scroll is a side effect, kept out of the state updater).
  const activeRef = useRef<number | null>(null)

  const select = useCallback((row: number) => {
    const next = activeRef.current === row ? null : row
    activeRef.current = next
    setActiveRow(next)
    if (next === null) return
    const table = document.getElementById(GLANCE_ID)
    if (!table) return
    const r = table.getBoundingClientRect()
    const offset = navOffset()
    if (r.top < offset || r.bottom > window.innerHeight) {
      window.scrollTo({
        top: Math.max(0, r.top + window.pageYOffset - offset),
        behavior: 'smooth',
      })
    }
  }, [])

  const highlightColumns =
    activeRow !== null ? (rows?.[activeRow]?.highlights ?? []) : []

  return { activeRow, highlightColumns, select }
}
