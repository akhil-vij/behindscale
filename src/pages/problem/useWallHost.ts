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
//   ready       -> reply init {commit, decisions, survived, held}: the stored
//                  sentence plus the restorable design (B2-1/F6). The engine
//                  reconstructs a survived design without animating, then
//                  emits state. This init is the one host->mission message
//                  that mutates engine state; every other touch is observe-only.
//   state       -> {decisions, held, survived, bill}: youMapping() fills the
//                  YOU cells / diagram slots / ticks once survived; a
//                  survived:false after a fill is the mission's reset. The
//                  design (decisions + partial held) persists on every
//                  survived state -- checkpoint:held fires only at the full
//                  debrief, so `held` is sourced here, not from the checkpoint.
//   checkpoint  -> {kind: caused|survived|held}: persisted booleans -- what a
//                  future account merge counts (write-once; reset never clears)
//   touched     -> first deck interaction: reveals the "↑ your decisions"
//                  deck-jump (UI state, deliberately not a checkpoint)
//   reset       -> the reset button: clears the saved design (decisions,
//                  survived, held), keeping commit and the checkpoints
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
// {v:1, commit, checkpoints:{caused,survived,held}, saved:{decisions,
// survived,held}}. Read at mount, written on commit/checkpoint/state,
// every access in try/catch (private mode). A signed-in merge later is a
// copy of this record.
//
// `checkpoints` is write-once (the account-merge signal); reset never
// touches it. `saved` is the restorable design (B2-1/F6): the decisions,
// whether they survived a day, and which attacks held -- reset clears it,
// keeping `commit`. Legacy records that stored `lastDecisions` migrate on
// read into `saved` (survived inferred from the checkpoint, held empty).

export interface WallSaved {
  decisions: Record<string, string>
  survived: boolean
  held: boolean[]
}

export interface WallRecord {
  v: 1
  commit?: string
  checkpoints: { caused: boolean; survived: boolean; held: boolean }
  saved?: WallSaved
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
    const checkpoints = {
      caused: parsed.checkpoints?.caused === true,
      survived: parsed.checkpoints?.survived === true,
      held: parsed.checkpoints?.held === true,
    }
    return {
      v: 1,
      commit: typeof parsed.commit === 'string' ? parsed.commit : undefined,
      checkpoints,
      saved: normalizeSaved(parsed as unknown as Record<string, unknown>, checkpoints.survived),
    }
  } catch {
    return EMPTY_RECORD
  }
}

// Parse the restorable design, migrating legacy records that stored the
// decisions under `lastDecisions` (pre-B2-1) into the `saved` shape.
function normalizeSaved(
  parsed: Record<string, unknown>,
  checkpointSurvived: boolean,
): WallSaved | undefined {
  const s = parsed.saved as Partial<WallSaved> | undefined
  if (s && typeof s.decisions === 'object' && s.decisions !== null) {
    return {
      decisions: s.decisions as Record<string, string>,
      survived: s.survived === true,
      held: Array.isArray(s.held) ? s.held.map(Boolean) : [],
    }
  }
  const legacy = parsed.lastDecisions
  if (legacy && typeof legacy === 'object') {
    return {
      decisions: legacy as Record<string, string>,
      survived: checkpointSurvived,
      held: [],
    }
  }
  return undefined
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
// Sticky station nav clearance, so anchor jumps land below it -- matches the
// CSS scroll-margin-top (nav 44 + 16 breathing at >=700px; 40 + 12 under). The
// exact per-breakpoint value is computed at scroll time; this is the fallback
// useDecideHighlight uses when it can't measure the live nav (§4, F4/F5).
export const NAV_OFFSET_PX = 60

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
    // The "You said" foot under the YOU diagram only makes sense once the
    // design has survived (the diagram is otherwise empty). A commit with no
    // survived design stays in the artifact's own commit box (via init).
    if (record.commit !== undefined && record.saved?.survived) {
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

  // B2-6 (F16): a same-page #hash link that points at a <details> (the matrix
  // row labels and the steal list link to the question rows) opens that row
  // on click, so it doesn't land closed. The mission's own hint links arrive
  // as anchor messages and open their target in onMissionMessage.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')?.slice(1)
      if (!id) return
      const el = document.getElementById(id)
      if (el instanceof HTMLDetailsElement) el.open = true
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
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
          const saved = recordRef.current.saved
          reply({
            v: 1,
            wall: cruxTag,
            type: 'init',
            commit: recordRef.current.commit,
            // The restorable design (B2-1/F6). Sent only when it survived; the
            // engine reconstructs it without animating, then emits state.
            decisions: saved?.survived ? saved.decisions : undefined,
            survived: saved?.survived === true,
            held: saved?.survived ? saved.held : undefined,
          })
          return
        }
        case 'state': {
          const decisions = (m.decisions ?? {}) as Record<string, string>
          const held = Array.isArray(m.held) ? (m.held as unknown[]).map(Boolean) : []
          const survived = m.survived === true
          // Persist the restorable design on every survived state -- this is
          // where the partial `held` array lives (checkpoint:held only fires
          // once, at the full debrief; noted in the B2-1 changelog). A
          // non-survived state drops the saved design but keeps commit.
          persist((r) =>
            survived
              ? { ...r, saved: { decisions, survived: true, held } }
              : r.saved
                ? { ...r, saved: undefined }
                : r,
          )
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
        case 'reset': {
          // The mission's reset button (B2-1/F6): clear the saved design
          // (decisions, survived, held), keeping commit and the write-once
          // checkpoints. The YOU diagram empties, so its "You said" foot
          // hides too, but the sentence persists (record.commit + the
          // artifact's own commit box).
          persist((r) => (r.saved ? { ...r, saved: undefined } : r))
          setYou((prev) => ({ ...prev, filled: false, cells: {}, held: [], commit: undefined }))
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
            // B2-6 (F16): open the target row (a <details>) before scrolling,
            // so a hint lands on an open question, not a closed one.
            if (el instanceof HTMLDetailsElement) el.open = true
            // Match the CSS scroll-margin-top: 60 at >=700px, 52 under (§4).
            const navClear = window.innerWidth <= SCROLLPORT_MAX_WIDTH ? 52 : 60
            scrollPageTo(el.getBoundingClientRect().top + window.pageYOffset - navClear)
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
