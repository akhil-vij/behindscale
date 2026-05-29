# AI Workflow Rules

## Approach

Build behindscale incrementally using a spec-driven workflow. The context
files define what to build, how to build it, and the current state. Always
implement against these specs — do not infer or invent product behavior from
scratch. When something is undefined, resolve it in the context files first
(see "Handling Missing Requirements").

Build in this rough order, because later stages depend on earlier contracts.
This phasing aligns with the granular "Next Up" list in
`progress-tracker.md`; the tracker is the operational source of truth for
the current unit, this list is the strategic framing.

1. Project scaffolding: Vite + React + TypeScript, Tailwind, and the
   ui-context.md design tokens wired into the Tailwind theme. Nothing else
   is buildable until this is in place.
2. Shared schema types (the content contract) — article summary (with
   `source` block and `patterns[]` references), pattern definition, and
   aggregated pattern library shapes. Bidirectional integrity (invariant 8)
   is enforced by these types. Lives in `src/types/` and is the only
   permitted cross-boundary import (type-only).
3. Website shell with both navigation axes wired up against hand-placed
   sample content from `content/articles/` and `content/patterns/`:
   - Home / article index (`/`) with article cards that show source and
     pattern chips.
   - Article page (`/articles/:slug`) with source attribution and pattern
     chips that link to pattern detail.
   - Pattern library index (`/patterns`) — grid of pattern cards with
     frequency counts and teasers.
   - Pattern detail page (`/patterns/:slug`) with definition, when-it-applies,
     tradeoffs, and "Seen in" back-link cards (each with source attribution).
   Use ui-context.md tokens throughout.
4. Build-time validation step that fails the build on orphan pattern slugs
   (article references a pattern with no definition) — this is how invariant
   8 is actually enforced.
5. Artifact embedding via sandboxed iframes, with a deliberately broken
   sample artifact to prove fault isolation (invariant 2).
6. Pipeline stages one at a time: discover → fetch → analyze → generate →
   publish, each verifiable on its own. The analyze stage emits pattern
   slug *references* on articles; it may also *propose* new pattern slugs
   (logged to progress-tracker.md), but pattern definitions themselves are
   authored separately and never auto-merged.
7. The orchestrator (`pipeline/run.ts`, exposed as `npm run study`) that
   chains the stages into the single daily command. Must be idempotent and
   report per-article success/failure. This is the deliverable that makes the
   whole system usable day to day — treat it as a first-class unit, not an
   afterthought.
8. CI/CD: build + deploy to Vercel (auto on push to `main`); then the
   optional pipeline scheduler, whose
   only job is to invoke `npm run study` on a timer.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.
  In particular, never mix pipeline work and website work in the same step —
  they are different boundaries (architecture.md).

## Sub-Unit Decomposition

Some units are too large to land in a single commit while still ending in a
buildable, verifiable state. When that's the case, split the unit into
lettered sub-units (e.g. 3a, 3b, 3c, …). Each sub-unit:

- Ends in a state where `npm run build` and (when applicable) `npm run dev`
  pass and the increment is visibly working — no half-rendered routes, no
  imports of files that don't exist yet.
- Lands as its own commit using the project's Conventional Commits format
  (`feat: unit 3a — …`).
- Is reviewed by the owner against its own diff, not against the parent
  unit's summary.

The decomposition itself is recorded in `progress-tracker.md` under
"Next Up" before the first sub-unit's code lands.

## Design-Intent Before Code

Some units involve design decisions that propagate widely — visible
component anatomy, error-surface behavior, orchestration models — and are
not pure mechanical execution. Before writing code for these, send the
owner a brief design-intent paragraph (one to two paragraphs, not a spec)
covering the visible choices and why. The owner reviews and confirms
before implementation starts.

Units currently requiring a design-intent paragraph:

- **3b** — article shell components (ArticleCard, PatternChip,
  SourceAttribution). These components are reused across four pages, so
  their anatomy is a load-bearing decision.
- **4** — orphan-pattern-slug validator: where it runs in the build,
  what a failure looks like (which file, which slug, exit code).
- **5** — sandboxed-iframe artifact embed: how missing artifacts
  (`artifact: null`) and broken artifacts surface to the reader without
  breaking the page (invariant 2 + invariant 6).
- **7** — pipeline orchestrator: per-article success/failure reporting
  model and idempotency semantics.

Pure-scaffolding sub-units (e.g. 3a — routing skeleton + placeholders) do
not require a design-intent paragraph; they are mechanical.

## When to Split Work

Split an implementation step if it combines:

- Website (`src/`) changes and pipeline (`pipeline/`) changes.
- Multiple pipeline stages (e.g. fetching and Claude analysis) that can each
  be verified independently.
- The content contract (schema/types) and a consumer of it — define the
  contract first, then build against it.
- Behavior not clearly defined in the context files.

If a change cannot be verified end to end quickly, the scope is too broad —
split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file
  before implementing.
- If a requirement is missing, add it as an open question in
  `progress-tracker.md` before continuing.
- For anything touching the content contract (the JSON the pipeline writes
  and the site reads), update the shared schema/types first; both sides
  depend on it.

## Protected Files / Generated Content

Do not hand-edit the following unless explicitly instructed — they are
generated and will be overwritten by the pipeline:

- `content/articles/*.json` — generated article summaries (pipeline output).
- `content/patterns/index.json` — the aggregated pattern library, derived
  from articles + pattern definitions every pipeline run. Never hand-edit.
- `public/artifacts/*` — compiled artifact bundles.
- Any third-party library internals or generated `components/ui/*` if a
  component CLI is used.

Pattern *definitions* (`content/patterns/{slug}.json` — one file per pattern,
excluding `index.json`) are **authored content**, not generated. They are
hand-written or hand-reviewed and committed deliberately. Edit them like any
other source file.

Treat secrets as untouchable: never write `ANTHROPIC_API_KEY` or any secret
into a committed file.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture, boundaries, or invariants → `architecture.md`.
- Storage model decisions → `architecture.md`.
- Visual tokens, theme, or layout patterns → `ui-context.md`.
- Code conventions or standards → `code-standards.md`.
- Feature scope → `project-overview.md`.
- Claude prompt changes are meaningful — note them in `progress-tracker.md`.

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture.md` was violated — especially:
   static-by-construction (no runtime fetching), artifact fault isolation,
   pipeline/website decoupling, and pipeline idempotency.
3. Generated content validates against the shared schema before being written.
4. `progress-tracker.md` reflects the completed work and any new open questions.
5. `npm run build` passes for the website; pipeline scripts run without error
   on a sample input.