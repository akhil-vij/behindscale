# behindscale — Claude Code Context

behindscale (behindscale.com) is a system design learning site. It dissects
posts from official engineering blogs into structured breakdowns with
interactive artifacts, tracks the reusable patterns and problem classes across
them, and turns some problem classes into playable lessons ("walls"). All
content is hand-authored. The build-time Claude pipeline was deferred on
2026-06-04 and does not exist in the repo.

## Repo Map

- `content/` — the source of truth, authored by hand: `articles/`,
  `patterns/`, `problems/` (problem classes plus each wall's data and SVGs),
  `artifacts/` (artifact JSX sources), `figures/`, `cruxtags.json`,
  `feeds.json` (the source allowlist).
- `src/` — the static site: React + Vite, prerendered per route. `src/types/`
  is the content schema; `src/walls/` holds the per-wall code.
- `scripts/` — build-time tooling: the content validator and its checks
  (`scripts/checks/`), artifact compile, figure copy, prerender, sitemap, RSS
  feed, share-image check.
- `tests/` — Playwright e2e (`tests/e2e/`) and the mission suites
  (`tests/unit/`); other vitest suites sit next to their code in `__tests__/`.
- `docs/` — authoring guides and design specs. `handoff/` — task briefs from
  the owner.

## Read First

Always: `context/progress-tracker.md` (short; where things stand).

Then, as the task needs:

- Writing code → `context/architecture.md` and `context/code-standards.md`.
- Styles, layout or copy presentation → `context/ui-context.md`.
- Scoping, branching, verifying, shipping → `context/ai-workflow-rules.md`.
- Product behavior or scope → `context/project-overview.md`.
- Touching an area with pending owner decisions → the matching items in
  `context/open-decisions.md` (search it; don't read it end to end).

`context/archive/` is history and `context/pipeline-architecture-deferred.md`
is the shelved pipeline design. Read them only when the task is about either.

## Rules

- Implement against the context files, `docs/`, and the task's brief. Don't
  invent product behavior; when something is undefined, ask the owner or
  record it in `open-decisions.md`.
- Static by construction: content is compiled in at build time and present
  in the prerendered HTML. Nothing in `src/` fetches content at runtime.
- Every artifact renders in a `sandbox="allow-scripts"` iframe and fails in
  isolation. Never loosen the sandbox; extend the postMessage protocol
  instead.
- Use the `ui-context.md` tokens in `src/`; no hardcoded hex.
- Imports go one way: `scripts/` may import `src/types` and pure helpers from
  `src/lib` and `src/walls`, never components, pages or `src/content`;
  nothing in `src/` imports from `scripts/` (architecture.md invariant 3).
- Articles come only from the official engineering blogs in
  `content/feeds.json`.
- `npm run build` (which runs the validator) passes before anything is called
  done. Never commit secrets.

## Keep in Sync

- Update `context/progress-tracker.md` in place when a change lands; keep it
  short (its header says how).
- Update `context/open-decisions.md` when a round or session raises or
  resolves an owner decision.
- If a change makes a context file untrue, fix that file in the same PR.
