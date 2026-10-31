# AI Workflow Rules

How Claude Code works in this repo: scoping, branching, verifying, shipping.

## Approach

- Work from the specs: the context files; `docs/` for authoring and design
  (`docs/authoring-problem-pages.md`, `docs/behindscale-taste.md`,
  `docs/figures-design.md` and the rest); and the task's brief when there is
  one (`handoff/`). Don't infer or invent product behavior.
- When something is undefined, ask the owner or record it in
  `open-decisions.md` before building on a guess.
- A brief governs its own task. Rulings it records are settled; don't re-open
  them. Where a brief and a context file disagree, follow the brief and say so
  in the PR.

## Kinds of Work

- **Content rounds** (`round/<slug>-enrichment`): the owner hands over a
  round package (article or pattern JSON, artifact JSX, figure SVGs) to place.
  Place it as delivered, strip C2PA blocks from SVGs, run the gates below, and
  report anything the package leaves open as notes for the owner.
- **Page and lesson builds** (`feat/<name>`): usually from a brief, in stages:
  a lookup report first (what the repo has, what the brief needs, the
  questions), then the owner's go-ahead with rulings, then the build.
- **Fixes, copy passes, tests and docs** (`fix/`, `copy/`, `test/`, `docs/`).

## Scoping

- One task per branch, off an up-to-date `main`, and one PR per branch.
- One commit per build item, each leaving `npm run build` green. Keep content,
  site code, tests and context-doc updates in separate commits.
- If a change can't be verified end to end quickly, split it.
- **Design intent before code.** When a task makes visible choices that spread
  (component anatomy, page layout, a new postMessage message, how errors
  surface to the reader), send the owner one or two paragraphs on those
  choices and why, and wait for confirmation. Mechanical work doesn't need it.

## Commits and PRs

- Conventional Commits with a scope, in plain words that say what changed for
  the reader: `feat(queue-backlog): …`, `content(patterns): …`,
  `fix(links): …`, `copy(problems): …`, `test(e2e): …`, `docs(context): …`.
  Reference an open-decisions item as `(#31)`.
- No Co-Authored-By trailer (owner preference).
- The PR body lists what changed, how it was verified, and anything only the
  owner can check (a real device, iOS Safari, reduced motion on a phone).

## Before Calling It Done

1. `npm run validate`: 0 errors. Warnings are advisory.
2. `npm test` (vitest) and `npm run test:e2e` (Playwright against a local
   production build) pass.
3. `npm run build` passes.
4. The invariants in `architecture.md` still hold.
5. Visual changes are checked at desktop and phone widths (the tests use 1440
   and 390).
6. The context files are still true (below), and `progress-tracker.md` is
   updated in place.

## Generated Files

Don't hand-edit these; the build writes them and git ignores them:

- `public/artifacts/`: compiled from `content/artifacts/*.jsx` by
  `scripts/compile-artifacts.ts`.
- `public/figures/`: copied from `content/figures/` by
  `scripts/copy-figures.ts`.
- `dist/`, `dist-ssr/`: build output.

Everything in `content/` is authored source, edited like code. Never write a
secret into a committed file.

## Keeping Docs in Sync

Update the context file in the same PR as the change that makes it untrue:

- Rendering, boundaries, invariants, the content contract → `architecture.md`.
- Tokens, theme, layout, link and copy presentation → `ui-context.md`.
- Code and testing conventions → `code-standards.md`.
- Product features and scope → `project-overview.md`.
- Where things stand → `progress-tracker.md`, edited in place.
- Pending owner decisions → `open-decisions.md`.
