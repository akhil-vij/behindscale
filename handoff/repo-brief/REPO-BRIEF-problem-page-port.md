# Task: Port the problem detail page (v7.3) into the repository — ambiguous-timeouts

## What this is

`problem-page-v7.3.html` is the approved reference build of behindscale's problem detail
page for one wall. It was developed as a standalone prototype over eight rounds; the copy,
the rules, the attack engine, the comparison, the interview section and the design tokens
are all approved. Your job is to make the shipped page at `/problems/ambiguous-timeouts`
match it, built in a way that the second wall does not require changing the shell.

The prototype is the spec. Where this brief and the prototype disagree, the prototype
wins and you tell me.

## What I know about the repo, and what I don't

Known (from the Stage 0 landing work): React, Vite, TypeScript. `src/pages/*.tsx` render
pages; routes in `src/AppRoutes.tsx`. `scripts/prerender.ts` bakes pages to static HTML
(`renderToString` + `StaticRouter`) and the client hydrates. Content lives under
`content/`; classes come from `cruxtags`; `/problems/<urlSlug>` is already a prerendered
route. Artifacts are served from `/artifacts/<slug>/index.html` and embedded as
`<iframe sandbox="allow-scripts">`.

Not known — do not assume, report in Step 1:
- how the current `/problems/<slug>` page is composed and where its data comes from
- how artifacts are authored and built (hand-written HTML? a bundling step? the prototype
  notes say "self-contained .jsx bundle", but I have not seen one)
- whether any artifact talks to its host page today (postMessage or anything else)
- the exact sandbox flags and any CSP
- where design tokens live and whether `ui-context.md` is the source of truth
- whether the repo has any headless or browser test setup
- how the page currently handles client-side JS given the SSG/hydration model

## Step 1 — report before writing code

1. The current problem page: files, data flow, what renders today at
   `/problems/ambiguous-timeouts`, and how the 14 class pages are generated.
2. Artifacts: how one is built and deployed; the iframe markup used; whether host↔artifact
   communication exists. If none exists, propose how you'd add `postMessage` (see §3) in
   a way consistent with the repo.
3. Content: the schema for a class today, and what fields this page needs that don't exist
   (stations, time budgets, questions, comparison rows, interview block, teasers, YOU
   mapping). Propose the minimal addition.
4. Tests: what exists; what you'd use for the parity test and the click-through (§5).
5. Storage: is there any client-side persistence today? (Progress and the commit sentence
   live in the browser for now — see §3.)
6. Anything in v7.3 you cannot port as-is under the repo's constraints, with the reason.

Wait for a go-ahead. Then §4.

## §2 — Frozen

Port these verbatim. Do not rewrite, reword, "improve" or refactor their behaviour:

- **Copy.** Every visible string in v7.3, in order. The acceptance test is a text diff
  (§6). Excluded strings are listed in §4G.
- **The rules block** between `/*RULES-START*/` and `/*RULES-END*/` — `dayTokens()`. Port
  it as a pure function in one file with no dependencies. 576 decks, 12 clean, 12
  distinct bills (`DECKS-v6-1.md`).
- **`GROUPS`** (the eight decision rows and their dependency locks), **`LEVELS`** (the
  five attacks: text, `attack()`, `rerun()`, hints, the A5 branch on `K.ret`),
  **`buildDebrief()`**, and the **`youMapping()`** function in the v7 script.
- **The cue system**: one `data-cue` attribute on the artifact root (`run` | `deck` |
  `group` | empty). One cue at a time is enforced by there being one attribute.
- **Motion rules**: double-charge stamps hold a 900ms real-time dwell that is not
  divided by speed; reduced-motion beats are not speed-divided; the 2× toggle; STEP mode.
- **Layout rules**: vertical stage under 700px; sticky RUN under 700px; damage log capped;
  the phone damage toast; scroll hints on the table and diagram strip; the sticky nav with
  scroll-spy and the hidden-until-first-click "↑ your decisions".
- **Design tokens**: the `--art-*` and shell variables as v7.3 defines them.
  `CHANGELOG-v7.3.md` §1 is the token table and §2 the cue rule — port from those, not from
  the CSS diff. Its §1 also asks for `ui-context.md` updates (add the named tokens; record
  `#08090D` as the canonical dark family, `#0b0d12` as deprecated-migrate-at-next-touch).
  Do that in the same PR. Do not migrate other artifacts off `#0b0d12` here.
- **Everything in `CHANGELOG-v7.3.md` §6 "Protect in the port"** is frozen: single
  `data-cue` attribute; real-time dwells and kill-mark floors; reduced-motion beats never
  speed-divided and `shake` inside the reduced block; toast only under 700px;
  `youMapping()` as the single source for cells, diagram and ticks; both YOU empty states
  verbatim; the bill BASELINE convention and commit-box grammar; GH/GV dual geometry on
  one animation script; 680px column / 960px artifact breakouts; no `scrollIntoView`
  anywhere.
- **Accessibility**: `aria-label`s on both stages, `aria-live` on the narration,
  reduced-motion handling.

## §3 — Architecture to propose (fit it to the repo; don't impose it)

**Shell + two artifacts.** The page is a server-rendered shell (all copy in the static
HTML for SEO and no-JS reading). The Try-it artifact and the Build-it mission are two
sandboxed iframes, as the prototype notes intended. The shell owns: header, stations
nav, the wall stats, the stopping block, the hint sheet (spectrum, six diagrams, table,
Q rows), decide, steal, interview, patterns, cards, sources.

**Host ↔ mission protocol.** The YOU column, the YOU diagram, the interview ticks and the
commit sentence live in the shell but depend on state inside the mission iframe. Propose a
small versioned `postMessage` schema. What I'd expect, as a starting point:

```
// mission → host
{ v: 1, wall: 'ambiguous-timeouts', type: 'ready' }
{ v: 1, wall, type: 'state', decisions: {id,mem,read,cli,rep,ret,params?,after?},
                             held: [bool×5], survived: bool, bill: [{c,s,base?}] }
{ v: 1, wall, type: 'checkpoint', kind: 'caused' | 'survived' | 'held' }
{ v: 1, wall, type: 'commit', text: string }
// host → mission
{ v: 1, wall, type: 'init', commit?: string, reducedMotion?: bool }
```

The host validates `event.origin`/`source` against the iframe it created, and ignores
anything else. The mission emits `state` after every clean day, after every held attack
and after every decision change once survived. The host recomputes the YOU column,
diagram and ticks from `state` using `youMapping()` — the mapping is per-wall data and
lives with the wall's content, not in the shell.

**Persistence.** Browser only for now (Stage 2 adds accounts). One record per wall:
`{ commit, checkpoints: {caused, survived, held}, lastDecisions }` under a namespaced
key. Design it so a signed-in merge later is a copy, not a migration.

**Mission contract for future walls.** The shell must not know this wall's mechanics.
Any future mission must be able to plug in by: emitting the same four message types;
providing a `youMapping()` for its rows; and supplying its questions, comparison rows,
time budgets and interview block as content. Make sure nothing in the shell hard-codes
six decisions, five attacks, or the payment domain. The number of questions and
attacks is per wall.

## §4 — The port

### A. Shell (`/problems/ambiguous-timeouts`)
Sections in v7.3 order: header and lede · sticky nav (TRY IT · 3 MIN … INTERVIEW, scroll-
spy, hidden deck-jump) · intro · The wall (Try-it iframe, noscript static figure, stat
strip) · Build the defense (mission iframe) · stopping block · hint sheet (burden line,
"Six systems, one diagram — the sixth is yours", "Start with the first row" lead, the
seven-column table with Who calls and YOU, Q1–Q6 with Q6 open) · Which answer is yours +
Same wall, other places · What to steal · If this comes up in an interview (five parts,
live ticks) · Patterns in this class · Every article (with break-it teasers) · sources.
All copy prerendered. Time budgets from content, not hard-coded in the nav component.

### B. Try-it artifact
Port the first `<script>` (the ambiguity-window state machine) and its markup/styles as
its own artifact. It is a pure step function; the `OUTCOMES` table is assertable.

### C. Build-it mission artifact
Port the second `<script>` and its markup/styles: engine, stage geometry (both maps),
animation primitives, events, run control, escalations, debrief, cue system, dwell, the
commit box (it is inside the artifact in v7.3 — keep it there and emit `commit`). Emit the
protocol messages from §3. Read the stored commit from `init`.

### D. Host-side listeners
Port the v7 script (`youMapping`, table/diagram fill, interview ticks, debrief link) as the
host's handler for `state` messages, and the v7.3 script (scroll-spy, deck-jump reveal,
scroll hints, added-row tags, damage toast) split between host and mission as appropriate.
Note: the added-row tags and the toast are inside the mission; scroll-spy and scroll hints
are host.

### E. Tests (§5)

### F. `/problems` list (small, Stage 0 leftover)
On the list page, mark walls that have a mission: a `Playable` badge, the break-it teaser,
and a time estimate (`~35 min` for this wall — sum of the station budgets through DECIDE).
Data-driven from a content flag so the second wall lights up by setting one field.

### G. Do not port, and three copy decisions

Three owner decisions from `CHANGELOG-v7.3.md` §5 are taken; apply them in the port (they
are the only copy changes from v7.3 and the only permitted text-diff differences besides
the exclusions below):

1. The YOU diagram row's role tag reads `You` twice (name and vantage). Vantage becomes
   `Your design`.
2. The caption under the Try-it artifact says "The three cut points are the wall figure
   above" — that figure is noscript-only. New sentence: "The three cut points are the
   artifact's three cuts; the three places the key's memory can live are question 2
   below." Rest of the caption unchanged.
3. The nav's INTERVIEW item gets a budget like the others: `INTERVIEW · 5 MIN`.

Do not port:
- FREE PLAY (`#freebtn`, `#freenote`, `?free`) — prototype only.
- The amber `proto-note` blocks (the v6 banner, the GATE note, the "stored in the browser
  only" note). Keep the GATE note's content as a code comment where the mission unlocks
  after the naive run — that is where the paywall goes in Stage 2.
- The newsletter placeholder block. If the site has a real signup component now, use it;
  otherwise omit the block and tell me.
- The `/*RULES-START*/` comment header text — keep the function, drop the prototype
  commentary.

## §5 — Tests that must pass

1. **Rules parity.** Enumerate all 576 decks through the ported `dayTokens()`; assert
   exactly 12 have `win === true` and that their bills match `DECKS-v6-1.md` line for line
   (cost text and source). Run in CI.
2. **Click-through, default path.** Naive day → 2 doubles / 0 lost / 0 tickets. AWS deck
   with `ret: ever` → clean day, bill visible, YOU column filled ("With the work, one
   commit, master only" / "Can't half-happen" / "The saved result" / "Forever" / all five
   attacks listed). Commit sentence locks, appears under the YOU diagram and atop the
   debrief, persists across reload. A1: re-run fails, accept appears only after, accept
   completes. A2: re-run with replica breaks; `read: master` holds. A3 with `ever` holds
   with the warn card. A4: params row appears, `run` breaks, `refuse` holds. A5 with
   `ever`: collision attack, WINDOW glows, re-run "still colliding"; bound to `day` →
   "traded the collision for a straggler", AFTER row appears; `reconcile` holds. Debrief
   generated; interview ticks all ✓; YOU "Still breaks when" reads the all-held text.
   Zero console errors. The two `.mjs` files supplied ran this against the prototype with
   jsdom and accelerated timers; adapt them to the repo's harness.
3. **Cue exclusivity.** At every state transition in test 2, assert `data-cue` has at most
   one value and that no other pulse class is present.
4. **Text parity.** Extract the visible text of the rendered page (JS on, artifacts
   included) and of `problem-page-v7.3.html`; diff. Every difference must be one of the
   three copy decisions in §4G or an excluded block. Any other difference is a regression.
5. **No-JS.** With JS disabled, the page shows all copy, the noscript wall figure, and a
   one-line fallback where each artifact would be.
6. **Prerender.** The served HTML for the route contains the copy (grep three sentences
   from three sections).

## §6 — Deliverables

- Step 1 report first.
- One branch/PR. Commits split: shell · try-it artifact · mission artifact · host
  listeners · list markers · tests.
- Screenshots at 1440 / 1024 / 390 of: top of page, Try-it, mission before a run, mission
  after a survived day (bill + commit box), an attack with a group glowing, the debrief,
  the comparison with YOU filled, the interview table.
- Test output for §5.1–§5.6.
- The content schema you added, with one sentence on how a second wall would use each
  field.
- A list of every decision you made that this brief did not specify.

## Acceptance

- Text diff (§5.4) clean apart from §4G.
- Rules parity (§5.1) green in CI.
- Click-through (§5.2) green.
- A reader with JS off can read the whole page.
- Nothing in the shell references six decisions, five attacks, or payments by name.
