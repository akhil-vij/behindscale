# Progress Tracker

Where the project stands right now. Keep it short and current: edit the
sections in place when something changes, delete what is finished, and don't
append session narrative. Commit messages and PR descriptions carry the
detail. The full log up to 2026-10-12 (every unit, round and decision with
its reasoning) is in `context/archive/progress-log-2026.md`; search it when
you need the history behind a choice, don't read it end to end.

_Last updated 2026-10-31. `main` at `d26fa2c` (PR #28)._

## Current State

- **Mode: manual editorial authoring.** The owner reads official engineering
  blogs and drafts each breakdown with Claude in chat; Claude Code places the
  files, builds, verifies and opens the PR; a design agent supplies SVG
  drawings. Larger tasks arrive as briefs under `handoff/`. No fixed article
  cadence: the old three-a-week target is optional. The Claude pipeline stays
  deferred (`context/pipeline-architecture-deferred.md`; owner, 2026-10-31).
- **Audience:** the public comes first, the owner's own library second
  (owner, 2026-10-31).
- **Library (2026-10-12):** 41 articles, 52 patterns, 14 problem classes.
  The last new article landed in late July; since then the work has been
  problem pages, lessons, and article and pattern enrichment rounds.
- **Two full lessons ("walls"):** problem pages with a try-it, a mission,
  comparison diagrams and the YOU column.
  - `/problems/ambiguous-timeouts` (`ambiguous-failure-under-retry`), page 1.
  - `/problems/queue-backlog` (`buffer-degrades-under-backlog`), page 2,
    merged 2026-10-12 (PR #28).
  - The other 12 problem classes have essay pages without a mission.
- **Health:** `npm run validate` passes with 0 errors and 45 warnings (40
  `stats-value-in-prose`, 5 `figure-count-ceiling`; both are warning-only by
  design). CI (`.github/workflows/ci.yml`) runs the validator, vitest and
  Playwright on every push and PR; Vercel deploys `main`.

## In Flight

- **`copy/meta-checkpoints`** (pushed 2026-10-13, no PR): one queue-backlog
  copy commit, "Meta's checkpoints keep the list short and reads faster".
  Open a PR for it or drop it (owner).
- **Owner device checks** (no test can make these): the desktop
  scroll-in-scroll feel of the sticky mission column (open-decisions #34) and
  the mission stage on a real phone, iOS Safari and "Remove animations" on
  (open-decisions #25).

## Next Up

The plan (owner, 2026-10-31):

1. **The owner reviews the second lesson** (`/problems/queue-backlog`).
2. **Sharing the site starts after that review.** Pre-distribution batch A
   already shipped (share image, standalone simulation pages, RSS dates, 404,
   search count). What's left waits on the plan decision in open-decisions
   #29: moving the repo to an organization, Vercel Pro for custom events, and
   whether `context/`, `docs/`, `handoff/` and `keywords/` stay public.
3. **The third wall/lesson, then the fourth.** Which problem classes is the
   owner's call.
4. **Articles in parallel** with the lessons, no fixed cadence. Default
   framing: weigh the cross-cruxTag or cross-pattern recurrence a candidate
   would add alongside its standalone merit.

Also on record:

- **A shared mission engine** for the walls, parked "until after launch" when
  queue-backlog was built as its own artifact. Worth weighing before the
  third wall copies the second.
- **Page 1's double survived-day card** (open-decisions #32): a three-line fix
  plus page 1's tests; the owner said later.
- **Queue-backlog's phone wall figure** (open-decisions #31): swap it in if
  the design agent sends the tidy-up.

## Open Questions

Pending owner decisions live in `context/open-decisions.md`. This list is for
direction questions that aren't there yet.

- **Which problem classes become the third and fourth lessons?**

## Deferred Work

Each item is safe to pick up on its own.

- **Stale comment in `src/pages/Landing.tsx`:** the structure comment near the
  top still names `/artifacts/_hero/index.html`. The hero embeds
  `/artifacts/priority-aware-load-shedding/index.html`; the old path 301s in
  `vercel.json`. Comment only.
- **Skipper errata:** `skipper-workflow-engine.json` says "10,000 workflows
  per second on DynamoDB"; flagged in July as conflicting with the source's
  MySQL/UDS state-store framing. Check the source when the article's prose is
  next touched.
- **Validator warnings:** when an article is touched, harmonize the stat
  string with the prose ("five minutes" vs `5 minutes`) and recheck articles
  with four figures.
- **Faster e2e (owner's call):** more Playwright workers locally and in CI;
  tag the pacing tests so a quick local run can skip them.
- **Per-article share images**, built from the article JSON. Today every page
  uses `public/og-default.png`.
- **Prose to artifact-state deep links** (`?view=` and a parent-to-child
  postMessage) and a **scroll-synced sticky artifact panel**. Ideas from
  2026-06-11, gated on artifact engagement data, which needs the custom
  events in open-decisions #29.
- **Edge-case fixtures for the pattern detail page:** no `category`, empty
  `whenItApplies`, a very long `definition`.
- **The pipeline (Units 7 and 8):** deferred indefinitely, reconfirmed by the
  owner on 2026-10-31; see the deferred doc.

## Developer Setup

- Once, before `npm run test:e2e`: `npx playwright install chromium` (CI uses
  `--with-deps`).
- `npm run validate`, `npm test` (vitest), `npm run test:e2e` (Playwright
  against a local production build), `npm run build` (the full chain). `npm
  run test:e2e:prod` runs the suite against `https://www.behindscale.com`
  (override with `BASE_URL`).
- The build needs full git history for RSS dates; `scripts/content-dates.ts`
  deepens a shallow clone itself.

## Updating This File

- When a change lands, update Current State, In Flight and Next Up in place
  and remove what's finished.
- Owner decisions go to `open-decisions.md`. A decided rule goes to the
  context file it belongs in (architecture, ui-context, code-standards), not
  here.
- Test counts, commit hashes and step-by-step narrative belong in the commit
  and the PR, not here.
