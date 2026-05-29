# Code Standards

## General

- Keep modules small and single-purpose. A file should have one clear reason
  to change.
- Fix root causes, not symptoms. Do not layer workarounds over a broken
  assumption — correct the assumption.
- Do not mix unrelated concerns in one component, module, or script. The
  pipeline and the website are separate worlds (see architecture.md); respect
  that boundary in code organization too.
- Prefer small, verifiable increments. If a change can't be checked end to
  end quickly, it's too big — split it.

## TypeScript

- Strict mode is required across both `src/` (website) and `pipeline/`.
- Avoid `any`. Use explicit interfaces or narrowly scoped types. For external
  input (RSS feeds, fetched HTML, Claude API responses), define a type and
  validate before trusting it.
- Validate unknown external input at system boundaries. Specifically: parse
  and validate Claude's JSON output against the summary schema before writing
  it to `content/`. A malformed model response must be caught and flagged,
  never written blindly.
- Shared types (e.g. the article summary and pattern schemas) live in one
  place and are imported by both the pipeline (writer) and the website
  (reader) so the content contract is typed on both sides.

## Website (Vite + React)

- Function components and hooks only.
- The website is static-by-construction: no data fetching from a network at
  runtime. Import generated content from `content/` at build time.
- Artifacts are never imported as modules into the main bundle. They are
  loaded as self-contained bundles into sandboxed iframes (see invariant 2 in
  architecture.md). This keeps the main bundle lean and isolates failures.
- Components must degrade gracefully on missing/malformed content: skip and
  flag a bad entry rather than throwing and white-screening the page.
- No `localStorage`/`sessionStorage` reliance for core functionality; the
  site must work as a stateless reader.

## Pipeline (Node + TypeScript)

- Each pipeline stage (discover, fetch, analyze, generate, publish) is its
  own module with a single responsibility and a typed input/output.
- Stages are idempotent. Re-running must not duplicate work; consult and
  update the SQLite status before and after each stage.
- All Claude API calls go through one thin client wrapper so model name,
  retries, and error handling live in one place.
- Network and filesystem effects are isolated in clearly named functions so
  the core logic is testable.
- Never commit secrets. The Anthropic API key comes from an environment
  variable (`ANTHROPIC_API_KEY`), never hardcoded or committed.

## Claude Prompts (treated as code)

- System prompts (analysis prompt, artifact-generation style guide) live in
  versioned files under `pipeline/prompts/`, not inlined as string literals
  scattered through logic.
- The artifact style guide prompt encodes the ui-context.md dark token
  palette and the established artifact conventions (tabs, expandable cards,
  pattern cross-references, failure-scenario toggles).
- Changes to prompts are meaningful changes — note them in
  progress-tracker.md.

## Styling

- Use the CSS custom property tokens defined in ui-context.md. No hardcoded
  hex values in `src/`.
- Follow the border-radius scale from ui-context.md.
- Shell is light/editorial; artifacts are dark. Do not introduce a dark
  shell or a light artifact without updating ui-context.md first.

## Content Contract (content/*.json)

- Every article summary file conforms to the shared summary schema.
- Every pattern referenced in an article must use a canonical pattern name so
  the aggregation in the pattern library matches correctly. Normalize names
  (e.g. via a slug) rather than relying on free-text equality.
- The aggregated pattern library is derived data: it is regenerated from the
  per-article summaries, never hand-edited.

## Testing Strategy

- **Schema validation tests with vitest.** One test file per content type,
  colocated with the types under `src/types/__tests__/`. Each test asserts
  that a positive sample conforms and that several deliberately malformed
  samples are rejected. Lightweight hand-written type-guard predicates
  (in `validators.ts`, test-only) handle the runtime shape check. Zod or a
  similar runtime validator is deferred until the pipeline needs to
  validate Claude's JSON output before writing to `content/`.
- **Build-time integrity checks** run as part of `npm run build`, not as a
  separate test suite. The orphan-pattern-slug validator (invariant 8) is
  the canonical example: a failure fails the build with a clear error
  identifying the offending article and slug.
- **One Playwright smoke test** covers the golden path: load `/`, navigate
  to one article, navigate to one pattern, assert no crash. Lands once
  those three pages render real content (Unit 3c onward). Catches
  routing/rendering regressions cheaply; not a substitute for component
  tests where they're warranted.
- **No preemptive unit tests for pipeline glue code.** The orchestrator's
  per-article success/failure reporting is the real safety net. Add
  targeted tests only for non-trivial pure functions (e.g. slug
  normalization, dedup logic) where the function's behavior is hard to
  verify by running the orchestrator end to end.

## File Organization

- `pipeline/` — pipeline stages, prompts, SQLite access, Claude client.
- `pipeline/prompts/` — versioned system prompts (analysis + artifact style).
- `content/` — generated per-article summary JSON + aggregated pattern JSON.
- `public/artifacts/` — compiled self-contained artifact bundles.
- `src/` — website React app (pages, components, shared types).
- `src/types/` — shared schema types imported by both site and pipeline.
- `.github/workflows/` — CI/CD build, deploy, and optional scheduled run.
