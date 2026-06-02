# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Phase 5 closed.** All four chat-conversation artifact backfills
  shipped and verified on prod. Library state: 4 articles
  (Stripe / Skipper / Airbnb monitoring / Uber Cinnamon), 11
  patterns spanning all four canonical categories (resilience,
  consistency, throughput, observability), 4 working artifacts.
  The library is now meaningfully content-rich, not infrastructure
  with one reference article. Next phase: Unit 7 — pipeline. Owner
  has requested an upfront architecture review covering the four
  stages (discover, fetch, analyze, generate), the orchestrator,
  and the SQLite metadata schema before any code is written.

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
- **Unit 5e — Uber Intelligent Load Management artifact (closes
  Phase 5).** Last of the four chat-conversation artifact backfills.
  Added `content/articles/uber-intelligent-load-management.json`
  plus three new pattern definitions:
  `priority-aware-load-shedding` (resilience),
  `pid-controlled-adaptive-thresholds` (throughput), and
  `byos-platform-design` (throughput). Article references all
  three; coverage 3 >= 2.
  - `content/artifacts/uber-intelligent-load-management.jsx` is the
    largest artifact yet — 640 lines source, 168 kB compiled.
    Four tabs (Evolution -> CoDel -> Priority Tiers -> BYOS/PID)
    with an orange accent against the dark token palette. The PID
    tab runs a real control loop in `useEffect` with `useRef`-
    tracked state, plotting the PID-adjusted concurrency limit
    against a static-threshold comparison line so the qualitative
    difference (smooth convergence vs binary oscillation) is
    visible in motion. Self-contained: only useState / useEffect /
    useRef from react.
  - Library state after 5e: **4 articles, 11 pattern definitions
    (atomic-phases, idempotency-keys, durable-workflows,
    embedded-vs-centralized-orchestration, hibernation-vs-polling,
    fault-isolation, dead-mans-switch, circular-dependency-
    avoidance, priority-aware-load-shedding,
    pid-controlled-adaptive-thresholds, byos-platform-design),
    4 working artifacts.** All four canonical pattern categories
    have realized examples. Uber Engineering joins the realized
    sources, so the filter chip row on `/` is now All + Airbnb +
    Stripe + Uber.
  - Bundle: CSS 43.55 kB / JS 237.08 kB (+20 kB JS over 5d for the
    bundled new content JSONs).
  - The smoke test still pins to Stripe + Skipper visibility; the
    Stripe-source filter check holds because Skipper, Airbnb, and
    Uber articles all get filtered out under
    `?source=stripe-engineering`. Smoke does not exercise the PID
    simulator's internal animation — the iframe sandbox prevents
    cross-origin DOM traversal, so the simulator's correctness is
    confirmed by manual visual check on prod, not by the smoke.
  - Verification: `npm run validate` clean (3 checks, 0 errors);
    `npm run compile-artifacts` ok for all 4 artifacts; `npm run
    build` end-to-end clean; `npm test` 49/49; local
    `npm run test:e2e` 1/1 in 3.6 s; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com
    green after the Vercel auto-deploy of `b090672` landed** —
    1/1, 3.7 s test, 7.3 s end-to-end. The Unit 6 UA override
    continues to carry prod smoke through clean.
- **Unit 5d — Airbnb Monitoring Reliably at Scale artifact (second
  Airbnb article).** Added `content/articles/airbnb-monitoring-
  reliably-at-scale.json` plus three new pattern definitions:
  `fault-isolation` (resilience), `dead-mans-switch` (observability),
  and `circular-dependency-avoidance` (resilience). Article
  references all three with per-article notes; coverage 3 >= 2.
  `content/artifacts/airbnb-monitoring-reliably-at-scale.jsx` is a
  four-tab walkthrough (Problem -> Compute -> Network -> Dead Man's
  Switch) with a cyan accent against the dark token palette,
  self-contained (only `useState`). Each tab walks an options-then-
  decision shape (shared / own / dedicated-managed; Istio /
  separate Envoy / DIY; binary signal vs absence detection).
  - Library state after 5d: 3 articles, 8 pattern definitions, 3
    working artifacts. The Airbnb Engineering source now has 2
    articles (Skipper + this one), so the source filter on `/` has
    its first multi-result case beyond the single-Stripe-article
    check.
  - Bundle: CSS 43.55 kB / JS 217.37 kB (+17 kB JS over Unit 6 for
    the bundled new content JSONs).
  - The smoke test still pins to Stripe + Skipper visibility; the
    Stripe-source filter check holds with the Airbnb article in the
    list because the Airbnb article is also filtered out under
    `?source=stripe-engineering`. Expanding the smoke to assert
    Airbnb-source filter behavior belongs with a future
    "smoke-as-fixture-grid" change, not 5d.
  - Side note: fault-isolation is likely a high-frequency pattern
    across future articles (the underlying principle recurs at
    every layer: process, tenant, failure-domain, traffic,
    capability). The patternStats aggregator already handles
    arbitrary frequency -- no code change. Worth noticing as the
    first pattern the library expects to see broadly.
  - Verification: `npm run validate` clean (3 checks, 0 errors);
    `npm run compile-artifacts` ok for all 3 artifacts; `npm run
    build` end-to-end clean; `npm test` 49/49; local `npm run
    test:e2e` 1/1 in 4.5 s; **production smoke `npm run
    test:e2e:prod` against https://www.behindscale.com green after
    the Vercel auto-deploy of `c4b6530` landed** -- 1/1, 4.0 s
    test, 9.4 s end-to-end. The Unit 6 UA override carried 5d
    through without re-triggering Vercel's bot detection.
- **Unit 6 — Source filter on the article index + feeds.json
  migration + artifact-path validator check.** Three loosely
  related deliverables in one unit: resolves the longstanding
  `pipeline/feeds.json` location open question (now
  `content/feeds.json`), adds the first navigation surface beyond
  chip/article cross-linking (a single-source filter on `/`), and
  promotes the slug-equals-path artifact convention into
  enforcement.
  - `content/feeds.json` (renamed from `pipeline/feeds.json`) is
    now the single source of truth for the source allowlist.
    Architecture / ui-context / progress-tracker path references
    updated to match. The new `feeds` export from
    `src/content/index.ts` loads it via `import.meta.glob` of a
    single literal path — same loading mechanism as articles and
    patterns, no separate `resolveJsonModule` configuration, no
    cross-include path concerns from `import` of a file outside
    `src/`.
  - Source filter UI: inline chips above the article grid (not a
    sidebar — the index is the only filterable surface on the
    site; a layout split would break the single-column reading
    rhythm everywhere else). Chips derive from
    `articles[*].source` (realized-content principle: navigation
    surfaces filter by realized content, informational surfaces
    describe intended scope — Architecture Decisions), sorted
    alphabetically by display name (deterministic; prevents
    visual jitter from count-based ordering). Explicit "All" chip
    first, then one chip per realized source. Active chip filled
    (accent-primary background, white text); inactive chips
    border-only. `SourceFilterChip` is a distinct component from
    `PatternChip`: same shape vocabulary, but switched on
    intensity rather than hue — pattern chips tag, filter chips
    toggle.
  - Empty state: "No articles from <Source Name> yet." plus an
    inline "Show all articles" Link. Mirrors pattern-detail "No
    articles embody this pattern yet" wording. Out-of-allowlist
    filter (e.g. `?source=garbage`): same line with the raw slug,
    no broken-chip rendering for the unknown source — invariant 6
    (skip + flag, never crash).
  - New `scripts/checks/artifact-path-matches-slug.ts`. For every
    article with `artifact !== null`, asserts
    `artifact.path === '/artifacts/' + slug + '/index.html'`.
    Validator footer now reads "3 checks". Five vitest cases under
    `__tests__/` cover happy path, drift, null-artifact silent
    pass, multi-drift in one pass, and right-folder-wrong-filename.
  - Smoke test extension: click "Stripe Engineering" chip, assert
    URL contains `?source=stripe-engineering`, assert Stripe card
    visible AND Skipper card `toHaveCount(0)` (the load-bearing
    absent-assertion — `not.toBeVisible()` passes silently if the
    chip renders but filter logic doesn't apply). Click "All",
    assert URL back to `/`, assert both cards visible. Then
    continue the original walk.
  - Prod-smoke fix: Playwright's default user-agent
    (`HeadlessChrome`) re-triggers Vercel's bot-detection security
    checkpoint, which serves a JS challenge page that doesn't
    contain the navbar/articles the smoke asserts on. Added a
    `userAgent` override in `playwright.prod.config.ts` (normal
    Desktop Chrome UA) so prod runs see the real app. Local config
    is untouched.
  - Bundle: CSS 43.55 kB / JS 200.28 kB (+2 kB JS over 5c for
    `SourceFilterChip` + feeds export + filter logic). `npm test`
    49/49 (44 prior + 5 new artifact-path cases). Local
    `npm run test:e2e` 1/1; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com
    green after the Vercel auto-deploy of `268ecac` landed** —
    1/1, 6.5 s test, 15.7 s end-to-end. The smoke now exercises
    the filter end-to-end on the live site.
- **Unit 5c — Skipper workflow engine artifact (first new article).**
  Added Airbnb Engineering's "Skipper: Building Airbnb's Embedded
  Workflow Engine" (2024-08-15) at
  `content/articles/skipper-workflow-engine.json` plus three new
  pattern definitions: `durable-workflows` (resilience),
  `embedded-vs-centralized-orchestration` (resilience), and
  `hibernation-vs-polling` (throughput). Article references all
  three with per-article notes; pattern coverage 3 ≥ 2.
  `content/artifacts/skipper-workflow-engine.jsx` is a four-tab
  walkthrough (Problem → Embedded vs Central → Replay & Checkpoints
  → Hibernation) with a green accent against the dark token palette,
  self-contained (only `useState`), inline styles in token-compatible
  hex. Compile output: 152 kB bundle at
  `public/artifacts/skipper-workflow-engine/{index.html, index.js}`.
  - Library state after 5c: 2 articles, 5 pattern definitions
    (atomic-phases, idempotency-keys, durable-workflows,
    embedded-vs-centralized-orchestration, hibernation-vs-polling),
    2 working artifacts.
  - Bundle: CSS 43.00 kB / JS 198.15 kB (+15 kB JS over 5b for the
    bundled new content JSONs).
  - The smoke test still pins to the Stripe article path; expanding
    it to walk Skipper belongs with a future "second-article-as-
    fixture" change, not in 5c.
  - First architecture decision recorded ahead of this commit:
    artifact accent colors are not bound to the category color ramp.
    Chips strictly follow the ramp (wayfinding); artifacts pick what
    suits the visualization (Skipper's green ≠ throughput category
    semantics). Prevents future artifacts from re-litigating this.
  - Verification: `npm run validate` clean (2 checks, 0 errors); `npm
    run compile-artifacts` ok for both artifacts; `npm run build`
    end-to-end clean; `npm test` 44/44; local `npm run test:e2e` 1/1
    in 3.7 s; **production smoke `npm run test:e2e:prod` against
    https://www.behindscale.com green after the Vercel auto-deploy
    of `8f0cead` landed** — 1/1, 4.8 s test, 9.0 s end-to-end.
    Skipper artifact bundle confirmed live via HEAD probe
    (`/artifacts/skipper-workflow-engine/index.html` returns 200).
    Manual visual confirmation by the owner pending separately:
    `/articles/skipper-workflow-engine` reading column + bottom
    artifact, `/patterns` showing 5 cards (was 2), and
    `/patterns/durable-workflows` showing the new article as a
    "Seen in" back-link.
- **Unit 5b — Stripe idempotency artifact (first real backfill).**
  Authored `content/artifacts/stripe-idempotency.jsx` from the existing
  chat-conversation artifact: an interactive walkthrough of Stripe's
  atomic-phases + recovery-points retry model, with a "Simulate
  Crashes" mode that walks through three crash scenarios and how the
  retry algorithm recovers from each. Updated
  `content/articles/stripe-idempotency.json`'s `artifact` field from
  `null` to `{ "path": "/artifacts/stripe-idempotency/index.html" }`.
  The compile-artifacts script produces a 155 kB bundle (React +
  ReactDOM + artifact code, minified) at `public/artifacts/
  stripe-idempotency/index.html` + `index.js`.
  - Smoke test extended with iframe-presence + attribute assertions on
    the article page: locator finds an `iframe[title*="Interactive
    visualization"]`, `src` equals the locked bundle path, `sandbox`
    equals `allow-scripts`. **Deliberately does not assert
    iframe-internal DOM.** The sandbox makes the iframe a unique
    opaque origin, and Playwright's cross-origin frameLocator
    traversal is unreliable through that boundary. Tightening the
    sandbox attribute is the more load-bearing property; iframe
    content correctness is verified by (a) bundle existence on disk
    (compile-artifacts succeeded), (b) the parent-side HEAD probe
    staying satisfied (otherwise the ErrorFrame would replace the
    iframe and the attribute assertions would fail), and (c) manual
    visual confirmation on prod.
  - Side effect: Mode B fault isolation (in-iframe render exception)
    gets natural exercise on every subsequent artifact landing — any
    bug in a real artifact surfaces as the muted error frame instead
    of breaking the page.
  - Build passes; `npm test` 44/44 (unit tests untouched); local
    smoke `npm run test:e2e` 1/1; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com green
    after the Vercel auto-deploy of `2e633e3` landed** — 1/1, 11.2 s
    test, 21.9 s end-to-end. The Stripe atomic-phases artifact is
    live and the iframe-presence + sandbox-attribute assertions hold
    on prod. Manual visual confirmation of iframe-internal rendering
    by the owner pending separately (the test deliberately can't
    reach cross-origin iframe content).
- **Unit 5 — Sandboxed-iframe artifact embed (infrastructure).**
  Build-time + render-time fault-isolated artifact pipeline per
  architecture.md invariant 2.
  - `scripts/compile-artifacts.ts` — walks `content/artifacts/*.jsx`,
    wraps each in a per-artifact entry that mounts the default export
    inside a top-level React error boundary, runs esbuild (`format:
    esm`, `jsx: automatic`, minified), writes
    `public/artifacts/{slug}/index.js` plus an inlined HTML shell at
    `index.html`. Per-artifact compile failures stderr-log + skip +
    clean up partial output + continue (the build never fails on an
    artifact). Wipes the output dir on each run for local-dev hygiene.
    Each bundle ships its own React copy — the architecture decision
    on self-containment, not optimization.
  - `src/components/ArtifactEmbed.tsx` — renders the artifact in a
    sandboxed iframe (`sandbox="allow-scripts"`, no other flags). Two
    failure modes converge to one visible surface (a muted single-line
    error frame): a HEAD probe on the bundle URL catches load failures
    (some browsers fire `iframe.onload` even on 404); the iframe's
    own ErrorBoundary catches render exceptions inside. Includes the
    "Open in full ↗" affordance per ui-context.md.
  - Article page layout updated: reading column stays at 720 px; the
    artifact slot is a 960 px breakout *below* "Patterns in this
    article," not embedded mid-narrative. The artifact is the
    exploration destination after the read, not a textbook insertion.
    Renders only when `article.artifact !== null` — summary-only
    articles read top-to-bottom with no embed and no placeholder.
  - Build chain: `"build": "npm run validate && npm run
    compile-artifacts && tsc -b && vite build"`. esbuild added as a
    direct devDep.
  - Failure-mode probe (Mode A: compile failure): wrote a syntactically
    broken `content/artifacts/broken-probe.jsx`, ran
    `npm run compile-artifacts`, observed `skip broken-probe: Build
    failed with 1 error:` + `1 artifact skipped; build proceeds
    (invariant 2)` + exit 0 + empty `public/artifacts/` (cleanup-
    on-failure verified). Probe restored before commit. Mode B
    (runtime exception inside a compiled artifact) deferred to natural
    exercise during 5b authoring — the in-iframe ErrorBoundary catches
    any render throw and surfaces the same muted error frame.
  - Verification: `npm run build` clean end-to-end
    (CSS 43.00 kB / JS 183.02 kB — +0.7 / +1.5 kB over Unit 4 for
    ArtifactEmbed styles and component code); `npm test` 44/44;
    `npm run test:e2e` 1/1; on this commit the stripe article still
    has `artifact: null` so the embed itself renders nothing on prod —
    happy-path verification lands with Unit 5b.
- **Unit 4 — Content validator framework + orphan-pattern-slugs +
  minimum-pattern-coverage.** Multi-check framework that runs at build
  time, lives in `scripts/`, and reports all failures in one pass.
  - `scripts/validate-content.ts` — the runner. Explicit imports +
    registration array (`CHECKS`); no auto-discovery. Adding a check
    is "write a file under `scripts/checks/`, append one line to
    `CHECKS`". Exit 0 on pass, 1 on any failure.
  - `scripts/load-content.ts` — schema-validating loader. Walks
    `content/articles/` and `content/patterns/`, parses JSON, validates
    against the predicates from `src/types/predicates.ts`. Files that
    fail schema get skipped from the ContentSet and reported under the
    `[schema]` section (loader's section label, owned by
    `SCHEMA_SECTION_NAME` for grep-ability). Includes
    `isPatternDefinitionFile(name)` — explicit `index.json` exclusion
    mirroring `src/content/index.ts`'s glob negation; both must stay
    in sync.
  - `scripts/render-output.ts` — pure formatter. Format: `[section]`
    headers + section error counts, file path indented 2 sp, message
    4 sp, fix alternatives as `→`-prefixed lines (Rust/Elm compiler
    style; Unicode arrow renders fine on Vercel + modern terminals).
    Footer is `ok` or `failed (N files skipped)`.
  - `scripts/checks/orphan-pattern-slugs.ts` — every `patterns[].slug`
    on an article must have a matching definition. Reports articleSlug
    + the offending pattern slug + two-fix-alternatives output.
  - `scripts/checks/minimum-pattern-coverage.ts` — every article must
    reference ≥ 2 patterns (invariant 8). `MIN_PATTERN_COUNT = 2`
    constant with comment pointing at architecture.md.
  - `scripts/types.ts` — shared `Check`, `ContentSet`, `CheckError`.
    Checks deal in slugs (`articleSlug`/`patternSlug`); the runner
    resolves slug → path when rendering. `file?` field is the
    escape hatch for cross-cutting checks.
  - Tests at `scripts/checks/__tests__/` — 10 new vitest cases (5 per
    check) using an in-memory fixture builder (`fixtures.ts`); no
    filesystem state. Total: 44 passing (34 schema + 10 check).
  - Predicates relocated from `src/types/__tests__/validators.ts` to
    `src/types/predicates.ts` (non-barrel-exported sibling of the type
    files). Now used by both vitest schema tests and the validator
    loader. New `Result = { ok: true } | { ok: false; reason }` shape
    carries field-level reasons for the loader's `[schema]` section.
    Boolean `isXxx` wrappers kept so existing tests continue to read
    naturally.
  - Build chain updated: `"build": "npm run validate && tsc -b && vite
    build"`. Vercel inherits this — a failed validator fails the
    deploy. `tsx` (v4) added as a devDep to run the validator's
    TypeScript directly.
  - Content updated to pass on first run: authored
    `content/patterns/idempotency-keys.json` (category: `consistency`
    — same input → same outcome across retries) and added it as the
    second pattern reference on `content/articles/stripe-idempotency.json`.
    Side effect: `/` now exercises the two-chip code path on
    ArticleCard, `/patterns` shows two cards, `/articles/stripe-idempotency`
    shows two chips and two entries in "Patterns in this article".
  - Verification: `npm run validate` clean (`2 checks, 0 errors. ok.`);
    `npm test` 44/44; `npm run build` end-to-end clean
    (CSS 42.28 kB / JS 181.53 kB — +2 kB JS for the bundled second
    pattern JSON); `npm run test:e2e` 1/1 green locally.
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
  `react-router-dom@6` wired up via `HashRouter` (zero-config across static
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
  (`content/feeds.json`, Stripe Engineering — moved from
  `pipeline/feeds.json` in Unit 6). Build passes; bundle is
  ~167 KB JS (gzip 54 KB) + 38 KB CSS (gzip 17 KB) + lazy webfont chunks.
  `npm test` still 34 passing — types are untouched.

## In Progress

- None — Phase 5 closed. Unit 5e verified on prod (1/1 smoke
  against https://www.behindscale.com, 2026-06-02). **Next: Unit 7
  — pipeline.** Owner has asked for an upfront architecture review
  covering the four stages (discover, fetch, analyze, generate),
  the orchestrator, and the SQLite metadata schema before any code
  is written. Sub-units will then be implemented without
  per-sub-unit design intent review — architecture decisions live
  in the upfront review, not in each stage.

## Developer Setup

- One-time before running `npm run test:e2e`: `npx playwright install
  chromium` to download the browser binary. CI uses
  `npx playwright install --with-deps`.

## Next Up

1. **Unit 7 — Pipeline architecture review + four stages.**
   Upfront architecture review covering the four stages (discover,
   fetch, analyze, generate), the orchestrator (`pipeline/run.ts`,
   `npm run study`), and the SQLite metadata schema. Owner reviews
   the architecture before code lands; sub-units (one per stage,
   one for the orchestrator) ship without per-sub-unit design
   intent. The Proposed Pattern Queue mechanism
   (architecture.md) is part of the analyze stage.
6. **Unit 7 — Pipeline `discover` stage** (RSS fetch + filter + score +
   SQLite), reading sources from the allowlist. Also: implement the
   Proposed Pattern Queue mechanism (architecture.md) — strip-and-log
   proposed-but-undefined pattern slugs, three publish states.
7. **Unit 8 — Pipeline orchestrator** (`pipeline/run.ts`, `npm run study`).
   Design-intent paragraph requested before code.

## Deferred Work

- **Post-Unit 3e — Edge-case fixtures for the pattern detail page.**
  Hand-author small fixture pattern definitions covering: uncategorized
  (no `category`), empty `whenItApplies`, very long `definition`. Each
  exercises a code path the current single sample (`atomic-phases`)
  doesn't reach. Deliberate fixture construction, not ambient variety.
- **Optional category filter on the pattern library index.** Out of
  scope for Unit 6 (single-source filter is the focused deliverable).
  Same shape would apply at `/patterns?category=resilience` if it
  proves useful at higher pattern counts.

## Open Questions

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
  in `content/feeds.json` is the single source of truth for what counts.
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
- **Artifact accent colors are not bound to the category color ramp.**
  `PatternChip` strictly follows the category ramp from architecture.md
  — wayfinding benefits from consistency, so the same category always
  reads the same color across every chip on every page. Artifacts pick
  whatever accent best suits their specific visualization: 5b's Stripe
  artifact uses indigo (not a category color); 5c's Skipper artifact
  uses green (which *is* the throughput category color, but Skipper is
  mostly resilience/throughput, not throughput's pure case). Rationale:
  chips are navigation surfaces where consistency aids recognition;
  artifacts are destinations where variety aids differentiation between
  the small number of artifacts a reader sees in one session. The
  decoupling lets artifact authors pick colors that read well against
  the dark token palette without being constrained by category
  semantics that don't cleanly apply to the artifact-as-a-visualization.
  Prevents future artifacts from re-litigating this — accent choice is
  artifact-local and free.
- **`feeds.json` lives at `content/feeds.json`** (Unit 6, Option A).
  The website needs to read the allowlist for the source filter, and
  importing from `pipeline/` would breach invariant 3 (the only
  permitted cross-boundary surface is type-only imports from
  `src/types/`). Moving the file to `content/` resolves the boundary
  cleanly: the website reads from one place (`content/`), the
  pipeline reads the same file from `content/feeds.json`, nothing
  else changes. Forecasted in the open questions block since Unit 3b
  and locked here. Pipeline references in architecture.md update
  in the same Unit 6 feat commit.
- **Filter UI chip derivation principle — navigation surfaces filter
  by realized content; informational surfaces describe intended
  scope.** Source filter chips on the article index derive from
  `articles[*].source` (only sources with at least one article),
  *not* from the full `content/feeds.json` allowlist. A chip for a
  source the library doesn't yet cover reads as broken at small
  library sizes. When the gap matters — likely with a future
  "Sources we track" page — that page reads `content/feeds.json` as
  its truth. Same principle applies to any future filter
  (categories, tags, companies): the navigation chip shows what's
  reachable; the informational page describes what's tracked.
- **Filter chip ordering — alphabetical by display name,
  deterministic.** Don't order by article count or iteration order.
  Count-based ordering creates visual jitter when a new article
  from a less-represented source reorders chips; iteration order
  isn't deterministic across reloads. Alphabetical is the safer
  default. Change deliberately later if a different order emerges
  as obviously better at higher article counts.
- **Validator check parity: artifact-path-matches-slug as
  enforcement (Unit 6).** Every article with `artifact !== null`
  must have `artifact.path === '/artifacts/' + slug + '/index.html'`.
  Convention since Units 5/5b/5c; enforced from Unit 6 onward as a
  build-time check in `scripts/checks/`. The Unit 4 framework
  makes this one file + one entry in `CHECKS`. Closes the
  convention-vs-enforcement gap before the fourth artifact backfill
  can silently break it.
- **Source filter URL shape — query string, `/?source=<slug>`.**
  `SourceAttribution variant="card"` already emits this URL; the query
  string is currently inert and becomes effective when Unit 6 wires the
  filter on the article index. Rationale: keeps `/` as the canonical
  route, composes naturally with future category/tag filters via
  additional query params, easy to share, no UX cost over a dedicated
  `/sources/<slug>` route.
- **Hand-written type-guard predicates over Zod (for now).** Schema
  validation predicates live in `src/types/predicates.ts` — a
  non-barrel-exported sibling of the type files. They're consumed by
  both vitest schema tests (via the boolean `isXxx` wrappers) and the
  build-time content validator (via the field-level `checkXxx`
  functions that return `Result` objects). The barrel
  (`src/types/index.ts`) stays type-only, so the website's main bundle
  is unaffected. Rationale for hand-written: at this stage the
  validation surface is small (one consumer per side); shipping a
  runtime validation library would be premature. Zod (or similar) will
  be introduced when the pipeline's analyze stage needs to validate
  Claude's JSON output before writing to `content/`.
- **Invariant 8 expansion — minimum-2-pattern coverage** (architecture.md).
  Every article must reference at least 2 patterns; below-threshold
  articles fail the build. Rationale: behindscale's mission is
  transferable-patterns synthesis across companies, and the library's
  value compounds through cross-article overlap. Single-pattern articles
  are case studies, not library entries. The validator (Unit 4) is the
  enforcement layer; the analyze stage's Proposed Pattern Queue
  (Unit 7+) is the upstream mechanism that produces well-grounded
  articles.
- **Proposed Pattern Queue — analyze stage's strip-and-log mechanism**
  (architecture.md, new section). The analyze stage splits each
  candidate `patterns[]` entry into grounded references (slug has a
  definition → stays on the article) and proposed references (slug has
  no definition → stripped + logged to
  `pipeline/proposed-patterns.json`). Three publish states — Published,
  Blocked, Rejected — cover the case where stripping drops an article
  below the invariant-8 minimum. Blocked articles land in
  `pipeline/blocked-articles.json` and don't enter `content/`. The
  validator (Unit 4) only ever sees articles with fully grounded
  references; new pattern definitions enter the library through a
  deliberate authoring gate. **Deliverable in Unit 7+** (analyze
  stage); the architecture lands now so Unit 7 doesn't redebate.
  Principle: validator enforces shape integrity; analyze stage makes
  authoring decisions.

## Session Notes

- Domain `behindscale.com` has been acquired by the owner; deployed to
  Vercel with the domain configured as a custom alias (DNS managed at the
  registrar). **Production URL: https://www.behindscale.com** (apex
  `behindscale.com` 301-redirects to www). Deploy went live 2026-05-29
  (Unit 3f). Production smoke (`npm run test:e2e:prod`) green at the
  time of recording: 1/1 in 6.6 s end-to-end (full four-route walk
  against the live URL, no local build).
- The owner is studying system design by dissecting engineering blogs; this
  project automates and publishes that workflow. The studied patterns so far
  (workflow durability, idempotency/atomic phases, fault isolation /
  dead-man's-switch, priority-aware load shedding / PID control) are good
  candidates to seed the initial pattern library.
- Owner uses Claude Code locally; this repo is intended to be built with it
  following the spec-driven workflow in ai-workflow-rules.md.
