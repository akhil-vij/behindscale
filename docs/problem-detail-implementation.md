# Problem Detail Page — Runtime Implementation

How the `/problems/<slug>` page actually renders, how its interactive
artifacts talk to the page, how a reader's "survive the day" design is saved
and compared, the viewport problems we hit and how we solved them, and what
you reuse when you build the next wall.

This is the **implementation** companion to two existing docs — read those
first for *what* and *how-to-author*:

- `docs/problem-page-design.md` — the content contract (routing, section
  contract, `ProblemEssay` data model, invariants, validator, SEO).
- `docs/authoring-problem-pages.md` — the authoring workflow (write a lede,
  grow a page richer over time).

This doc is about the *machinery*: components, the iframe protocol,
persistence, and the layout engineering.

---

## 1. The three planes

A problem page is built from three layers that never share memory directly.
Keeping them separate is the whole design; every hard problem below comes from
respecting the boundary between planes 2 and 3.

```
┌─────────────────────────────────────────────────────────────┐
│ PLANE 1 — the static shell (prerendered HTML + light theme)  │
│   Prose, tables, the comparison diagrams, the nav.            │
│   No network at runtime. Renders fully with JS off.          │
│                                                              │
│   ┌───────────────────────────────────────────────────┐     │
│   │ PLANE 2 — host React (client-only effects)         │     │
│   │   useWallHost: protocol, persistence, scroll-spy,  │     │
│   │   iframe sizing. Fills the YOU column when a design │     │
│   │   survives. Never touches an artifact's internals. │     │
│   │                                                     │     │
│   │   ┌─────────────────────────────────────────────┐  │     │
│   │   │ PLANE 3 — sandboxed artifacts (iframes)      │  │     │
│   │   │   The mission and the try-it. Their own React│  │     │
│   │   │   copy, dark theme, opaque origin. Talk to    │  │     │
│   │   │   plane 2 ONLY through postMessage.           │  │     │
│   │   └─────────────────────────────────────────────┘  │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- **Plane 1** is generated at build time (`scripts/prerender.ts`) and served
  as static HTML. Everything a search engine or a no-JS reader sees lives
  here — including the comparison diagrams (inline SVG) and no-JS fallbacks.
- **Plane 2** is React that hydrates on the client. It runs *effects only* —
  the first client render must match the server HTML byte-for-byte (empty YOU
  column, default frame heights) so hydration doesn't mismatch.
- **Plane 3** are `sandbox="allow-scripts"` iframes with an **opaque origin**.
  The parent cannot read their DOM and they cannot read the parent's. The only
  channel is `window.postMessage`. This is a hard security boundary
  (`architecture.md` invariant 2), and it is the source of the sizing and
  sticky-scroll problems in §7.

---

## 2. Component / file map

The page is **one template that renders every problem class**
(`ProblemDetail.tsx`). Blocks render *when present* in the class's essay; a
class with only a lede renders a minimal page, a fully-authored class (like
`ambiguous-timeouts`) renders every block. There is no starter/full switch.

| Concern | File | Notes |
|---|---|---|
| Page template | `src/pages/ProblemDetail.tsx` | Resolves the route, composes sections, owns the host hook |
| Station nav | `src/pages/problem/StationNav.tsx` | Sticky in-page nav + scroll-spy |
| Wall + try-it | `src/pages/problem/WallSection.tsx` | Prose, the try-it artifact embed, no-JS figure, stats |
| Mission | `src/pages/problem/MissionSection.tsx` | The "build it" artifact embed + static outline + stop block |
| Comparison ("hint sheet") | `src/pages/problem/ComparisonSection.tsx` | Spectrum, diagram strip **+ the YOU row**, matrix **+ the YOU column**, full answers |
| Decide / Steal / Interview | `src/pages/problem/GuideSections.tsx` | Interview table carries live per-attack ticks |
| Host logic | `src/pages/problem/useWallHost.ts` | **The heart of plane 2** — protocol, persistence, sizing, scroll-spy |
| "Which answer is yours" highlight | `src/pages/problem/useDecideHighlight.ts` | Lights the matrix column(s) for a selected decide row |
| YOU state shape | `src/pages/problem/youState.ts` | `{ filled, cells, held, commit }` |
| Inline prose renderer | `src/pages/problem/inline.tsx` | `pp()` — links, bold, etc. (`.pp-link` in-prose links) |
| The iframe wrapper | `src/components/ArtifactEmbed.tsx` | One sandboxed iframe + failure isolation + the message gate |
| Per-wall CODE | `src/walls/index.ts`, `src/walls/<wall>.ts` | `youMapping()` + `attackCount`, looked up by `cruxTag` |
| Per-wall DATA | `content/problems/<cruxTag>.json` | The `ProblemEssay` |
| Per-wall SVGs | `content/problems/<cruxTag>/*.svg` | Comparison diagrams (h + v), YOU diagram (empty/filled) |
| The artifacts | `content/artifacts/problem-<wall>-mission.jsx`, `-tryit.jsx`, `-rules.js` | Interactive engines (plane 3) |
| Shell CSS | `src/pages/problem-page.css` | All light-shell styling, scoped under `.problem-page` |
| Tokens | `src/index.css`, `tailwind.config.js` | Colour tokens (no hex in `src/`) |

### 2.1 Routing & lookup

The public URL is a **human slug** (`/problems/ambiguous-timeouts`); the
internal key is the **cruxTag** (`ambiguous-failure-under-retry`). The cruxTag
is the join key for *everything* — content file, SVG folder, storage key, wall
module.

```
urlSlug ──cruxTagByUrlSlug──▶ cruxTag ──┬─ problemEssayByCruxTag ─▶ ProblemEssay (content JSON)
                                        ├─ wallBySlug ────────────▶ WallModule (youMapping)
                                        ├─ problemSvgByKey `${cruxTag}/${name}` ─▶ inline SVG
                                        └─ localStorage['bs:wall:<cruxTag>'] ─▶ saved design
```

(`src/content/index.ts` builds the first three maps; the registry entry in
`cruxtags` carries the `urlSlug`.)

---

## 3. The artifacts (plane 3)

Three artifacts appear on/around a problem page:

- **Mission** (`problem-<wall>-mission.jsx`) — "build the defense": the reader
  makes the wall's decisions, runs a day of traffic, then survives five
  attacks. This is the interactive core.
- **Try-it** (`problem-<wall>-tryit.jsx`) — "cause the failure": a small
  what-if that lets the reader break the naive system.
- **Hero** (e.g. `priority-aware-load-shedding.jsx`) — the landing-page demo.
  Same embed machinery, no protocol beyond posting its height.

### 3.1 Build: how a `.jsx` becomes an iframe

`scripts/compile-artifacts.ts` bundles each artifact **standalone** with
esbuild (its own React copy) into `public/artifacts/<slug>/index.html`. Each
bundle is wrapped by an `entryStub` that:

1. mounts the artifact inside a top-level **ErrorBoundary** (a render
   exception shows a muted message *inside the frame*, never a white screen);
2. posts `{type:'artifact:interacted', slug}` to the parent on first
   pointerdown (analytics).

The compile is idempotent and per-artifact isolated: one artifact failing to
build does not break the others (invariant 2).

### 3.2 The "frozen engine + bridge" pattern

The mission and try-it were ported from an approved standalone prototype
(`problem-page-v7.3.html`). To keep that behaviour trustworthy, each artifact
is split in two inside its `.jsx`:

- **`bootEngine()`** — the prototype's logic, *verbatim*: the deck, the stage
  geometry, the animations, the run/attack control. It observes and mutates
  its **own** DOM. Treated as frozen; changes are sanctioned edits, documented
  in the file header (search "Sanctioned edits").
- **`bootBridge(engine)`** — the port-specific glue. It **observes** the
  engine's DOM (MutationObservers, never patches it) and translates DOM state
  into `postMessage`s to the host; it also applies the *one* host→engine call
  that mutates state (`engine.restore(...)`). This is where the protocol lives
  on the artifact side.

The React shell is tiny: render the markup once, then
`useEffect(() => { const engine = bootEngine(); return bootBridge(engine) })`.

> **Why "observe, never patch":** it lets the frozen engine stay byte-for-byte
> the prototype while the bridge adds host integration around it. If you build
> a new wall, you inherit this split for free — write your engine, then the
> bridge pattern already knows how to talk to the host.

---

## 4. The iframe ↔ page protocol (v1)

Every message is `{ v: 1, wall: <cruxTag>, type, ... }`. Both sides gate hard:

- **Source gate (parent):** `ArtifactEmbed` only accepts messages whose
  `event.source === iframe.contentWindow`. Origin checks are meaningless —
  the sandboxed frame's origin is the string `"null"` — so the *source* is the
  pin.
- **Wall + version gate:** both sides ignore anything with `v !== 1` or the
  wrong `wall`, so two artifacts on one page never cross-talk.

`ArtifactEmbed` is the single door: it renders the iframe, runs a HEAD
availability probe (with one retry + an 8s proof-of-life grace for protocol
artifacts), converges every failure to one muted error frame, and forwards
gated messages to `onMessage(data, reply)`. `useWallHost` supplies
`onMessage`.

### 4.1 Messages

**Mission → host**

| Message | Meaning |
|---|---|
| `ready` | "I've booted." Announced on a backoff until the host answers. |
| `state {decisions, held, survived, bill}` | The current design. `decisions` = flat record of choices; `held` = one bool per attack; `survived` = has the design survived a day. Coalesced per tick. |
| `checkpoint {kind}` | `caused` / `survived` / `held` — write-once booleans (an account-merge signal). |
| `touched` | First deck interaction (reveals the nav's "↑ your decisions" jump). |
| `commit {text}` | The reader's locked-in one-sentence rationale. |
| `size {h}` | Content height, used in content-height sizing mode. |
| `anchor {id}` \| `anchor {frame:{top,height}}` | Scroll the page to a host `#id`, or to a region of the frame (the "→ the decision" jump). |
| `reset` | The reset button — clear the saved design, keep the commit + checkpoints. |

**Host → mission**

| Message | Meaning |
|---|---|
| `init {commit, decisions, survived, held}` | The reply to `ready`. Carries the stored commit and, if a **survived** design was saved, the decisions to restore. |

`init` is the **only** host→mission message that mutates engine state: the
bridge calls `engine.restore(decisions, true, held)` (rebuild the survived
design *without animating*), then `emitState()`. Every other host touch is
observe-only.

**Try-it → host:** `size` only. **Hero → host:** `artifact:size {h}` (a
lighter, wall-agnostic variant used by the landing page). **Any artifact →
host:** `artifact:interacted` (analytics, handled by `ArtifactEmbed`).

### 4.2 The handshake

```
mission boots ──ready──▶ host
                          │ (reads localStorage for this wall)
      mission ◀──init─────┘  {commit, decisions?, survived, held?}
        │ if survived+decisions: engine.restore(...) then emitState()
        └──state──▶ host ──▶ youMapping() ──▶ YOU column/diagram/ticks fill
```

The `ready` announcement retries on a backoff because the host's listener may
attach *after* the frame boots (cached assets hydrate late). `size` is
similarly re-posted on a short schedule.

---

## 5. Save the day: persistence & comparison

This is the payoff: a reader makes decisions, survives a day, and their design
becomes the sixth column in the comparison — persisted across reloads.

### 5.1 Storage shape

One record per wall, `localStorage['bs:wall:<cruxTag>']`:

```ts
interface WallRecord {
  v: 1
  commit?: string                                   // the reader's sentence
  checkpoints: { caused; survived; held }           // write-once; reset never clears
  saved?: { decisions; survived; held }             // the RESTORABLE design; reset clears
}
```

Two distinct notions, deliberately separate:

- **`checkpoints`** — write-once booleans. "Has this reader ever caused a
  failure / survived a day / held all attacks." The signal a future signed-in
  account merge would count. `reset` never touches them.
- **`saved`** — the *restorable* design (decisions + which attacks held).
  `reset` clears it. Legacy records that stored `lastDecisions` migrate into
  `saved` on read (`normalizeSaved`).

All access is `try/catch` (private mode / quota) — persistence is best-effort;
the page never depends on it.

### 5.2 The state flow

```
reader clicks a deck option
   └─ engine updates its own K (decisions), redraws
   └─ bridge MutationObserver fires ──state {decisions, held, survived}──▶ host
        └─ useWallHost.onMissionMessage 'state':
             ├─ persist saved (only when survived; else drop saved, keep commit)
             └─ setYou({ filled: survived, cells: youMapping(decisions, held), held })
                  └─ ComparisonSection re-renders:
                       ├─ YOU matrix column  ← cells[row.id]
                       ├─ YOU diagram (SVG)  ← fillSlots(youFilledSvg, cells)
                       └─ interview ticks    ← held[i]
```

### 5.3 `youMapping()` — the one per-wall function

`src/walls/<wall>.ts` exports `youMapping(decisions, held)`, the **single**
translation from mission state to display strings. It returns a flat
`Record<string,string>` whose keys are:

- the `comparison.matrixRows[].id` values (fills the YOU **table** cells), and
- the `{{slot}}` placeholders in the YOU **diagram** SVG (`dKey`, `dState`,
  `dRep`, `dBreaks`).

The shell fills **by key** and knows nothing about payments, "six decisions",
or "five attacks". That ignorance is what makes the shell reusable (§8).

```ts
// e.g. ambiguous-timeouts:
youMapping(K, held) => {
  state: 'With the work, one commit, master only',   // matrix row id "state"
  crash: "Can't half-happen",                        // matrix row id "crash"
  breaks: notHeld.join(' · '),                        // matrix row id "breaks"
  dState: 'WITH THE WORK, ONE COMMIT, MASTER ONLY',   // {{dState}} in you-filled.svg
  ...
}
```

The YOU diagram is inline SVG with `{{token}}` placeholders; `fillSlots()`
(in `ComparisonSection.tsx`) substitutes them (HTML-escaped).

### 5.4 Restore & reset

- **Restore (reload):** on `ready`, if `saved.survived`, the host replies
  `init` with the decisions; the bridge calls `engine.restore(...)` to rebuild
  the survived state without animating (attacks revealed, "RESTORED"
  narration), then emits state so the YOU column refills.
- **Reset:** the engine's reset button restores naive decisions and posts
  `reset`; the host drops `saved` (YOU column empties) but keeps `commit` and
  the write-once `checkpoints`.

---

## 6. Sizing: how tall is the iframe?

An iframe has no intrinsic height; the host must set it. There are two modes,
and which one an artifact uses is the root of the desktop sticky problem (§7).

- **Content-height mode:** the artifact posts `size {h}`; the host sets the
  iframe to `h`px and the **host page** scrolls. No internal scroll.
- **Scrollport mode:** the host gives the iframe a **bounded** height
  (≈ viewport); the artifact's own document scrolls inside it. Required for
  `position: sticky` to work *inside* the frame.

`useWallHost` picks the mode from the frame's **own width** (so the frame and
host never disagree about the breakpoint):

| Surface | < 700px (phone) | ≥ 700px (desktop) |
|---|---|---|
| Mission | content-height (page scrolls) | **scrollport** `min(content, 100dvh − 56)` (sticky column) |
| Try-it | content-height | content-height |
| Hero (landing) | content-height (`min 380`) | content-height (`min 380`) |

The mission's model is **inverted from the reference build**: pre-Batch-1,
phone was the scrollport and desktop was content-height. §7 explains why.

---

## 7. Viewport challenges (and how we solved them)

The "Batch 1" layout work (spec: `handoff/Batch 1 Layout Spec.pdf`) fixed a
browser audit. Each item below is *problem → constraint → solution*; the
constraint is almost always the plane-2/plane-3 boundary.

### 7.1 The stage kept scrolling out of view (F1/F2 — §1)

**Problem.** On desktop the reader made a decision in the deck, but the stage
(where the result animates) had scrolled away — and a phone "damage toast" was
patching over it.

**Constraint.** The deck and the stage are *both inside one sandboxed iframe*.
The obvious fix — make the stage a `position: sticky` sidebar — only works if
there is a scroll container **in the same document**. CSS `sticky` cannot
reference the host page's nav across the iframe boundary.

**Solution.** Make the mission iframe a **bounded scrollport on desktop**
(`min(content, 100dvh − 56)`) so its *own* document scrolls, then lay it out as
a two-column grid: the reader's **actions** (deck → commit → attacks → debrief)
scroll in the left column; the run's **outputs** (narration → stage → controls
→ bill → log) live in a right column that is `position: sticky` inside the
frame. The toast is deleted; the log now sits under the stage.

**The compromise we accepted.** The spec said `top: 56px` ("clears the 44px
nav"). Inside the iframe there *is* no nav, so the sticky offset is a small
in-frame gap (12px). When the page is scrolled so the frame's top sits under
the host nav, the nav can cover the frame's top ~44px. Recorded as a known
trade-off; the fallback (a non-sticky two-column layout) is documented, not
built.

**Test that proves it (in numbers).** At 1440×757, after surviving a day,
scroll the left column to attack A5's "watch" — the stage must stay ≥ 80%
visible in the frame (the F1 repro, `tests/e2e/problem-page.spec.ts`). The same
test asserts the frame height is stable frame-to-frame (no resize loop from the
`dvh` recompute).

### 7.2 Two different layouts, one DOM (§1 + §2)

**Problem.** Desktop wants two columns with independent ordering; phone wants
one column in a *different* order (narration → stage → controls → **log → bill**
→ commit → deck → attacks → debrief — note log/bill swap, and commit jumps
above the deck).

**Solution.** Two wrapper `<div>`s (`col-left`, `col-right`) laid out as a CSS
grid on desktop; on phone the grid becomes a flex column and a handful of
`order:` rules re-sequence it (`col-right` first, `#bill` after the log,
`#cmtbox` before the deck). No JS, no duplicated markup.

### 7.3 Phone: the frame trapped the page scroll (F10/F11 — §2)

**Problem.** The old phone mode was a `90dvh` scrollbox — content got trapped,
RUN needed an inner scroll, the meters clipped ("MYS…").

**Solution.** Phone is now **content-height** (the frame is as tall as its
content; the *page* scrolls). The deck collapses to a **one-open accordion**
(new engine state `openGroup`, read by `paintDeck`; desktop ignores it and
shows the full deck). The control row is not sticky and the meters wrap to a
full-width 3-column line. Scroll chaining stays on (no
`overscroll-behavior: contain` anywhere).

### 7.4 Labels landed on top of boxes (F9 — §3)

**Problem.** Transient stage labels ("crash", "seen it ✓", "reply lost") were
drawn at hard-coded coordinates and collided with the diagram's boxes.

**Solution.** Every transient label routes through one `placeLabel(zone)`
helper that returns a slot in a **band** (`GH.bands` / `GV.bands` — one map per
orientation). Bands sit in the gaps between boxes; within an event the 1st/2nd
label take rows 1/2, so collisions are impossible by construction. A test
(MutationObserver) asserts no band label's centre lands inside a node rect, in
both geometries. *(In-box status text like "K-4 ✓" stays in the box — it's the
box's contents, not a floating label; recorded in the file header.)*

### 7.5 Diagrams too wide for phones (F12 — §3b)

**Problem.** The comparison diagrams and the try-it wire are ~640px wide; on a
390px phone they either scroll horizontally or shrink labels to ~4px.

**Constraint.** These are **hand-authored static SVG**, not drawn from a data
model — so a vertical version is *authored*, not generated.

**Solution — a "file drop" switch.** The shell renders a second `.anat-vert`
container per diagram row when a vertical file exists
(`content/problems/<cruxTag>/<name>-v.svg`); CSS shows the vertical under 700px
and the horizontal at/above. Dropping the SVGs needs **no code change**. The
design agent authored the eight verticals (comparison + YOU + try-it) to the
spec's coordinate maps (DV 360×420, TV 360×300). Caveats we hit on drop:

- **Duplicate ids.** Two SVGs with the same internal ids (`you-d-state`,
  `cut1`) confuse `getElementById` / strict-mode locators. Fix: the hidden one
  is `display:none` (out of the a11y tree *and* `innerText`, so labels aren't
  doubled); the YOU vertical's ids were suffixed `-v`; the try-it engine's
  label toggle became id-prefix based so it drives whichever wire is visible.
- **CSS specificity trap.** `svg.stage{display:block}` (0,1,1) silently
  outranks `.stage-v{display:none}` (0,1,0) — the hidden wire stayed visible.
  Fix: `svg.stage.stage-v{display:none}`.
- **The try-it wire is inline** in the jsx (not a content file), so its
  vertical is a second inline `<svg>`, not a file drop.

### 7.6 Muted text failed contrast; nested links (F18 — §6)

`--text-muted` was `#8A8A94` (~3.9:1 — fails AA for text). Split into
`--text-muted: #6E6E78` (text uses, clears 4.5:1) and `--muted-ghost: #8A8A94`
(non-text: decorative dashes, dividers, diagram connectors). In-prose links now
underline at rest; a link inside a `<summary>` moves into the expanded body as
its first line (`Read the article ↗`) so the summary row is one predictable
control.

---

## 8. Building the next wall — what you reuse, what you author

Short answer: **the entire runtime is reusable with zero code changes.** The
lift is *content + one small function*.

### 8.1 Free (shared, wall-agnostic)

- The page template and every section (`ProblemDetail.tsx` + `problem/*`).
- The host hook (`useWallHost`): the whole protocol, persistence, scroll-spy,
  and both sizing modes.
- `ArtifactEmbed`: sandboxing, failure isolation, the message gate.
- All the layout engineering in §7 (sticky column, phone accordion, label
  bands, the vertical file-drop switch, tokens).
- The build/render pipeline (`compile-artifacts`, `prerender`) and the
  `ProblemEssay` validator.
- The "frozen engine + bridge" split — copy it for your artifact.

### 8.2 You author (per wall)

| # | What | Where | Effort |
|---|---|---|---|
| 1 | The essay (all prose, stations, matrix rows, questions, interview) | `content/problems/<cruxTag>.json` | Medium — content |
| 2 | The **mission** artifact (the interactive engine) | `content/artifacts/problem-<wall>-mission.jsx` (+ `-rules.js`) | **High — this is the real work** |
| 3 | The **try-it** artifact | `content/artifacts/problem-<wall>-tryit.jsx` | Medium/High |
| 4 | Comparison diagrams (horizontal SVGs, one per system + YOU empty/filled) | `content/problems/<cruxTag>/*.svg` | Medium — design |
| 5 | Vertical (phone) diagrams | `content/problems/<cruxTag>/<name>-v.svg` | Medium — design (file drop) |
| 6 | **`youMapping()` + `attackCount`** | `src/walls/<wall>.ts` | Low — one function |
| 7 | Register the module | `src/walls/index.ts` (`wallBySlug`) | Trivial |
| 8 | Register the class + `urlSlug` | the cruxtag registry (`src/content`) | Trivial |

The only **code** you write is items 6–8: one `youMapping` module plus two map
entries. Everything else is content/SVG/artifact authoring.

### 8.3 The contract that makes it click

Three names must agree, or the YOU column stays empty:

1. the **keys** `youMapping()` returns,
2. the `comparison.matrixRows[].id`s (table cells), and
3. the `{{slot}}` tokens in the YOU **filled** diagram SVG.

`youMapping` is the seam. Get those three aligned and the reader's design flows
into the comparison automatically.

### 8.4 Gotchas to remember

- **Match the breakpoint (700px) everywhere:** the mission engine's `VERT`
  flag, `useWallHost`'s sizing mode, and the CSS all key off 700px on the
  *frame's own width*. Don't introduce a fourth breakpoint.
- **First client render must equal the server HTML** — do viewport/height
  decisions in effects, not in the initial render (hydration mismatch).
- **Never widen the sandbox.** New capability goes through a new postMessage
  type, never an `allow-*` flag.
- **Keep `youMapping` frozen once shipped** — it's ported verbatim from the
  approved prototype; reword only via a sanctioned edit noted in the header.
- **Text parity is a test.** Adding a visible string to a wall page can break
  the reference-parity e2e; that's intentional — update the test with the one
  new string, don't work around it.
- **Vertical SVGs are a file drop, but mind duplicate ids** (§7.5).

---

## 9. Build & render pipeline (static-by-construction)

```
npm run build:
  validate            # ProblemEssay + content checks
  compile-artifacts   # each .jsx → public/artifacts/<slug>/index.html (esbuild, own React)
  copy-figures        # content SVGs → public
  tsc -b && vite build           # client bundle → dist/
  vite build --ssr ... → dist-ssr
  prerender           # renderToString + StaticRouter → one static .html per route in dist/
  generate-sitemap
```

The page ships as static HTML; React hydrates it on the client and only *then*
does plane 2 attach the protocol. No runtime network fetch, ever
(`architecture.md` invariant 1).

---

## 10. Quick reference — "where do I look when…"

| Symptom | Look at |
|---|---|
| YOU column stays empty after surviving | `youMapping` keys vs `matrixRows[].id` / `{{slots}}`; the `state` handler in `useWallHost` |
| Design doesn't restore on reload | `ready`→`init` handshake; `saved.survived`; `engine.restore` in the bridge |
| Frame is the wrong height / traps scroll | sizing mode in `useWallHost` (`scrollport` vs content-height); `size` posting in the artifact |
| Stage scrolls away on desktop | the sticky `.col-right` + the scrollport height (§7.1) |
| Label overlaps a box | `placeLabel` / `GH.bands` / `GV.bands` (§7.4) |
| Vertical diagram not showing on phone | the `-v.svg` file exists? `.anat-row.has-vert` switch; CSS specificity (§7.5) |
| Artifact shows the muted error frame | HEAD probe / compile failure; check `public/artifacts/<slug>/` exists |
| Hydration warning | something decided height/viewport in the first render instead of an effect |
