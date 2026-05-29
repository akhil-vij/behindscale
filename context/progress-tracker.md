# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Phase 2: content contract (shared schema types) complete. Article shape
  enumerated in architecture.md Content Contract and codified in
  `src/types/article.ts`. Moving toward hand-placed sample content and the
  website shell next.

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

## In Progress

- None — Unit 2 complete; awaiting owner sign-off before starting Unit 3
  (sample content + the first article/pattern files).

## Next Up

1. Place hand-written sample content in `content/articles/` and
   `content/patterns/` (one article + the patterns it references) so the
   site has something to render end-to-end. Also: add `@fontsource/inter`
   and `@fontsource/jetbrains-mono` (self-hosted webfonts per invariant 1).
2. Build the website shell covering both navigation axes:
   - Home / article index with article cards (source eyebrow + pattern chips).
   - Article page (`/articles/:slug`) with source attribution, pattern chips,
     and a "Patterns in this article" section.
   - Pattern library index (`/patterns`) — grid of pattern cards.
   - Pattern detail page (`/patterns/:slug`) — definition, when-it-applies,
     tradeoffs, and "Seen in" back-link cards with source attribution.
   Includes the Playwright smoke test that loads home -> article -> pattern
   and asserts no crash.
3. Add the build-time validation step that fails the build on orphan pattern
   slugs (article references a pattern with no definition). This enforces
   invariant 8 concretely. Design-intent paragraph requested before code.
4. Implement the sandboxed-iframe artifact embed; include one deliberately
   broken sample artifact to verify fault isolation (invariant 2).
   Design-intent paragraph requested before code.
5. Add filter affordances: source filter on the article index
   (driven by `pipeline/feeds.json`) and optional category filter on the
   pattern library index.
6. Begin the pipeline: `discover` stage (RSS fetch + filter + score + SQLite),
   reading sources from the allowlist.
7. Pipeline orchestrator (`pipeline/run.ts`, `npm run study`).
   Design-intent paragraph requested before code.

## Open Questions

- Should existing artifacts already produced in Claude chat (Skipper, Stripe
  idempotency, Airbnb monitoring, Uber load management, this architecture
  doc) be backfilled as the first library entries? (Recommended: yes — they
  seed the pattern library immediately and give the dual-axis navigation
  real content from day one.)
- Initial pattern seed list: which canonical patterns to author definitions
  for before launch. Candidates from work to date: durable workflow / replay,
  atomic phases & recovery points, fault isolation, dead man's switch,
  priority-aware load shedding, dynamic-vs-static thresholds, bidirectional
  idempotency. Decide before building the pattern detail page so there's
  authored content to render.
- Pattern categories: whether to use a flat set of category tags
  (e.g. resilience, consistency, throughput, observability) and what the
  initial category list is. Optional but useful for the pattern library
  index filter. Keep flat — no deep taxonomy.
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
