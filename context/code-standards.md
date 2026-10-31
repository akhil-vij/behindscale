# Code Standards

## General

- Keep modules small and single-purpose. A file should have one clear reason
  to change.
- Fix root causes, not symptoms. Do not layer workarounds over a broken
  assumption — correct the assumption.
- Do not mix unrelated concerns in one component, module, or script. The
  build tooling (`scripts/`) and the website (`src/`) are separate worlds
  (see architecture.md); respect that boundary in code organization too.
- Prefer small, verifiable increments. If a change can't be checked end to
  end quickly, it's too big — split it.

## TypeScript

- Strict mode is required everywhere TypeScript is compiled: `src/`
  (`tsconfig.app.json`), `scripts/` (`tsconfig.scripts.json`) and the tool
  configs (`tsconfig.node.json`). `tsc -b` runs in `npm run build`.
- Avoid `any`. Use explicit interfaces or narrowly scoped types. For input
  the compiler can't see (content JSON, SVG files, `postMessage` payloads,
  `localStorage` records), define a type and validate before trusting it.
- Validate content at the build boundary. `scripts/validate-content.ts`
  checks every content file's shape against the predicates in
  `src/types/predicates.ts`, runs every check in `scripts/checks/`, and
  reports all failures in one pass. A malformed file fails the build; it is
  never shipped.
- Shared types (the content schemas) live in one place, `src/types/`, and
  are imported by both the build scripts (checker) and the website (reader)
  so the content contract is typed on both sides. The barrel
  `src/types/index.ts` stays type-only; the runtime predicates are imported
  from `src/types/predicates.ts` directly, so they never reach the site
  bundle.
- `scripts/` also imports pure helpers from `src/lib/` and `src/walls/`, so
  a build check and the page it guards share one implementation. `src/`
  never imports from `scripts/` or `tests/`.

## Website (Vite + React)

- Function components and hooks only. The exception is error boundaries,
  which React only supports as classes (the landing hero's, and the one
  `scripts/compile-artifacts.ts` wraps every artifact in).
- The website is static-by-construction. Content is bundled from `content/`
  at build time (`import.meta.glob` in `src/content/index.ts`) and every
  route is prerendered (`scripts/prerender.ts`); nothing is fetched for
  content at runtime. Beyond the page's own static assets, the only runtime
  network activity is artifact iframe loads, their HEAD availability probe,
  and Vercel Analytics.
- The client hydrates the prerendered HTML (`hydrateRoot`), so the first
  client render must match it. Anything that reads `window`, the URL query
  or storage runs in an effect after mount.
- Artifacts are never imported as modules into the main bundle. They are
  loaded as self-contained bundles into iframes sandboxed to exactly
  `allow-scripts`, and the host talks to them only through `postMessage`
  gated on `event.source` (see invariant 2 in architecture.md). This keeps
  the main bundle lean and isolates failures.
- Components must degrade gracefully. The validator stops malformed content
  at build time, so the site trusts the schema; components still render a
  section only when it has content, and fall back on a missing reference
  (an unknown pattern shows its slug, a class with no page renders as plain
  text) rather than throwing and white-screening the page. A failing
  artifact shows one muted line in its own slot.
- No `localStorage`/`sessionStorage` reliance for core functionality; the
  site must work as a stateless reader. The one use is best-effort wall
  progress (`bs:wall:<cruxTag>`, written by
  `src/pages/problem/useWallHost.ts`, every access in try/catch); artifacts
  get no storage at all.

## Pipeline and Claude prompts (deferred)

The automated pipeline (`pipeline/`, SQLite, Claude API calls, versioned
prompts under `pipeline/prompts/`) was deferred on 2026-06-04 and never
built. Its stage, idempotency, API-key and prompt-versioning rules live
with its design in `context/pipeline-architecture-deferred.md`. Content is
hand-authored today. Never commit secrets regardless; the Anthropic key, if
the pipeline returns, comes from `ANTHROPIC_API_KEY`.

## Styling

- Use the CSS custom property tokens defined in ui-context.md. No hardcoded
  hex values in `src/` outside the token definitions in `src/index.css`.
- Follow the border-radius scale from ui-context.md.
- Shell is light/editorial; artifacts are dark. Do not introduce a dark
  shell or a light artifact without updating ui-context.md first.

## Content Contract (content/)

- Every article, pattern definition and problem essay, and the cruxtag
  registry, conforms to its schema in `src/types/`; the validator's
  `[schema]` section checks each file.
- Every pattern referenced in an article must use a canonical pattern slug so
  the pattern library matches correctly. Normalize names (via the slug)
  rather than relying on free-text equality; `orphan-pattern-slugs` fails
  the build on a slug with no definition in `content/patterns/`.
- The pattern library's aggregates (frequency, companies, back-links,
  co-occurrence) are derived data: computed at build time in
  `src/content/index.ts` from the article ↔ pattern references, never
  hand-edited. `content/patterns/*.json` holds only the hand-authored
  definitions; there is no aggregated index file.

- **SVGs carry no C2PA content-credentials block.** Design deliveries can
  embed a signed manifest (`<metadata><c2pa:manifest>` plus `xmlns:c2pa`,
  ~8KB each); strip it from the file before committing. Inline diagrams are
  copied into the prerendered page and the client bundle, so it costs real
  bytes. The `svg-no-c2pa` validator check fails the build on any SVG under
  `content/` or the top of `public/` that still has one.

## Testing Strategy

- **Schema validation tests with vitest.** One test file per content type,
  colocated with the types under `src/types/__tests__/`. Each test asserts
  that a positive sample conforms and that several deliberately malformed
  samples are rejected. Hand-written type-guard predicates
  (`src/types/predicates.ts`) handle the runtime shape check; the same
  predicates back the build-time validator. Zod or a similar runtime
  validator is deferred along with the pipeline.
- **Build-time integrity checks** run in `npm run validate`, the first step
  of `npm run build` and of CI. The orphan-pattern-slug validator
  (invariant 8) is the canonical example: a failure fails the build with a
  clear error identifying the offending article and slug. Most checks also
  have a vitest test in `scripts/checks/__tests__/`.
- **Targeted unit tests for non-trivial pure functions** (search, grouping,
  prose parsing, routes, dates) where behavior is hard to verify by running
  the site: `src/lib/__tests__/`, `src/content/__tests__/`,
  `scripts/__tests__/`.
- **Wall suites** (`tests/unit/`, vitest): per wall, a rules-parity test
  (the mission's frozen rules enumerated and diffed against the approved
  decks in `tests/fixtures/`), a click-through test (the mission source
  rendered in jsdom and driven through the DOM), and a YOU-wrap test.
- **Playwright** (`tests/e2e/`) runs against a production build served by
  `vite preview` (`playwright.config.ts`); `playwright.prod.config.ts` runs
  the same specs against a deployed URL (`BASE_URL`). It covers the
  golden-path smoke (`/problems` → article → pattern), each wall page end to
  end through the real iframes, and site-wide rules (link arrows, search
  counts, share tags, standalone artifact pages, the 404). Not a substitute
  for unit tests where they're warranted.
- **Mission days in e2e run on a fake clock unless pacing is the subject.**
  A mission day is paced for reading in real time (about 90s). A test that
  needs a day's end state (cards, labels, the YOU column, a round trip)
  installs Playwright's clock before the page loads (`fastClock`) and runs
  it forward (`runUntil`); only tests that measure pacing (reading time,
  reduced motion) play a day in real time. Prefer a seeded saved state
  (a `bs:wall:<cruxTag>` record set with `addInitScript`) when a test needs
  only the result, not the run.
- **CI** (`.github/workflows/ci.yml`) runs validate, vitest and Playwright
  on every push and pull request. Vercel deploys `main`.

## File Organization

- `src/` — the website (Vite + React). `main.tsx` hydrates,
  `ssr-entry.tsx` is the prerender entry, `AppRoutes.tsx` holds the routes,
  `index.css` the tokens.
  - `pages/` — one component per route; `pages/problem/` holds the problem
    page's sections and host hooks, beside `problem-page.css`.
  - `components/` — shared components (artifact embed, chips, attribution,
    prose).
  - `content/` — the build-time content index (`content/` and `keywords/`
    via `import.meta.glob`, plus the derived pattern stats).
  - `types/` — content schemas (type-only barrel) and `predicates.ts`.
  - `lib/` — pure helpers, several shared with `scripts/`.
  - `walls/` — per-wall code: one `youMapping()` module per playable wall,
    registered in `index.ts`.
  - `config/` — site constants (`site.ts`).
- `scripts/` — build tooling, run with `tsx` and chained by `npm run build`
  (`package.json`): the validator (`validate-content.ts`,
  `load-content.ts`), the artifact compiler (esbuild,
  `content/artifacts/*.jsx` → `public/artifacts/<slug>/`), figure copy,
  prerender, sitemap, feed, and the share-image check.
  - `checks/` — one file per validator check, registered in
    `validate-content.ts`.
- `content/` — hand-authored content: `articles/`, `patterns/`
  (definitions), `problems/` (problem-class essays and their SVG diagrams),
  `artifacts/` (artifact `.jsx` sources and each wall's `*-rules.js`),
  `figures/<slug>/` (inline SVG figures), `cruxtags.json` (the problem-class
  registry), `feeds.json` (the source allowlist).
- `keywords/` — the search-terms overlay (articles, patterns, walls).
- `public/` — static assets. `public/artifacts/` and `public/figures/` are
  build output (gitignored).
- `tests/` — `unit/` (wall suites), `e2e/` (Playwright specs), `fixtures/`.
- `docs/` — design specs and authoring guides.
- `handoff/` — incoming briefs and design deliveries.
- `.github/workflows/ci.yml` — CI.
