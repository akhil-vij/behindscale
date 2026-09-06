import type { Figure } from './figure'

// Per-class authored content for a problem page (nav-IA progressive-
// authoring model). Every field is OPTIONAL: a class with no essay file
// renders fully derived (the "minimal" state, matching the
// problem-queue-backlog design handoff); authoring a class fills in blocks
// that each REPLACE their derived placeholder. The full state (the
// problem-ambiguous-timeouts v7.3 port, 2026-09-06) is just this record
// with every block present -- there is no separate "full" template, only
// more blocks filled.
//
// Keyed by `cruxTag` (the frozen join key), so an editorial urlSlug rename
// never orphans the file. Stored at content/problems/<cruxTag>.json.
//
// The shell (src/pages/ProblemDetail.tsx) renders whatever fields exist
// and hard-codes none of a wall's mechanics: the number of stations,
// comparison rows, questions, attacks and decisions is per wall. Per-wall
// CODE (the `youMapping()` that turns mission state into YOU cells) lives
// in src/walls/<urlSlug>.ts, looked up by cruxTag -- see src/walls/index.ts.
export interface ProblemEssay {
  // The frozen cruxTag this essay authors. Must resolve to a registry
  // entry (enforced by the problem-essay validator).
  cruxTag: string
  // Replaces the class label as the page H1 (the label then moves into the
  // eyebrow). A reader-facing hook line, e.g. "Your payment API timed out.
  // Did the charge go through?"
  headline?: string
  // One-line italic teaser shown under the title.
  lede?: string
  // Opening prose paragraphs shown between the nav and "The wall". Inline
  // markup: `**bold**`, `[text](/path)`, `[text](#anchor)`.
  intro?: string[]
  // Provenance (stored now; the strip renders in Phase 6).
  edition?: number
  firstSentAt?: string
  // The flexibility escape valve (docs/problem-page-design.md §5a). A list of
  // authored generic sections rendered at one fixed insertion point (between
  // "what to steal" and the pattern chips), so the closed slot set can never
  // say "no" to an editor. Incubator, not destination: a recurring shape gets
  // PROMOTED to a first-class block. Shipped now as a FIELD STUB -- validated
  // (title non-empty, blocks is an array) but not yet rendered; `blocks` is
  // typed loosely until the shared ProseBlock renderer lands.
  extraSections?: ProblemExtraSection[]

  // -- v7.3 rich blocks (2026-09-06). Each is render-when-present. --

  // Essay-hosted figures (the figures system, docs/problem-page-design.md
  // §6). Stored at content/figures/<cruxTag>/<figure-slug>.svg; referenced
  // by `wall.figureSlug` (the no-JS wall figure) or a {{figure:slug}} marker
  // in `intro` / `wall.prose`.
  figures?: Figure[]
  // The sticky station nav + the time budgets. Budgets come from content,
  // never from the nav component. The list-page estimate is COMPUTED: the
  // sum of `minutes` over stations flagged `estimate`, rounded UP to the
  // nearest 5 (3+15+10+5 = 33 -> "~35 min"). No stored estimate field.
  stations?: ProblemStation[]
  // "The wall": authored prose replaces the derived definition paragraph;
  // the stat strip + the noscript figure follow the try-it artifact.
  wall?: ProblemWall
  // The try-it artifact (cause the failure). Its bundle lives at
  // /artifacts/<artifactSlug>/index.html (flat namespace, Approach A).
  tryIt?: ProblemTryIt
  // The build-it mission artifact. Presence drives the /problems list's
  // Playable badge + teaser + computed estimate.
  mission?: ProblemMission
  // The hint sheet: spectrum, diagram strip (+ the YOU row), matrix (+ the
  // YOU column), and the full answers. Replaces the derived "Same wall,
  // N systems" table.
  comparison?: ProblemComparison
  // "Which answer is yours" -- the constraint -> article decision guide.
  decide?: ProblemDecide
  // "What to steal" -- the transferable rules.
  steal?: ProblemSteal
  // "If this comes up in an interview" -- five parts, live ticks.
  interview?: ProblemInterview
  // "Patterns in this class": chips stay DERIVED from the members; the
  // authored block adds the intro line and an optional display order.
  patterns?: ProblemPatternsSection
  // "Every article": cards stay DERIVED from the members (chronological
  // when this block is present); the authored block adds the intro line
  // and per-article "break it" teasers that override `artifact.teaser`.
  cards?: ProblemCards
  // The "Read the originals" line. URLs derive from the member articles;
  // the labels are authored (a company's display name can differ from
  // `source.company`, e.g. "AWS" vs "Amazon (AWS)").
  sources?: ProblemSources
}

export interface ProblemExtraSection {
  title: string
  // ProseBlock union (prose / steps / stat / chart) once the renderer exists;
  // `unknown[]` for now so the stub commits to no premature block shape.
  blocks: unknown[]
}

export interface ProblemStation {
  id: string
  // The in-page anchor id the nav link targets (without `#`). For the
  // artifact stations this is the iframe WRAPPER's id (the artifact's own
  // root lives inside the sandboxed iframe).
  anchor: string
  label: string
  // Budget in minutes; null = no budget shown.
  minutes: number | null
  // Renders the budget as "N+ MIN" (an open-ended station).
  openEnded?: boolean
  // Counts toward the computed list-page estimate.
  estimate?: boolean
}

export interface ProblemWallStat {
  value: string
  label: string
  source: string
}

export interface ProblemWall {
  // Paragraphs above the try-it artifact (inline markup allowed).
  prose: string[]
  // Slug of a `figures[]` entry rendered inside <noscript> as the no-JS
  // stand-in for the try-it artifact.
  figureSlug?: string
  stats?: ProblemWallStat[]
  // Muted line under the stat strip.
  statsCaption?: string
}

export interface ProblemTryIt {
  artifactSlug: string
  // One line naming what the reader can DO; the iframe title + no-JS line.
  teaser: string
  // Caption under the artifact (inline markup allowed).
  caption: string
}

export interface ProblemMission {
  artifactSlug: string
  // The break-it teaser shown on the /problems list beside the Playable badge.
  teaser: string
  // Section heading + intro paragraph above the artifact.
  title: string
  intro: string
  // The page-flow pause block after the artifact, and the "stuck?" note.
  stopblock?: string
  stuckNote?: string
}

export interface ProblemSpectrumPoint {
  label: string
  // Percent along the track, 0-100.
  left: number
  // Raise the label above the track (alternating labels avoid overlap).
  up?: boolean
}

export interface ProblemSpectrum {
  eyebrow: string
  points: ProblemSpectrumPoint[]
  ends: [string, string]
  caption: string
}

export interface ProblemLegendItem {
  kind: 'key' | 'state' | 'reply' | 'break'
  label: string
}

export interface ProblemDiagramRow {
  company: string
  year: string
  vantage: string
  // Member article the company name links to.
  articleSlug?: string
  // Inline SVG file at content/problems/<cruxTag>/<svg>.svg, inlined into
  // the page so it can use the page's diagram classes + tokens.
  svg: string
  caption: string
  open?: boolean
}

export interface ProblemYouRow {
  name: string
  year: string
  vantage: string
  // Two inline SVG files: the empty state (verbatim promise) and the filled
  // state with `{{slot}}` placeholders the host fills from youMapping().
  emptySvg: string
  filledSvg: string
  open?: boolean
}

// A "not stated" cell renders as the dashed-gap treatment, never guessed.
export type ProblemMatrixCell = string | { ns: string }

export interface ProblemMatrixRow {
  // Row id == the youMapping() key that fills the YOU cell.
  id: string
  label: string
  // Question id the label links to (e.g. "q1").
  qref?: string
  // One cell per `comparison.columns` entry (the YOU cell is host-filled).
  cells: ProblemMatrixCell[]
  // The lead row (ink + weight 600 on its label).
  lead?: boolean
  // The hot row (amber label, tinted cells).
  hot?: boolean
}

export interface ProblemAnswer {
  company: string
  year?: string
  text: string
  // "Not stated" answer: italic with the dashed left rule.
  ns?: boolean
}

export interface ProblemQuestion {
  id: string
  title: string
  why?: string
  // Optional inline SVG figure between the why-line and the answers.
  figure?: { svg: string; caption?: string }
  answers: ProblemAnswer[]
  open?: boolean
  hot?: boolean
}

export interface ProblemComparison {
  title: string
  lede: string
  spectrum: ProblemSpectrum
  diagramTitle: string
  legend: ProblemLegendItem[]
  diagramRows: ProblemDiagramRow[]
  you: ProblemYouRow
  stripNote?: string
  matrixLead?: string
  // Column headers for the compared systems (the YOU column is appended).
  columns: string[]
  youColumn: { emptyLabel: string; label: string }
  matrixRows: ProblemMatrixRow[]
  matrixCaption?: string
  questions: ProblemQuestion[]
}

export interface ProblemDecide {
  intro: string
  rows: { if: string; then: string }[]
  elsewhere?: { title: string; text: string }
}

export interface ProblemSteal {
  intro: string
  items: { rule: string; text: string; qref?: string }[]
}

export interface ProblemInterviewFollowup {
  ask: string
  attack: string
  // What held -- the live tick is prefixed by the host.
  held: string
}

export interface ProblemInterview {
  asks: string[]
  shape: string
  followupsIntro: string
  followups: ProblemInterviewFollowup[]
  senior: string
  staff: string
  closing: string
  redFlags: string[]
}

export interface ProblemPatternsSection {
  intro: string
  // Display order (pattern slugs). Unlisted member patterns follow, A-Z.
  order?: string[]
}

export interface ProblemCards {
  // Defaults to the derived section's "Every breakdown".
  title?: string
  intro: string
  // articleSlug -> break-it line, overriding that article's artifact.teaser.
  teasers?: Record<string, string>
}

export interface ProblemSources {
  intro: string
  items: { label: string; articleSlug: string }[]
}
