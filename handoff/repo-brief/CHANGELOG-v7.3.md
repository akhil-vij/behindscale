# CHANGELOG — problem page v7.3 (design pass over v7.2)

Reference: `problem-page-v7.2.html` → `problem-page-v7.3.html`. Decisions and rules,
not edits. R-numbers match the in-file comments and `v7.2 Review` (2026-09-05).
Frozen surfaces untouched: rules block, attack engine, element ids, all copy,
free-play controls (`#freebtn` / `#freenote` / `?free` — prototype-only, not ported).

## 1 · Token table

| Token | Old | New | Why |
|---|---|---|---|
| `--art-bg/-surface/-surface-2/-border/-text/-muted` | declared, unused (hex hardcoded) | actually referenced everywhere | Unused vars are how drift happens; zero visual change (R6 root cause) |
| `.billpanel` colors | `#0e1017` / `#262b3d` | `var(--art-surface)` / `var(--art-border)` | Only true palette drift on the page — two values in no family (R6) |
| `--art-border-interactive` | unnamed `#3a4158`, dual-use | named; **buttons/inputs only** | Stage nodes shared it and read as tappable (R1) |
| `.nodebox` / `.ghostbox` stroke | `#3a4158` | `var(--art-border)` `#1F2333` | The display stage must not claim affordance (R1). Includes the `flashServer()` reset literal |
| `--art-text-bright` | unnamed `#EDEFF3` | named | Bright titles + bill BASELINE line (v5 registry follow-up) |
| `--art-red/-amber/-green` | unnamed `#ef4444/#eab308/#22c55e` | named | Dark-side verdict set, brighter than light-shell semantics for contrast on `#08090D`. Rule: never on light surfaces |
| `--accent-problem(-hover)` | unnamed `#D946EF/#E879F9` | named | Problem-class magenta. Usage rule: interactive + attention cues + the BUILD IT badge; never the light shell |
| `.a-eyebrow` color | `#D946EF` | `var(--art-muted)` | Non-interactive magenta broke "magenta means clickable" (R7). Badge = the one sanctioned exception |
| `--hot-border/-bg`, `--bar-fill` | page-local | unchanged values | Correct; needs registry entry only |

**ui-context.md:** add all names above (none exist under other names); record the
`#08090D` family as canonical (v5 ratification 2026-08-29) and the old `#0b0d12`
hero/article family as deprecated-migrate-at-next-touch. No third family.

## 2 · The cue rule

One attention cue at a time, enforced by construction: a single attribute on the
artifact root, `#artB[data-cue]`, values `"run" | "deck" | "group" | ""`.

- `run` → `.runbtn` pulses (runpulse 1.4s) — set on load and whenever a re-run is the
  next step; cleared the moment a run starts.
- `deck` → `.deck` pulses (deckpulse 1.6s) — set when the first day finishes; cleared
  on first deck interaction (the `touched` flag).
- `group` → `.kg.cue-target` pulses — set by `escStart` (the attacked group also gets
  `.cue-target`); cleared by `escExit` / `escAbandon`.
- `""` → nothing pulses (mid-run).

Who sets it: only the run lifecycle (`runAll`/`finishDay`), the deck click handler,
and the three esc functions. Never two values — it's one assignment. One-shot
feedback (`gflash`, `sflash`, `shake`, ≤1.1s) stays class-based and exempt, but must
not fire on the panel `data-cue="group"` is animating. **Never re-add the old
`.attn` / `.attng` class pulses** — any element-local looping pulse reintroduces the
two-cues bug structurally.

## 3 · Motion decisions

- Travel 500ms ease-in-out-quad; into-server 220ms; server→bank 380ms; reply 480ms;
  verdict ease 380ms translateY(5px→0); sweep/server flash 700ms one-shot. All kept
  from v7.2 — they were right.
- **`stampin`**: every bank stamp enters at 140ms scale(1.15→1) ease-out. Rejected a
  slower/blurred entrance: the stamp must read as a ledger event, not a celebration.
- **Dwell rule:** `dbl` stamps hold ≥900ms of REAL time before the next event line —
  never divided by `speed`. Mirrors the kill-mark floor `max(800, 1400/speed)`. The
  failure beat is now the slowest, clearest frame (R3).
- **2×** divides travel and inter-event sleeps only; stamps, kill marks, and dwells
  are speed-invariant.
- **Reduced motion:** instant placement, pulses off (unchanged), plus two fixes:
  `shake` is now inside the reduced block (it's a real translation), and text/narrator
  beats are NOT divided by `speed` (reduced + 2× previously compounded to 150ms
  beats). STEP stays the promoted magenta control (protected).
- Rejected: animating the bill rows in sequence — the bill is a receipt read after
  the day, not a second timeline.

## 4 · Layout & behaviour

- **Scroll-spy (R5):** IntersectionObserver, `rootMargin: -40% 0px -55%` (a section is
  "current" when it crosses the upper-middle band); current station gets ink +
  weight 600. No hash writes.
- **Deck-jump reveal (R5):** "↑ your decisions" hidden until the first deck
  interaction (`touched`) — it's a claim about state, shown only once state exists.
- **Scroll hints (R11):** `.matrix-wrap` and `.anat-scroll` get a right-edge fade
  whenever content overflows, plus a one-time "⟷" hint cleared on first scroll of
  that container. Matrix + interview table: sticky first column (opaque bg) under
  700px — chosen over stacked view, which would explode 7×6 into ~40 blocks and
  destroy row comparison.
- **Attack-added row tags (R20):** when `ROWS_ADDED.params/.after` flips, the new
  `.kg` renders a mono `ADDED BY ATTACK 4/5` tag in `var(--art-amber)`; removed at
  that attack's `escExit`. The deck now says what the narrator says.
- **Damage toast (R4):** <700px only; when `card()` fires mid-run, the card's first
  line docks as a one-line toast under the sticky `.ctlrow`; tap scrolls to `#log`
  (via `window.scrollTo` — `scrollIntoView` also removed from the knob-jump);
  replaced by the next card, cleared at day end.
- **Phone nav (R17):** single row, nowrap, `overflow-x: auto`, right-edge mask; the
  `· N MIN` budgets hide on phone via a span wrapper (strings untouched).
- **YOU column/diagram (R8):** neutral ink — magenta fails contrast on the light
  shell (~3.5:1 at 11.5px) and isn't clickable. Ownership via `1.5px` left rule
  (`--border-2`) + `--surface` tint: the same special-row grammar as `tr.hot`.
  Pre-day ticks "—" get `.nstext` + `title="runs after a survived day"` (R19).
  "Who calls" dim cell: ink + weight 600, this row only (R12).
- **Type (R13, R14):** `.esc-head` renders as label ("FIVE ATTACKS") + sentence-case
  body via CSS `text-transform` on span wrappers — characters unchanged. Long mono
  prose (`.debrief`, `.narr`, `.lvl .lq`, locked-sentence echo) → 12.5px,
  `max-width: 68ch`. Rule: in dark artifacts, any string >~120 chars gets both.
- **Spectrum (R16):** end-label translation clamped to the container box.
- **Stopblock (R2):** moved out of `#artB` into the 680px page flow — it now reads
  as the page-level pause it is, in Inter.
- **Diagram defaults (R10):** Stripe + YOU rows `open`; AWS/Airbnb/Shopify/Segment
  closed — the empty-state promise stays visible, the pre-table wall shrinks ~600px.

## 5 · Deliberately not fixed

- **R9** — "You · now · You" vantage duplication: copy frozen; owner decision.
- **R15** — fig-cap pointing at the JS-hidden noscript figure: copy frozen; owner
  decides render-for-all vs amend the string in the next content pass.
- **INTERVIEW's missing `· N MIN`** in the nav: copy; owner decision.
- **A1's engine behavior** (deliberately unfixable attack) and all rules-block
  outcomes: frozen by brief.
- **Old `#0b0d12` family in other shipped artifacts:** out of this file's scope;
  migrate per artifact at next touch (§1).

## 6 · Protect in the port

- The single `data-cue` attribute — do not "refactor" back into per-element classes.
- Dwells and kill-mark floors in real time — never divided by `speed`.
- Reduced-motion text beats never speed-divided; `shake` stays inside the reduced block.
- The toast exists only <700px; desktop keeps cards-in-log only.
- `youMapping()` as the single source for table cells, diagram slots, and ticks.
- Both YOU empty states verbatim; every "not stated" dashed-gap treatment.
- The bill BASELINE convention; commit-box grammar (magenta Lock it in, underlined
  Skip, gated on a survived day); reduced-motion STEP promotion.
- GH/GV dual geometry with one shared animation script — never fork per breakpoint.
- 680px column / 960px artifact breakouts, both artifacts equal width.
- No `scrollIntoView` anywhere — keep the `window.scrollTo` replacements.
