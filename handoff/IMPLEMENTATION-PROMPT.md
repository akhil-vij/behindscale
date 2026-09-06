# Implementation prompt — port problem page v7.3 into behindscale

You are taking over an approved, fully-scoped task in the behindscale repo
(`/Users/akhilvij/Desktop/code/behindscale`, branch `main`). The research phase
(Step 1 of the brief) is **done** and the owner has issued a **go-ahead with
rulings**. Your job is §4 of the brief: build the ambiguous-timeouts problem
detail page from the approved v7.3 reference, write the §5 tests, and open one
PR. Do not redo Step 1. Do not re-open any decision recorded in this document —
they are owner rulings, not suggestions.

## 0 · Read first, in this order

1. `CLAUDE.md` and every `context/` file it lists — repo law. Non-negotiables:
   pipeline (`pipeline/`, `scripts/`) and website (`src/`) never import across
   the boundary; the website does no runtime network fetching; artifacts render
   in `sandbox="allow-scripts"` iframes and fail in isolation; no hardcoded hex
   in `src/` (tokens only); never commit secrets.
2. `handoff/repo-brief/HANDOFF-README.md` — reading order for the handoff.
3. `handoff/repo-brief/REPO-BRIEF-problem-page-port.md` — the task. §2 frozen
   surfaces, §3 architecture, §4 port stages A–G (including §4G's three taken
   copy decisions and the do-not-port list), §5 the six required tests, §6
   deliverables and acceptance criteria.
4. `handoff/repo-brief/problem-page-v7.3.html` — **the spec** (2,357 lines).
   Where the brief and this file disagree, the file wins; say so in the PR.
5. `handoff/repo-brief/CHANGELOG-v7.3.md` — the design pass as rules. §1 token
   table, §2 the single-cue rule, §3 motion, §4 layout, §6 protect-in-port
   list. Port from this, not from a CSS diff.
6. `handoff/repo-brief/DECKS-v6-1.md` — the 12 clean decision sets and exact
   bills; the §5.1 parity test asserts against it line for line.
7. `handoff/repo-brief/headless-tests/` — prototype jsdom click-through
   scripts; starting point for §5.2, not a finished harness.
   `clickthrough-freeplay.mjs` is do-not-port reference only.
8. `docs/behindscale-taste.md` and `docs/CORRECTIONS.md` (everything before
   "## Round entries") — artifact anatomy and editorial law.

The `handoff/` directory is checked in as the port's reference material.
Files that tests need (see §6 below) still get copied into the fixtures
directory tests import from — don't reach into `handoff/` from test code.

## 1 · Map of the reference file

`problem-page-v7.3.html` structure, by line (verified against this copy):

- Tokens ~21–25; sticky nav ~417 (TRY IT · 3 MIN / BUILD IT · 15 MIN /
  COMPARE · 10 MIN / DECIDE · 5 MIN / GO DEEPER · 20+ MIN / INTERVIEW /
  `#navdeck` deck-jump); wall + try-it section ~421–499; noscript figure
  ~501–534; mission `#artB` ~545–604 (root carries `data-cue`); stopblock ~601
  (renders in page flow, not inside `#artB`); hint sheet ~604–1046; DECIDE
  ~1048; STEAL ~1072; INTERVIEW table ~1083; patterns ~1120; cards ~1135.
- **Script 1 (~1184–1279)** — the try-it state machine (START/MID/OUTCOMES
  tables, 15 outcomes). Becomes the **try-it artifact**.
- **Script 2 (~1280–2136)** — the mission engine. `K` defaults ~1290, RULES
  block ~1294–1326 (`dayTokens(Q)` → `{ev, extra, dbl, lost, tick, bill,
  win}`), GROUPS ~1329 (8 rows with needs/lock gates), card() ~1623,
  finishDay ~1770, runAll ~1787, LEVELS ~1842, escAbandon ~2008, escExit
  ~2021, buildDebrief ~2083. Becomes the **mission artifact**.
- **Script 3 (~2137–2285)** — the v7 host script: `youMapping(K, held)` pure
  lookup ~2166, localStorage commit persistence ~2227/2249, DOM reads via
  `readK()`. Becomes **host-side message listeners** (it cannot read DOM
  across an iframe — the brief anticipates this in §4D).
- **Script 4 (~2287–2355)** — v7.3 behaviors: scroll-spy, deck-jump reveal,
  scroll hints, toast scroll. **Splits**: scroll-spy + deck-jump + page scroll
  hints are host-side; toast + in-artifact scroll hints go with the mission.

## 2 · Repo facts (already researched — trust these, verify only if something fails)

- **Page**: `src/pages/ProblemDetail.tsx`, route `/problems/:urlSlug` in
  `src/AppRoutes.tsx`. Data: `content/cruxtags.json` registry joined by frozen
  `cruxTag`; optional essay `content/problems/<cruxTag>.json` (type
  `src/types/problemEssay.ts` — today `{cruxTag, headline?, lede?, intro?,
  extraSections?}`, all 14 files lede-only); member articles filtered from
  `content/articles/*.json` on `cruxTag`. `scripts/prerender.ts` prerenders
  all 14 routes to `dist/problems/<urlSlug>.html` via renderToString +
  StaticRouter, with meta + JSON-LD. The whole app hydrates
  (`src/main.tsx`) — so host logic = client-side `useEffect`s inside the
  ProblemDetail component; copy stays fully prerendered.
- **Artifacts**: authored as self-contained React `.jsx` in
  `content/artifacts/<slug>.jsx` (single default export, React primitives
  only, inline styles — see taste doc §6 for anatomy: eyebrow, context block,
  footer backlink). `scripts/compile-artifacts.ts` bundles each with esbuild
  into `public/artifacts/<slug>/index.js` + `index.html`; a shared entryStub
  adds an error boundary and posts `{type:'artifact:interacted', slug}` on
  first pointerdown. Embedded via `src/components/ArtifactEmbed.tsx`
  (`sandbox="allow-scripts"`, `heightPx` prop, `bare` mode to suppress the
  card chrome, "Open in full ↗" footer). Host message handlers must gate on
  `event.source === iframe.contentWindow` — the sandbox origin is opaque
  (`'null'`), so origin checks are useless. Opaque origin also means **no
  localStorage inside the iframes** — persistence is host-side by necessity,
  which matches the design.
- **Validation**: `scripts/validate-content.ts` — extend it for every schema
  addition. There is an `artifact-slug-unique` guard; slugs share one flat
  namespace.
- **Tests**: vitest (node env) unit suites + Playwright/chromium against the
  production build (`vite preview`, port 4173). Check `package.json` for the
  exact script names. **No CI exists** — you add it (ruling b).
- **Storage**: zero client-side persistence exists in `src/` today. You are
  introducing the first — host-side only, per §3 below.
- **Newsletter**: `newsletterSignupUrl` in `src/config/site.ts` is `''` and
  the SubscribeCard renders nothing. The v7.3 newsletter placeholder is
  **omitted** (ruling, per brief §4G).

## 3 · Settled architecture — implement as written

### Content schema (all fields optional — other 13 classes keep the minimal template)

Extend `ProblemEssay` (`src/types/problemEssay.ts` + validator + the authored
`content/problems/ambiguous-failure-under-retry.json`):

- `stations[]` — `{id, anchor, label, minutes|null}` — drives the sticky nav
  and time budgets (§4A: budgets from content, not hard-coded).
- `wall` — `{stats: [{value, label, source}], figureSlug}` — stat strip +
  noscript figure.
- `tryIt` — `{artifactSlug, teaser, caption}`.
- `mission` — `{artifactSlug, teaser}` — presence drives the /problems list
  Playable badge + teaser (§4F). **No `estimateMin` field**: the displayed
  estimate is computed — sum `stations[].minutes` through DECIDE, round **up**
  to the nearest 5 (3+15+10+5 = 33 → "~35 min"). Wall #2 then gets it free.
- `comparison` — `{spectrum, diagramRows[], matrixRows[], questions[]}` —
  including the YOU row copy and **both** YOU empty states verbatim.
- `decide[]` — `{if, then}`; `steal[]` — `{rule, text, qref}`;
  `interview` — `{asks[], shape, followups[], redFlags[], closing}`;
  `sources[]`.

The shell renders whatever fields exist; it must not hard-code the six
decisions, five attacks, or payments domain (brief §3).

### Wall module

`youMapping()` is a frozen function and lives with the wall, not the shell:
create `src/walls/ambiguous-timeouts.ts` exporting `youMapping` ported
verbatim from Script 3 plus the wall's attack-phrase/held constants, and a
`src/walls/index.ts` registry `wallBySlug` keyed by cruxTag. The shell looks
the module up; a class without a wall module simply has no YOU behavior.

### Artifacts

Two new artifacts in `content/artifacts/`:

- `problem-ambiguous-timeouts-tryit.jsx` — Script 1 + its markup/styles.
- `problem-ambiguous-timeouts-mission.jsx` — Script 2 (engine + cue system +
  commit box + toast + in-artifact scroll hints), emitting protocol messages.

Both wrap the **verbatim** vanilla engines in a thin React shell: render the
markup once, boot the engine in `useEffect`, touch none of the frozen code.
Do not extend the pipeline for non-React artifacts and do not rewrite the
engines in React idiom. Register both under a `problem` ContentHost kind so
`content/problems/<cruxTag>.json` carries artifacts the way articles do
(follow the existing ContentHost registry pattern). Inline styles use the
house palette values (taste doc / changelog §1) — the `src/` no-hex rule
applies to `src/`, not to artifact sources, but stay inside the `#08090D`
family and the changelog token values exactly.

Embed both at 960px breakout width (equal widths — changelog §6), `bare`
mode so the mission draws its own `#artB` frame without double-framing.

### postMessage protocol v1 (final, as ruled)

Exactly the brief §3 schema with these approved amendments:

- mission→host: `ready`, `state` (`{v:1, wall, type:'state',
  decisions:{id,mem,read,cli,rep,ret,params?,after?}, held:[bool×5],
  survived:bool, bill:[{c,s,base?}]}`), `checkpoint`
  (**kinds stay exactly `caused` / `survived` / `held`** — the ledger
  contract), `commit`, plus two new types:
  - `{v:1, wall, type:'touched'}` — first deck interaction. **Its own message
    type, not a checkpoint kind** (owner ruling: checkpoints are what paths
    and the future account merge count; first-touch is UI state). Do **not**
    reuse the entryStub's `artifact:interacted` for this — it fires on any
    pointerdown including RUN.
  - `{v:1, wall, type:'size', h}` — content height; host clamps and applies
    to the iframe (drives the ≥700px sizing below).
- host→mission: `init` with the stored commit. **No `reducedMotion` field**
  (ruling d): the mission reads `matchMedia('prefers-reduced-motion')` itself,
  as v7.3 already does.
- `wall` is the cruxTag. Ignore messages with `v !== 1`. Gate everything on
  `event.source === iframe.contentWindow`.

### Mission iframe sizing (ruling a — approved with a guard)

- `<700px` viewport: mission iframe height ~`90dvh` with **internal
  scrolling** — the iframe becomes the scrollport, so the sticky `.ctlrow`
  RUN bar, the damage toast, and scroll-to-`#log` work exactly as designed
  (they use `window.scrollTo` — which inside the iframe is the iframe's
  window).
- `≥700px`: content-height iframe via the `size` message; no internal scroll.
- **Guard**: do NOT set `overscroll-behavior: contain` (or anything else that
  stops scroll chaining) on the mission document. At the iframe's top or
  bottom, page scroll must continue under the finger. Add a Playwright mobile
  check for scroll chaining (see §6).
- The fallback (host-rendered sticky control bar driving the mission via a
  `command` message) is explicitly **not to be built** now.

### Host side (in ProblemDetail, client-side effects)

- Script 3 rewritten as the `state`/`checkpoint`/`commit`/`touched`/`size`
  message listener: feeds `youMapping` → YOU table cells, diagram slots,
  interview ticks (single source — changelog §6); persistence; sends `init`
  on `ready`.
- Script 4's host half: scroll-spy (IntersectionObserver — **use the file's
  `rootMargin: -20% 0px -70%`**, not the changelog's −40%/−55%; the file wins
  per the brief — note the discrepancy in the PR), deck-jump `#navdeck`
  reveal on `touched` (anchor scroll targets the iframe wrapper, since
  `#artB` is inside the iframe), matrix/interview scroll hints, phone nav
  behavior. No hash writes, no `scrollIntoView` anywhere.

### Storage

One record per wall: `localStorage['bs:wall:<cruxTag>']` →
`{commit, checkpoints: {caused, survived, held}, lastDecisions}`. Written on
`commit`/`checkpoint`, read at mount, passed via `init`. Wrap access in
try/catch (private mode). The prototype's `bs_commit_ambiguous_timeouts` key
is dead — nothing to migrate.

### Fonts (ruling c)

Fallback mono stack in both artifacts (matching every shipped artifact) — do
not load JetBrains Mono in the iframes (runtime fetch). Record it in the PR
as a visual deviation from the reference. The type rules (12.5px,
`max-width: 68ch` for long mono prose) were tuned on JetBrains Mono —
**verify the debrief and narrator line still fit at 390px** with fallback
metrics and adjust nothing frozen; if something clips, report it in the PR
rather than changing copy or rules.

### CI (ruling b)

Add a GitHub Actions workflow in this PR: content validation + vitest on
every push. Include the Playwright suite in the same job if the whole run
stays under ~5 minutes; otherwise put Playwright in a nightly `schedule` job.
There is no other CI.

### ui-context.md (same PR)

Add every named token from changelog §1: `--art-border-interactive #3a4158`
(buttons/inputs only), `--art-text-bright #EDEFF3`, `--art-red/-amber/-green
#ef4444/#eab308/#22c55e` (dark surfaces only), `--accent-problem(-hover)
#D946EF/#E879F9` (interactive + attention cues + the BUILD IT badge; never
the light shell), `--hot-border #EAD9C2` / `--hot-bg #FBF4EA` / `--bar-fill
#E9E2D6`. Record the `#08090D` family as canonical. **Do not add the
changelog's `#0b0d12` deprecation line** — `#0b0d12` exists in zero shipped
artifacts (only in `docs/design-spec.md`). Instead describe the drift that
actually exists: 40 artifacts on the taste-doc literals
(`#111118/#0c0d13/#2a2a3a`), 22 on the `--art-*` family
(`#0F1118/#161922/#1F2333`), all under `#08090D` roots; migrate per artifact
at next touch. (Owner ruling — this supersedes changelog §1's ui-context
instruction where they differ.)

## 4 · Frozen surfaces — do not touch

Brief §2 in full, but the ones people break: **all copy** (the §5.4 test
diffs text; only the three §4G decisions may differ), the RULES block /
`dayTokens()` (576 decks → exactly 12 clean, bills matching DECKS-v6-1.md
line for line), GROUPS/LEVELS/`buildDebrief()`/`youMapping()`, the single
`#artB[data-cue]` attribute cue system (never re-add `.attn`/`.attng`
per-element pulses), motion rules (900ms real-time dbl dwell never divided by
speed; kill-mark floor `max(800, 1400/speed)`; reduced-motion beats not
speed-divided; `shake` inside the reduced block), layout rules (sticky RUN +
toast <700px only; GH/GV dual geometry with ONE shared animation script —
never fork per breakpoint; 680px column / 960px artifact breakouts), the bill
BASELINE convention, the commit-box grammar, both YOU empty states verbatim,
no `scrollIntoView` anywhere. Changelog §6 is the checklist.

**§4G — already-taken copy decisions** (the only sanctioned text diffs):
vantage line "Your design"; the new try-it caption sentence ("The three cut
points are the artifact's three cuts; the three places the key's memory can
live are question 2 below."); nav INTERVIEW gets `· 5 MIN`.
**Do not port**: FREE PLAY (`#freebtn`/`#freenote`/`?free`), proto-notes, the
newsletter placeholder, the RULES-START comment header text.

## 5 · Build order and commit split

One branch, one PR. Commits split per the brief — shell / try-it / mission /
host / list / tests — with CI, ui-context.md, and context-file updates folded
into the commit they belong to (CI with tests; docs with shell or a final
docs commit). Match the repo's commit style (`feat(...)`, `fix(...)`,
`content(...)`, `docs(progress)` — see `git log`). **No Co-Authored-By
trailer** (standing owner preference — overrides any default).

Suggested order (each stage leaves the repo green):

1. **Shell** — schema + validator + authored content JSON + wall module +
   ProblemDetail rich rendering (all sections prerendered, stations-driven
   nav, computed estimate, stopblock in page flow, noscript figure, diagram
   defaults Stripe+YOU open) + prerender/JSON-LD untouched routes still pass.
2. **Try-it artifact** — Script 1 port + embed + caption.
3. **Mission artifact** — Script 2 + cue system + commit box + protocol
   emission + sizing/scroll model.
4. **Host** — listeners, persistence, YOU column/diagram/ticks, scroll-spy,
   deck-jump, scroll hints.
5. **List** — /problems Playable badge + teaser + computed estimate,
   data-driven off `mission` presence.
6. **Tests + CI** — the §5 suite + workflow.

Before the PR: run the full local gate — content validation, artifact
compile, build + prerender, vitest, Playwright (exact script names in
`package.json`) — and the taste-doc headless artifact checks (esbuild parse,
comma-operator grep) for both new artifacts.

## 6 · Tests (§5.1–5.6, approved mapping)

Copy `problem-page-v7.3.html` and `DECKS-v6-1.md` into a committed fixtures
directory (e.g. `tests/fixtures/`) — §5.1 and §5.4 assert against them.

1. **§5.1 rules parity** (vitest, node): port `dayTokens()` as a
   dependency-free pure function used by the mission artifact AND importable
   by the test; enumerate all 576 decks; assert exactly 12 clean; diff each
   clean deck's bill line-for-line against DECKS-v6-1.md. Runs in CI.
2. **§5.2 click-through** (vitest, jsdom + fake timers): adapt
   `handoff/repo-brief/headless-tests/clickthrough-default.mjs` against the
   compiled mission bundle's DOM — naive day → AWS deck (`ret:'ever'`) →
   commit → A1–A5 → debrief. Fake timers make the real-time dwells fast, as
   the prototype script already did (setTimeout/200, rAF fake clock). Plus
   ONE Playwright test for what jsdom can't do honestly: the real iframe
   round-trip — `ready` → `init` → play → `state` → YOU column fills →
   `commit` → reload → persistence restores.
3. **§5.3 cue exclusivity**: in the jsdom suite, assert `#artB[data-cue]` is
   exactly one of `run|deck|group|""` at every transition, and that no
   `.attn`/`.attng` class exists anywhere in the bundle.
4. **§5.4 text parity** (Playwright): extract `innerText` of the served page
   including both iframes; extract the same from the fixture v7.3 file; diff.
   Allowlist: the three §4G decisions and the excluded blocks (FREE PLAY,
   proto-notes, newsletter, design notes). Any other diff fails.
5. **§5.5 no-JS** (Playwright, `javaScriptEnabled: false`): the prerendered
   copy renders; each iframe position shows its `<noscript>` one-line
   fallback; the noscript figure shows.
6. **§5.6 prerender** (node): grep three known sentences from
   `dist/problems/ambiguous-timeouts.html` after a build.
7. **Scroll-chaining guard** (Playwright, mobile viewport 390px — ruling a):
   with the mission iframe scrolled to its bottom edge, a further scroll
   gesture moves the page; same at the top edge scrolling up. Also assert the
   mission document computes no `overscroll-behavior: contain`.

## 7 · Deliverables (brief §6) and PR description

- Screenshots at 1440 / 1024 / 390 of the eight states listed in brief §6.
- **PR description leads with the §5.1–§5.6 test output**, then the list of
  decisions the brief didn't specify that you made (owner instruction), then:
  the brief-vs-file discrepancies found (at minimum the scroll-spy
  rootMargin), the fonts visual deviation, the content schema documentation.
- Update `context/progress-tracker.md` (implementation entry) and
  `context/open-decisions.md` (nothing new open unless you surface one — if
  an unspecified decision feels owner-facing, add it there rather than
  guessing silently).
- Do not commit the stray `*.zip` files in the repo root.

## 8 · If you get stuck

- Prototype wins over brief; brief wins over changelog prose; this document's
  §3 rulings win over all three where they conflict (they are the owner's
  answers to the Step 1 report, dated 2026-09-06).
- If something genuinely cannot be built without breaking a frozen surface
  AND isn't covered by a ruling here, stop and report it with the reason —
  exactly as Step 1 did — rather than improvising a fix on a frozen surface.
