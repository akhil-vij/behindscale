import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProblemStation } from '../../types'
import type { WallModule } from '../../walls'
import { EMPTY_YOU, type YouState } from './youState'

// The host side of the mission <-> page protocol (v1) for a problem page
// with a playable wall. Everything here is client-side (effects only): the
// prerendered copy never depends on it, and the first client render matches
// the server HTML (YOU empty, default frame heights) before any message
// arrives.
//
// Protocol (mission -> host), every message `{v:1, wall, type, ...}`; the
// embed already gates on event.source === iframe.contentWindow, and this hook
// ignores anything with v !== 1 or the wrong wall:
//   ready       -> reply init {commit} (the stored sentence)
//   state       -> {decisions, held, survived, bill}: youMapping() fills the
//                  YOU cells / diagram slots / ticks once survived; a
//                  survived:false after a fill is the mission's reset
//   checkpoint  -> {kind: caused|survived|held}: persisted booleans -- what a
//                  future account merge counts
//   touched     -> first deck interaction: reveals the "↑ your decisions"
//                  deck-jump (UI state, deliberately not a checkpoint)
//   commit      -> {text}: persisted; shown under the YOU diagram
//   size        -> {h}: content height, applied in content-height mode
//   anchor      -> {id} scrolls the page to #id (the artifact's hint links
//                  target the page); {frame:{top,height}} centers a region of
//                  the frame (the "→ the decision" jump) -- ignored while the
//                  frame is its own scrollport
// Try-it -> host: size only.
//
// Sizing (owner ruling a): under 700px the mission iframe is the scrollport
// (~90dvh, internal scrolling) so its sticky RUN bar, damage toast, and
// scroll-to-log work as designed; at 700px and above the frame is
// content-height from `size`. The mode keys off the frame's OWN width (the
// artifact's own breakpoint), so the frame and the host never disagree. No
// overscroll-behavior anywhere -- page scroll chains at the frame's edges.
//
// Storage: one record per wall, localStorage['bs:wall:<cruxTag>'] ->
// {v:1, commit, checkpoints:{caused,survived,held}, lastDecisions}. Read at
// mount, written on commit/checkpoint/state, every access in try/catch
// (private mode). A signed-in merge later is a copy of this record.

export interface WallRecord {
  v: 1
  commit?: string
  checkpoints: { caused: boolean; survived: boolean; held: boolean }
  lastDecisions?: Record<string, string>
}

const EMPTY_RECORD: WallRecord = {
  v: 1,
  checkpoints: { caused: false, survived: false, held: false },
}

export function wallStorageKey(cruxTag: string): string {
  return `bs:wall:${cruxTag}`
}

export function readWallRecord(cruxTag: string): WallRecord {
  try {
    const raw = window.localStorage.getItem(wallStorageKey(cruxTag))
    if (!raw) return EMPTY_RECORD
    const parsed = JSON.parse(raw) as Partial<WallRecord> | null
    if (!parsed || parsed.v !== 1) return EMPTY_RECORD
    return {
      v: 1,
      commit: typeof parsed.commit === 'string' ? parsed.commit : undefined,
      checkpoints: {
        caused: parsed.checkpoints?.caused === true,
        survived: parsed.checkpoints?.survived === true,
        held: parsed.checkpoints?.held === true,
      },
      lastDecisions:
        parsed.lastDecisions && typeof parsed.lastDecisions === 'object'
          ? parsed.lastDecisions
          : undefined,
    }
  } catch {
    return EMPTY_RECORD
  }
}

function writeWallRecord(cruxTag: string, record: WallRecord): void {
  try {
    window.localStorage.setItem(wallStorageKey(cruxTag), JSON.stringify(record))
  } catch {
    // private mode / quota: persistence is best-effort
  }
}

// Frame-height clamp for the content-height mode (a runaway size message
// can't make the page unbounded).
const MIN_FRAME_PX = 320
const MAX_FRAME_PX = 20000
const SCROLLPORT_MAX_WIDTH = 700
const SCROLLPORT_HEIGHT = '90dvh'
// Sticky station nav height, so anchor jumps land below it.
const NAV_OFFSET_PX = 44

interface Message {
  v?: unknown
  wall?: unknown
  type?: unknown
  [key: string]: unknown
}

export interface WallHostInput {
  cruxTag: string
  wall: WallModule | undefined
  stations: readonly ProblemStation[] | undefined
  hasMission: boolean
  hasTryIt: boolean
  // Wrapper id of the mission frame (the station anchor + the frame the
  // anchor messages measure against).
  missionWrapperId: string
}

export interface WallHost {
  you: YouState
  touched: boolean
  currentStation: string | undefined
  missionHeight: string | undefined
  tryItHeight: string | undefined
  onMissionMessage: (data: unknown, reply: (message: unknown) => void) => void
  onTryItMessage: (data: unknown, reply: (message: unknown) => void) => void
}

export function useWallHost(input: WallHostInput): WallHost {
  const { cruxTag, wall, stations, hasMission, hasTryIt, missionWrapperId } = input
  const [you, setYou] = useState<YouState>(EMPTY_YOU)
  const [touched, setTouched] = useState(false)
  const [currentStation, setCurrentStation] = useState<string | undefined>(undefined)
  const [scrollport, setScrollport] = useState(false)
  const [missionSize, setMissionSize] = useState<number | undefined>(undefined)
  const [tryItHeight, setTryItHeight] = useState<string | undefined>(undefined)
  const recordRef = useRef<WallRecord>(EMPTY_RECORD)
  const wallRef = useRef(wall)
  wallRef.current = wall

  // Mount: the stored record (the commit sentence shows under the YOU
  // diagram before any message arrives, as the reference page did).
  useEffect(() => {
    if (!cruxTag) return
    const record = readWallRecord(cruxTag)
    recordRef.current = record
    if (record.commit !== undefined) {
      setYou((prev) => ({ ...prev, commit: record.commit }))
    }
  }, [cruxTag])

  // Scrollport mode keys off the mission wrapper's width.
  useEffect(() => {
    if (!hasMission || typeof ResizeObserver === 'undefined') return
    const el = document.getElementById(missionWrapperId)
    if (!el) return
    const apply = () => setScrollport(el.getBoundingClientRect().width <= SCROLLPORT_MAX_WIDTH)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasMission, missionWrapperId])

  // Scroll-spy over the station anchors. The reference build's rootMargin
  // (-20% / -70%): a station is current while its anchor crosses the band
  // just below the top of the viewport.
  useEffect(() => {
    if (!stations || stations.length === 0 || typeof IntersectionObserver === 'undefined') return
    const byElement = new Map<Element, string>()
    for (const s of stations) {
      const el = document.getElementById(s.anchor)
      if (el) byElement.set(el, s.id)
    }
    if (byElement.size === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const id = byElement.get(e.target)
          if (id !== undefined) setCurrentStation(id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const el of byElement.keys()) io.observe(el)
    return () => io.disconnect()
  }, [stations])

  // One-time horizontal-scroll hints on the overflowing tables/strips
  // (right-edge fade + "⟷", cleared on that container's first scroll).
  useEffect(() => {
    const wraps = Array.from(document.querySelectorAll<HTMLElement>('.matrix-wrap, .anat-scroll'))
    const offs: Array<() => void> = []
    for (const w of wraps) {
      if (w.scrollWidth > w.clientWidth + 4) w.classList.add('scrollhint')
      const once = () => {
        w.classList.remove('scrollhint')
        w.removeEventListener('scroll', once)
      }
      w.addEventListener('scroll', once, { passive: true })
      offs.push(() => w.removeEventListener('scroll', once))
    }
    return () => offs.forEach((off) => off())
  }, [])

  const persist = useCallback(
    (patch: (r: WallRecord) => WallRecord) => {
      const next = patch(recordRef.current)
      recordRef.current = next
      writeWallRecord(cruxTag, next)
    },
    [cruxTag],
  )

  const scrollPageTo = useCallback((top: number) => {
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [])

  const onMissionMessage = useCallback(
    (data: unknown, reply: (message: unknown) => void) => {
      const m = data as Message | null
      if (!m || m.v !== 1 || m.wall !== cruxTag) return
      switch (m.type) {
        case 'ready': {
          reply({ v: 1, wall: cruxTag, type: 'init', commit: recordRef.current.commit })
          return
        }
        case 'state': {
          const decisions = (m.decisions ?? {}) as Record<string, string>
          const held = Array.isArray(m.held) ? (m.held as unknown[]).map(Boolean) : []
          const survived = m.survived === true
          persist((r) => ({ ...r, lastDecisions: decisions }))
          setYou((prev) => {
            if (survived) {
              const cells = wallRef.current ? wallRef.current.youMapping(decisions, held) : {}
              return { ...prev, filled: true, cells, held }
            }
            // A non-survived state after a fill is the mission's reset.
            return prev.filled ? { ...prev, filled: false, cells: {}, held: [] } : prev
          })
          return
        }
        case 'checkpoint': {
          const kind = m.kind
          if (kind !== 'caused' && kind !== 'survived' && kind !== 'held') return
          persist((r) => ({ ...r, checkpoints: { ...r.checkpoints, [kind]: true } }))
          return
        }
        case 'commit': {
          const text = typeof m.text === 'string' ? m.text.trim() : ''
          if (!text) return
          persist((r) => ({ ...r, commit: text }))
          setYou((prev) => ({ ...prev, commit: text }))
          return
        }
        case 'touched': {
          setTouched(true)
          return
        }
        case 'size': {
          const h = typeof m.h === 'number' && Number.isFinite(m.h) ? m.h : undefined
          if (h === undefined) return
          setMissionSize(Math.min(MAX_FRAME_PX, Math.max(MIN_FRAME_PX, Math.ceil(h))))
          return
        }
        case 'anchor': {
          if (typeof m.id === 'string') {
            const el = document.getElementById(m.id)
            if (!el) return
            scrollPageTo(el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET_PX)
            return
          }
          const frame = m.frame as { top?: unknown; height?: unknown } | undefined
          if (!frame || typeof frame.top !== 'number' || typeof frame.height !== 'number') return
          if (scrollport) return // the frame scrolls itself (the engine's own scrollTo)
          const iframe = document.querySelector<HTMLIFrameElement>(`#${missionWrapperId} iframe`)
          if (!iframe) return
          const frameTop = iframe.getBoundingClientRect().top + window.pageYOffset
          scrollPageTo(frameTop + frame.top - (window.innerHeight - frame.height) / 2)
          return
        }
        default:
          return
      }
    },
    [cruxTag, persist, scrollPageTo, scrollport, missionWrapperId],
  )

  const onTryItMessage = useCallback(
    (data: unknown) => {
      const m = data as Message | null
      if (!m || m.v !== 1 || m.wall !== cruxTag) return
      if (m.type === 'size' && typeof m.h === 'number' && Number.isFinite(m.h)) {
        setTryItHeight(`${Math.min(MAX_FRAME_PX, Math.max(MIN_FRAME_PX, Math.ceil(m.h)))}px`)
      }
    },
    [cruxTag],
  )

  const missionHeight = hasMission
    ? scrollport
      ? SCROLLPORT_HEIGHT
      : missionSize !== undefined
        ? `${missionSize}px`
        : undefined
    : undefined

  return {
    you,
    touched,
    currentStation,
    missionHeight,
    tryItHeight: hasTryIt ? tryItHeight : undefined,
    onMissionMessage,
    onTryItMessage,
  }
}

// The frame wrappers' ids, shared by the page, the sections, and the hook.
export const MISSION_WRAPPER_ID = 'artB'
export const TRYIT_WRAPPER_ID = 'artifact'
