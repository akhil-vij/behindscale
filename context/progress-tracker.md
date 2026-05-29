# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Phase 3 complete.** Unit 3 (3a-3e) fully landed; the website shell
  renders sample content across all four routes with the smoke test
  green. Moving to Unit 4 (build-time orphan-pattern-slug validator)
  next — design-intent paragraph required first.

## Current Goal

- Stand up the repository skeleton and the shared content-contract types,
  then a minimal website shell that renders sample content.

## Completed

- Context files authored: project-overview, architecture (Content Contract
  enumerates Source, Article, and Patterns shapes in full), ui-context,
  code-standards, ai-workflow-rules, CLAUDE.md.
- Key design decisions locked (see Architecture Decisions below).
- **Unit 1 — Project scaffolding.** Vite + React 18 + TypeScript (strict)
  initialized. Tailwind v3 configured with the full ui-context.md token set
  exposed as CSS custom properties in `src/index.css` and surfaced through
  `tailwind.config.js` `theme.extend` (colors, fontFamily, borderRadius).
  No hardcoded hex outside `src/index.css` (the token source).
  `npm run dev` boots cleanly on `http://localhost:5173/`; `npm run build`
  passes (`tsc -b && vite build`). Minimal `App.tsx` renders the
  "behindscale" wordmark using `bg-bg-base`, `text-text-primary`, and
  `font-sans` — token wiring verified end-to-end. Webfonts (Inter /
  JetBrains Mono) deferred to Unit 3 (will use `@fontsource` for
  self-hosting per invariant 1); current `--font-sans` / `--font-mono`
  are system fallback stacks. Tailwind v3 locked in for the project.
- **Unit 2 — Shared schema types.** The content contract is now typed in
  `src/types/`:
  - `source.ts` — `Source` (name, slug, company, url, feed), matching the
    Content Contract in architecture.md.
  - `pattern.ts` — `PatternReference` (on-article: slug, note) and
    `PatternDefinition` (slug, name, definition, whenItApplies, tradeoffs,
    optional category).
  - `article.ts` — `Article` (slug, title, url, publishedAt, source,
    summary, problem, solution, tradeoffs, tags, patterns, optional
    relatedArticles, optional generatedAt, required artifact as
    `{ path: string } | null`). Source and PatternReference imported as
    type-only.
  - `pattern-library.ts` — `PatternLibraryArticleRef`,
    `PatternLibraryEntry` (definition, frequency, articles, companies),
    and `PatternLibrary` ({ generatedAt, entries }).
  - `index.ts` — type-only barrel export.

  All files are type-only: zero runtime logic. Tests under
  `src/types/__tests__/` use hand-written type-guard predicates in
  `validators.ts` (test-only; never exported from the barrel, never
  imported outside tests) — no Zod. Each shape has a positive sample +
  multiple malformed samples that the predicate rejects, including the
  `artifact: null` summary-only case and rejection of missing-artifact
  entirely. **34 tests, 4 files, all passing**; `npm run build` still
  passes (5.99 kB CSS, 142.70 kB JS — types add zero runtime weight).
  Vitest 2.1 added to devDependencies; `npm test` runs the suite. Tests
  live colocated under `src/types/__tests__/` — pattern to repeat for
  future types.
- **Unit 3e — Pattern detail page (`/patterns/:slug`).** Closes out
  Unit 3. Reading-column layout (max-width 720px), section ordering per
  ui-context.md: pattern name (h1) → category eyebrow (if set) →
  Definition → When it applies → Tradeoffs → "Seen in". The
  `Prose` helper that lived inline in ArticleDetail was lifted to
  `src/components/Prose.tsx` and is now imported by both pages; it
  encodes the paragraph-separated-plain-text rendering contract from
  architecture.md (markdown rendering deferred to Unit 7+ as a
  one-component swap). "Seen in" reads `patternStats.articleSlugs`,
  resolves each via `articleBySlug`, and renders a back-link card per
  article reusing `SourceAttribution variant="card"` plus the article
  title (Link to `/articles/:slug`) and the per-article `note` —
  exactly the surface 3b's role-based variant naming was set up for.
  Empty `seenIn` shows a "No articles embody this pattern yet" message
  (patterns may exist before their first article per architecture.md
  invariant 8).
  - SourceAttribution card-variant Link target updated to
    `/?source=<slug>` per the locked Unit-6 URL shape — the query string
    is currently inert (no filter reads it yet) and becomes effective
    in Unit 6 with zero changes to this component. The component's
    comment now references the locked shape directly.
  - Missing-slug case: "Pattern not found" with a back link to
    `/patterns`. Invariant 6 (skip + flag, never crash).
  - Smoke test updated to assert the real PatternDetail h1
    (`Atomic Phases`) plus h2s `Definition`, `When it applies`,
    `Seen in`. Still 1/1 passing in 2.5 s (31.3 s total with build +
    preview boot).
  - Build passes (CSS 42.28 kB / JS 179.46 kB; +2.0 kB JS over 3d for
    PatternDetail + Prose extraction). `npm test` still 34 passing.
- **Unit 3d — Pattern library index + first Playwright smoke test.**
  Per the "build platforms, not point solutions" guidance, the
  aggregation lives behind a stable interface so Unit 4 can swap the
  implementation without touching consumers. `src/content/index.ts` now
  exports `patternStats: ReadonlyMap<string, PatternStatsEntry>` where
  `PatternStatsEntry = { frequency, articleSlugs, sourceSlugs }`. 3d's
  implementation walks the in-memory `articles` array at module load and
  aggregates; the function has an explicit comment marking the
  Unit 4+ swap point (replace with a read of
  `content/patterns/index.json`, the pipeline-generated aggregated
  library; the exported shape stays identical). PatternCard +
  PatternIndex never know the difference.
  - `src/components/PatternCard.tsx` — whole-card-as-`Link` (no nested
    anchors; single click target unlike ArticleCard). Renders pattern
    name, optional category eyebrow, frequency line
    (`Seen in N articles across M companies` — pluralized, handles
    zero/one), and a 2-line teaser from the first paragraph of
    `definition`.
  - `src/pages/PatternIndex.tsx` — `Patterns` h1, then a `grid-cols-1
    md:grid-cols-3` grid of PatternCards per ui-context.md. Sample data
    renders one card.
  - **Playwright smoke test** lands in this commit. `@playwright/test`
    on devDependencies; `npx playwright install chromium` is the
    one-time browser install (documented in Developer Setup above and
    will be wired into CI). `playwright.config.ts` runs the build +
    `vite preview --port 4173` and tests against the production bundle
    (not the dev server — the bundle is what users actually load).
    `tests/e2e/smoke.spec.ts` is a single test that walks all four
    routes per the testing strategy: load `/` → click article title →
    click pattern chip → click "Patterns" in the navbar. After each
    navigation, asserts both the URL is correct AND that a page-specific
    element rendered (so a silent crash to a blank page fails the test,
    not just routing). New `npm run test:e2e` script. Test passes in
    3.2 s (37 s including build + preview boot).
  - Bundle: CSS 42.28 kB / JS 177.46 kB (+1.3 kB JS over 3c — patternStats
    + PatternCard). `npm test` still 34 passing.
- **Unit 3c — Article detail page (`/articles/:slug`).** Reading-column
  layout (max-width 720px) per ui-context.md. Composition only — reuses
  `SourceAttribution variant="header"` (with external links to the source
  blog and to the original article, both `target="_blank"`) and
  `PatternChip` from 3b. Section ordering chosen for narrative flow:
  title → source header → summary paragraph → Problem → Solution →
  Tradeoffs → "Patterns in this article". Patterns surface at the bottom
  as takeaway anchors (the reader already saw chips on the index card;
  re-surfacing them at the top would be redundant). Tradeoffs render as
  an unstyled `<ul list-none>` so each item reads as a clean paragraph
  while staying semantically a list. Each pattern in the bottom section
  shows its chip plus the per-article `note` so the reader sees how
  *this* article applies the pattern.
  - Local helpers `Section` (h2 wrapper) and `Prose` (splits a
    markdown-ish string on blank lines and renders each chunk as a `<p>`)
    keep the page composable. Real markdown rendering is deferred to a
    future unit when Claude-generated content needs it; sample content is
    plain paragraphs.
  - Missing-slug case: when `articleBySlug.get(slug)` is undefined, the
    page renders a clear "Article not found" state with a link back to
    `/`. Invariant 6 (skip + flag on bad entry, never crash).
  - Indexer tightening landed in this commit: pattern glob now uses an
    array form with explicit negation
    `['/content/patterns/*.json', '!/content/patterns/index.json']` so
    Vite skips loading the future derived aggregated library at the glob
    level rather than filtering after load. Runtime filter helper
    removed. Forward-protects the indexer from the moment Unit 4+ starts
    writing `index.json`.
  - Build passes (CSS 41.92 kB / JS 176.12 kB; +1.5 kB JS over 3b);
    `npm test` still 34 passing.
- **Unit 3b — Content indexer + ArticleCard + PatternChip +
  SourceAttribution.** Foundational addition before component work:
  `src/content/index.ts` is the build-time content indexer using
  `import.meta.glob('/content/articles/*.json', { eager: true,
  import: 'default' })` (and same for patterns). Exports `articles`
  (sorted by `publishedAt` desc), `articleBySlug`, `patterns` (sorted by
  `name`), and `patternBySlug`. Type-only schema imports from
  `src/types/`. Eager glob — all content bundled at build time, invariant
  1 intact. `content/patterns/index.json` is excluded (reserved for the
  Unit 4+ derived aggregated library). The `feeds` export is deferred to
  Unit 6 (see Open Questions). Tailwind's category color tokens (`--cat-*`)
  now have parallel `-rgb` triplet variants in `index.css` so opacity
  modifiers (`bg-cat-blue/10`, `border-cat-blue/30`) compose via
  Tailwind's `<alpha-value>` syntax; canonical hex names and ui-context.md
  values are unchanged. Three reusable components:
  - **PatternChip** — `rounded-md`, `font-mono`, `text-xs`. Category lookup
    via `CATEGORY_CLASSES` literal map so Tailwind's content scanner picks
    every variant up. Uncategorized chips fall back to a neutral
    border + secondary text. Hover: `bg-bg-subtle` for all variants
    (no hue shift). Always a `Link` to `/patterns/:slug`.
  - **SourceAttribution** — `variant="card" | "header"` (role-named, not
    layout-named, so 3e back-link cards reuse `variant="card"` cleanly).
    Card variant: compact uppercase eyebrow, `font-mono`, `text-muted`,
    source-name internal Link (currently routes to `/`; becomes
    "filter by this blog" in Unit 6 without changing the surface). Header
    variant: larger mixed-case row with external links (source homepage +
    optional "Read original") opening in a new tab.
  - **ArticleCard** — non-anchor card pattern per pushback. Only the
    title is a `Link` to `/articles/:slug`; source name and chips are
    independent Links inside the card; no nested anchors anywhere. Chip
    overflow: first 3 chips visible, `+N` Link to the article page with
    `aria-label="N more pattern(s)"`.

  ArticleIndex (`/`) now reads from the indexer and renders one
  ArticleCard. Build passes (CSS 41.52 kB / JS 174.56 kB; the +7 kB JS
  delta covers indexer + components + JSON content; webfonts still
  lazy-chunked). `npm test` still 34 passing.
- **Unit 3a — Routing skeleton + navbar + webfonts + sample content.**
  `react-router-dom@6` wired up via `HashRouter` (zero-config GitHub Pages
  hosting). Four routes registered: `/`, `/articles/:slug`, `/patterns`,
  `/patterns/:slug`. `Navbar` component (wordmark left, Articles +
  Patterns links right) lives in `src/components/Navbar.tsx`; active-link
  state is path-based so `Articles` highlights on `/` and `/articles/*`,
  `Patterns` highlights on `/patterns*`. Page components are placeholder
  stubs under `src/pages/` that render their route name and (for dynamic
  routes) the parsed slug — no content consumption yet. Inter and
  JetBrains Mono are self-hosted via `@fontsource/inter` (weights 400,
  500, 600, 700) and `@fontsource/jetbrains-mono` (weights 400, 500),
  imported in `src/main.tsx`. Sample content lands as data on disk: one
  Article (`content/articles/stripe-idempotency.json`), one
  PatternDefinition (`content/patterns/atomic-phases.json`, the single
  pattern the article references — bidirectional integrity intact even
  before the Unit 4 validator), and one feed entry
  (`pipeline/feeds.json`, Stripe Engineering). Build passes; bundle is
  ~167 KB JS (gzip 54 KB) + 38 KB CSS (gzip 17 KB) + lazy webfont chunks.
  `npm test` still 34 passing — types are untouched.

## In Progress

- None — Unit 3 fully complete. Awaiting design-intent paragraph for
  Unit 4 (orphan-pattern-slug validator: where it runs in the build,
  what failure looks like) before code.

## Developer Setup

- One-time before running `npm run test:e2e`: `npx playwright install
  chromium` to download the browser binary. CI uses
  `npx playwright install --with-deps`.

## Next Up

1. **Unit 4 — Build-time orphan-pattern-slug validator** (invariant 8).
   Design-intent paragraph requested before code.
2. **Unit 5 — Sandboxed-iframe artifact embed** with a deliberately
   broken sample artifact (invariant 2). Design-intent paragraph
   requested before code.
3. **Unit 6 — Filter affordances.** Source filter on the article index
   (driven by the allowlist, location resolved per the feeds.json open
   question), reading the `?source=<slug>` URL shape that
   `SourceAttribution` already emits. Optional category filter on the
   pattern library index.
4. **Unit 7 — Pipeline `discover` stage** (RSS fetch + filter + score +
   SQLite), reading sources from the allowlist.
5. **Unit 8 — Pipeline orchestrator** (`pipeline/run.ts`, `npm run study`).
   Design-intent paragraph requested before code.

## Deferred Work

- **Post-Unit 3e — Edge-case fixtures for the pattern detail page.**
  Hand-author small fixture pattern definitions covering: uncategorized
  (no `category`), empty `whenItApplies`, very long `definition`. Each
  exercises a code path the current single sample (`atomic-phases`)
  doesn't reach. Deliberate fixture construction, not ambient variety.
- **Post-Unit 5 — Backfill 4–5 existing Claude-chat artifacts** as the
  first real library entries: Skipper, Stripe idempotency, Airbnb
  monitoring, Uber load management (and the architecture writeup if it
  has artifact assets). Each needs a hand-authored `Article` JSON
  summary plus the existing `.jsx` artifact wired through the iframe
  infrastructure that Unit 5 establishes. Pre-Unit-5 backfill would
  ship placeholders, not real artifacts — that's why it waits.

## Open Questions

- **`pipeline/feeds.json` location vs. invariant 3** (forces a decision in
  Unit 6 — source filter affordance on the article index). The website
  needs to read the allowlist for the filter, but importing
  `pipeline/feeds.json` from `src/` is a website-to-pipeline data import
  not currently covered by the type-only exception. **Expected resolution
  (Option A): move `pipeline/feeds.json` → `content/feeds.json`** so the
  website reads from one place (`content/`), full stop. The pipeline reads
  the same file from `content/feeds.json`; nothing else changes. If Unit 6
  surfaces a reason to choose otherwise (allowlist needs to evolve
  asymmetrically from website-visible source metadata), revisit then.
  Documenting the expected direction now prevents re-opening the
  architecture question fresh in six units.
- **Source-equality constraint with `feeds.json`** (for Unit 6 / pipeline
  analyze stage). The `source` block embedded in each
  `content/articles/{slug}.json` must equal the `source` block in the
  corresponding `feeds.json` entry exactly — the pipeline copies it
  verbatim, never re-derives. This is how invariant 7 (official engineering
  blogs only) holds at the data level: if the source isn't in the
  allowlist, it can't appear on an article. Will be enforced by the
  analyze stage (Unit 7+) and ideally verified by the same build-time
  validator that catches orphan pattern slugs (Unit 4).
- Pipeline scheduling: the orchestrator (`npm run study`) is the daily
  command and is built regardless. Only the *scheduler* that auto-invokes it
  is open — GitHub Actions cron (runs in the cloud, commits results) vs local
  launchd/cron (runs on the laptop). Decide when reaching the CI stage; the
  orchestrator is designed so this choice is just "what calls the command."

## Architecture Decisions

- **Static site, no DB/auth on the website.** The site renders only
  pre-generated files; all dynamic work is in the build-time pipeline.
  Rationale: a personal/public learning library has no per-user state needs;
  static is cheaper, simpler, and faster, and deploys free.
- **Two decoupled sub-systems: pipeline and website**, communicating only
  through generated files (the content contract). Rationale: clean separation
  of build-time vs render-time concerns; mirrors the "colocate logic with
  state / clear boundaries" lessons from the studied blogs.
- **Artifacts rendered in sandboxed iframes**, one self-contained bundle
  each. Rationale: auto-generated artifacts will occasionally be malformed;
  iframes isolate failures so one bad artifact can't break the build or other
  artifacts. This is the fault-isolation pattern from the Airbnb monitoring
  study, applied to our own system.
- **Light editorial reading shell + dark technical artifacts.** Rationale:
  long-form reading is most comfortable on a light, high-whitespace surface
  (Stripe docs / Linear style); the dark interactive artifacts gain hierarchy
  and a "lab" feel by contrast.
- **Official engineering blogs only (allowlist-enforced).** Rationale:
  signal quality is the whole point of the library. First-party engineering
  writeups from the team that actually built the system are dense, accurate,
  and full of real tradeoffs. Personal blogs, third-party summaries, and
  aggregators dilute that signal — they often paraphrase official posts with
  less depth, vary wildly in quality, and create dedup noise. The allowlist
  in `pipeline/feeds.json` is the single source of truth for what counts.
- **Dual-axis navigation: articles and patterns are equally first-class.**
  The home page is the article feed (the daily reading surface), and the
  pattern library at `/patterns` is the durable-knowledge surface, with a
  prominent pattern detail page per pattern. Articles reference patterns by
  canonical slug; patterns list their articles. Bidirectional integrity is
  enforced at build time (invariant 8). Rationale: the stated mission is to
  build durable, transferable system design intuition — patterns are the
  takeaway, articles are the evidence. But the daily-reading ritual is real,
  so the article feed remains the primary entry point. Pure pattern-first
  navigation would bury fresh articles; pure article-first would relegate
  the pattern library to a footnote. Both axes get their own surface.
- **Pattern definitions are authored, not auto-generated.** The pipeline
  may *propose* new pattern slugs when it sees something recurring, but
  pattern definition files in `content/patterns/{slug}.json` are hand-written
  or hand-reviewed. Rationale: the synthesis across articles is where the
  learning compounds; auto-derived definitions from a single article tend
  to be too narrow and miss the cross-article generality that makes a
  pattern useful.
- **Pipeline metadata in SQLite; published content as committed JSON/JSX.**
  Rationale: control-flow/dedup state belongs in a queryable store; durable
  published content belongs in version control for auditability.
- **Prompts treated as versioned code** under `pipeline/prompts/`. Rationale:
  artifact/summary quality depends on prompt quality; it must be reviewable
  and improvable over time.
- **Hash-based routing** (`react-router-dom` with `HashRouter`). Rationale:
  GitHub Pages does not natively serve SPA routes under browser history —
  visiting `/articles/foo` directly returns 404 unless we add a `404.html`
  redirect shim, which is fragile. Hash routes (`#/articles/foo`) are served
  identically on local dev and Pages with zero config. The aesthetic cost
  (visible `#`) is minor and acceptable for a learning site. Locks in
  consistent behavior across environments.
- **esbuild for compiling artifact bundles.** Each `.jsx` artifact is
  compiled to a self-contained ESM bundle and wrapped in a minimal HTML
  shell, one bundle per article under `public/artifacts/{slug}/`. Rationale:
  esbuild is fast, handles JSX/TSX out of the box, has near-zero config, and
  produces standalone bundles suitable for iframe embedding. Alternatives
  (Vite library mode, Rollup) are heavier without providing additional value
  for this use case. The bundler is invoked from the pipeline's `generate`
  stage; the website does not import esbuild.
- **Article `artifact` pointer as discriminated null** (`{ path: string } | null`
  rather than `{ path, hasArtifact: boolean }`). Rationale: missing-artifact
  is a data state, not a filesystem inference — encoding it as `null`
  rather than a 404 keeps the iframe loader's "skip + flag on bad entry"
  path deterministic (invariant 6) and leaves room for summary-only
  articles without a special case. The discriminated form makes the
  invalid state `{ path: "/x", hasArtifact: false }` unrepresentable,
  which the boolean-plus-path shape cannot prevent.
- **Canonical pattern categories — four locked in, additive via
  two-step docs-then-code change.** `resilience` (blue), `consistency`
  (purple), `throughput` (green), `observability` (cyan). The remaining
  `--cat-*` ramp tokens (`orange`, `red`, `amber`) are reserved
  headroom; assigning one to a new category is a `docs:` commit
  updating architecture.md's Canonical pattern categories table first,
  then a `feat:` commit wiring the slug into `PatternChip.CATEGORY_CLASSES`.
  Rationale: prevents pattern definitions from being authored against a
  category slug the website doesn't know how to color, and keeps the
  ramp from sprawling into a deep taxonomy. Uncategorized patterns (no
  `category` field) stay valid via the neutral-chip path.
- **Prose-field rendering contract — paragraph-separated plain text,
  markdown deferred to Unit 7+.** `Article.problem`, `Article.solution`,
  and `PatternDefinition.definition` are typed as plain strings split
  on blank lines into `<p>` chunks (the `Prose` component). When the
  first real Claude output lands (Unit 7+, analyze stage), `Prose`
  swaps for a real markdown renderer (likely `react-markdown`) with no
  consumer changes — Article/Pattern detail pages keep importing
  `Prose` and the URL shape, prop surface, and rendering contract stay
  identical. Rationale: ship a working contract today rather than
  picking a renderer speculatively; the renderer swap is a one-component
  change.
- **Source filter URL shape — query string, `/?source=<slug>`.**
  `SourceAttribution variant="card"` already emits this URL; the query
  string is currently inert and becomes effective when Unit 6 wires the
  filter on the article index. Rationale: keeps `/` as the canonical
  route, composes naturally with future category/tag filters via
  additional query params, easy to share, no UX cost over a dedicated
  `/sources/<slug>` route.
- **Hand-written type-guard predicates over Zod (for now).** Schema
  validation tests use lightweight inline predicates in
  `src/types/__tests__/validators.ts` rather than a runtime validation
  library. Rationale: at this stage the only consumer of validation is the
  test suite (verifying sample JSON conforms); shipping a runtime validator
  would be premature. Zod (or similar) will be introduced when the pipeline
  needs to validate Claude's JSON output before writing to `content/` per
  code-standards.md.

## Session Notes

- Domain `behindscale.com` has been acquired by the owner; target deploy is
  GitHub Pages with a CNAME to the custom domain.
- The owner is studying system design by dissecting engineering blogs; this
  project automates and publishes that workflow. The studied patterns so far
  (workflow durability, idempotency/atomic phases, fault isolation /
  dead-man's-switch, priority-aware load shedding / PID control) are good
  candidates to seed the initial pattern library.
- Owner uses Claude Code locally; this repo is intended to be built with it
  following the spec-driven workflow in ai-workflow-rules.md.
