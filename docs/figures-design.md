# behindscale — Article Figures: Technical Design

**Status:** RESOLVED (2026-08-10) — all fifteen open questions
locked. Implementation cleared to start. See §0 for the canonical
resolutions; §1–§7 are preserved as the reasoning trail.

**Trigger:** Owner shared `sample.asp` — a hand-authored HTML
revision of the LinkedIn Hodor article page with two inline SVG
diagrams placed inside the Solution section, each wrapped in a
`<figure>` element with an uppercase mono eyebrow label above the
SVG and a plain-English caption below. The goal of this document
is to design the schema, storage, rendering, validation, and
authoring workflow that would let figures like those two land as
a first-class part of the content contract.

**Scope:** Optional, per-article, zero-to-many. Owner's
expectation: 0, 1, or 2 figures per article is typical; more is
permitted but not encouraged. Figures are added only when they
enhance the article's value, never for cosmetic completeness.

---

## 0. Canonical resolutions (2026-08-10)

Where anything in §1–§7 conflicts with this section, this section
wins. The exploratory recommendations in §2 have been reversed on
rendering strategy (see 0.2); everything else in the recommendation
baseline is confirmed as-is.

### 0.1 Q1–Q15 — locked

| Q | Decision |
|---|---|
| Q1 Format | SVG only. No raster, no photos, no screenshots. |
| Q2 Storage | Per-figure files at `content/figures/<article>/<slug>.svg`. |
| Q3 Placement | Inline `{{figure:<slug>}}` markers, own line, blank-line delimited. Inside-paragraph, duplicate, and orphan markers all error. |
| Q4 Fields | Problem + Solution only. |
| Q5 SEO | JSON-LD `TechArticle.image` = first figure URL when `figures.length > 0`. Treat as free-if-it-works — do not build rasterization. |
| Q6 Workflow | Standalone figure round with a DECISIONS entry per figure. May bundle into a readability round when the two overlap naturally. |
| Q7 Ceiling | Soft-warn at `figures.length > 3`; hard-error at `figures.length > 5`. (Owner-approved default; adjust if operational data warrants.) |
| Q8 Palette | Always light theme. One rendering context, one palette. |
| Q9 Retrofit | Opportunistic — during each article's next readability pass, not a dedicated sprint. |
| Q10 Bands | `eyebrow` 2–6 words uppercase; `caption` 12–40 words; `ariaLabel` 4–20 words. Feed the in-SVG vocabulary lint (§0.3, addition #1). |
| Q11 SVG safety allowlist | Reject `<script>`, `<foreignObject>`, `on*`, `javascript:`, `<style>`, off-repo `href` / `xlink:href` on `<image>`/`<use>`/`<a>`, and `<image href="data:...">` base64 raster. |
| Q12 Taste doc | Gains a figure-authoring section (editorial "adds real value" bar + visual rules). This design doc stays the technical reference. |
| Q13 Fable authorship | Fable may draw and edit SVGs. Safety validator + vocabulary lint are the guardrail. Owner-only authoring would strand figures every vocabulary change — the maintainable choice is agent-drawn. |
| Q14 Removal | First-class op: drop marker, drop `figures[]` entry, delete SVG file, commit as `chore: remove figure X from <article>`. |
| Q15 First figures | Retrofit LinkedIn Hodor with `sample.asp`'s two figures as the first-ever figures in the library. They also serve as reference figures for future rounds. |

### 0.2 Rendering strategy — REVERSED from §2.5's tilt

**Chosen: `<img src="/figures/<article>/<slug>.svg">`.**
Not inline `dangerouslySetInnerHTML`.

The decisive fact is the audit finding: **the reading shell has
zero `dangerouslySetInnerHTML` today.** Going inline would open
the first XSS surface in the entire reading path, and (per Q13)
we would be routing machine-generated markup through it gated
only by our own allowlist. `<img>` gets browser-enforced no-JS
sandboxing by spec — the surface simply cannot exist.

Static-by-construction is preserved (§3.4 already emits
`dist/figures/<article>/<slug>.svg`; `<img>` just points at the
file we're producing anyway — one path, two uses). The CSS-
into-SVG flexibility was already policy-excluded by Q8's
one-palette lock.

**Accepted cost:** `<img>`-loaded SVGs don't inherit the page's
loaded web fonts, so short mono labels inside the diagrams
(CPU, LATENCY CHECK, …) fall back to the system monospace
instead of JetBrains Mono. Eyebrow and caption live in page
HTML (unaffected). If any figure looks off, the per-figure
fix is a subset-embedded `@font-face` inside that SVG via
data-URI, safe precisely because `<img>` has no script
surface. Do not pre-empt — apply only where the fallback is
visibly wrong, to keep SVG files lean.

### 0.3 Owner-added invariants — folded in

**Addition #1: `figure-text-vocabulary` validator** (proceeds
unchanged). Parse each SVG file at validation time, extract
every `<text>` node's `textContent`, run the same vocabulary /
consistency lints the prose fields get (banned-jargon list,
em-dash → spaced-hyphen, article↔figure label consistency).
Runs offline, render-independent. Also amends Q6: readability
passes may edit in-SVG `<text>` content, not only eyebrow and
caption — otherwise figures rot on the first article vocabulary
shift.

**Addition #2: `proseText()` / `proseRaw()` split-helper**
(build now). One shared helper, wired into every consumer that
measures / indexes / describes body prose:
- `proseText(field)` — markers stripped, whitespace collapsed.
  Used by: measurers (char-band checks, sentence-length lint,
  em-dash sweep), search indexers, JSON-LD description builders,
  the existing `stats-value-in-prose` fuzzy match.
- `proseRaw(field)` — markers intact. Used by: renderer only.

**Rule** (goes into the taste-doc contributor checklist): *any
new code that reads `problem` or `solution` for measurement,
indexing, or description must call `proseText()`. `proseRaw()`
is for rendering only.* Today's audit found the two current
consumers: `stats-value-in-prose` (wire `proseText()`) and
`Prose.tsx` (wire `proseRaw()`). The helper's real value is
forward-looking: automated band checks / sentence-length lints
/ em-dash sweeps / description-from-body-prose all become
safe-by-construction the day they land.

**Addition #3: id-namespacing at inline time** — DROPPED. Moot
under the `<img>` rendering strategy; each `<img>`-loaded SVG
gets its own document scope automatically. This was a real
point for `<img>` that shifted the render decision.

**Addition #4: markers guarantee position, not correctness**
(process rule). Any round that edits a paragraph adjacent to a
figure marker must re-verify that figure in its DECISIONS
entry. The marker's positional robustness invites false
confidence — a reordered paragraph keeps the figure "in the
right spot" while its content silently goes wrong.

### 0.4 `figure-svg-safe` — demoted from perimeter to hygiene

The `<img>` sandbox is the security perimeter. `figure-svg-safe`
still runs and rejects everything in Q11's allowlist, but as
build-time well-formedness / quality (it also guards the JSON-LD-
image file and any future direct-link view of the SVG). It is no
longer the thing standing between us and script execution.

### 0.5 Implementation sequencing (confirmed)

Follow §6 with three amendments:
- Fold the `proseText()` / `proseRaw()` helper into §6.2
  (validators). It lands with — not after — the checks that
  depend on it.
- §6.3 renderer uses `<img src>` per §0.2, not inline SVG.
- §6.5 build pipeline copies each SVG unchanged (no id-rewrite,
  no minification pass); `figure-svg-safe` runs as a
  defense-in-depth guard before the copy.

§6.7 (ship with zero figures) gates on all new validators
passing green on the current 41-article corpus.

---

## 1. Current article architecture (what the design must fit)

### 1.1 The content contract today

An article is a single JSON file at
`content/articles/<slug>.json` conforming to `Article`
(`src/types/article.ts`). The prose surfaces relevant to this
design are:

- `summary` — one paragraph, card + article-page summary.
- `crux` — 2–4 sentences, the named bottleneck.
- `cruxSummary` — 12–16 words, the one-line card label.
- `problem` — multi-paragraph prose, the setup.
- `solution` — multi-paragraph prose, the mechanism.
- `tradeoffs` — array of string paragraphs.
- `patterns[i].note` — chip-detail paragraphs, one per pattern
  reference.

All prose is plain text with paragraphs separated by blank lines
(`\n\n`). There is **no Markdown rendering today**. The
`src/components/Prose.tsx` component splits on `\n{2,}` and emits
one `<p>` per chunk. The Prose contract comment explicitly notes
that Markdown is deferred until "real Claude output" arrives — at
which point the component swaps for a real renderer and callers
stay unchanged.

Structural fields (unchanged by any figure design):
- `source`, `cruxTag`, `patterns[].slug`, `relatedArticles`,
  `artifact`, `stats`.

### 1.2 The artifact contract (nearest neighbor)

Each article's interactive artifact lives at
`content/artifacts/<slug>.jsx`. At build time
`scripts/compile-artifacts.ts` compiles each to a standalone
bundle emitted at `public/artifacts/<slug>/index.html`, served
inside a `sandbox="allow-scripts"` iframe with opaque origin.
Site-level artifacts follow an underscore-prefix convention
(`_hero.jsx`) exempt from the standalone context-block law.

The artifact model is where interactive, dynamic visualizations
live. Figures are the *static* counterpart: no scripts, no state,
no animation.

### 1.3 The site-boundary invariant

`context/architecture.md` mandates that the site is
static-by-construction — **no runtime network fetching from the
website**. Any figure asset must be present at build time and
either inlined into the SSG output or served from a static path
under `public/`.

### 1.4 SSG pipeline

`scripts/prerender.ts` renders each article page with
`renderToString(<StaticRouter>...)`, writes
`dist/articles/<slug>.html`, and injects head tags including
`TechArticle` JSON-LD (Google's Rich Results test target for the
article surface). Figures need to hook into this pipeline at two
points: SSG rendering (visible HTML) and JSON-LD head injection
(SEO / image discovery).

### 1.5 Validator surface

`scripts/validate-content.ts` runs six checks today
(`stats-value-in-prose`, `crux-summary-length`, etc.). Any
figure-related invariants become new files under
`scripts/checks/` and are registered in the runner. New checks
must ship with unit tests in `scripts/checks/__tests__/`, using
the shared fixture helpers.

### 1.6 What the sample HTML shows

Two figures on LinkedIn Hodor, both inline `<svg>` elements
inside `<figure class="fig">` wrappers, placed *between* prose
paragraphs inside the Solution section. Each figure has:

1. `<figure class="fig">` wrapper (light surface, border,
   rounded corners).
2. `<div class="fig-eyebrow">` — uppercase JetBrains Mono label
   ("WHERE HODOR RUNS", "THREE SIGNS OF OVERLOAD, ONE
   CONFIRMATION").
3. `<svg viewBox="..." role="img" aria-label="...">` — the SVG
   diagram itself, drawn in the site's color palette
   (`#F4F2EE` surface fills, `#2563EB` accent, `#8A8A94` muted
   text).
4. `<figcaption>` — one plain-English sentence explaining what
   the figure shows.

Both figures render in the light reading-shell theme (unlike
artifacts, which are dark on a light-in-dark seam frame). The
figure aesthetic matches the reading surface, not the artifact
surface — that is a deliberate visual choice worth preserving.

---

## 2. Design axes (the decisions to make)

Six axes, each with a recommendation and rationale. Owner input
requested on axes marked ★.

### 2.1 ★ Format allowlist

**Options:**
- **(A) SVG only** — inline vector, no raster.
- **(B) SVG + raster (PNG / JPG / WebP)** with a build-time
  optimization pipeline (sharp, imagemin).
- **(C) SVG + a narrow raster escape hatch** for the rare case
  a diagram genuinely cannot be redrawn (e.g. a photograph).

**Recommendation: (A) SVG only.**

*Rationale.* The sample uses SVG exclusively. SVG matches
behindscale's visual language (same tokens as artifacts and
reading shell), diffs cleanly in git, scales at any zoom, needs
no `srcset` or CDN variants, has zero optimization pipeline, and
— most importantly — is *authored*, not screenshotted.
behindscale's core thesis is source-fidelity without lift:
allowing raster opens the door to "just screenshot the diagram
from the vendor blog," which is precisely the wrong direction.
If a diagram is worth having, someone draws it in the site's
visual language.

*Cost.* No cover photos, no dashboard screenshots, no team
photos, no live product screenshots. The site is a technical
dissection library, so this seems fine.

*Reversibility.* If (A) is chosen and later regretted, adding
raster is additive — no live SVG figures need changing. If (B)
or (C) is chosen and later regretted, retrofit is painful (every
raster figure needs a redraw).

### 2.2 ★ Storage location

**Options:**
- **(A) Separate files per figure**, mirroring the artifact
  pattern: `content/figures/<article-slug>/<figure-slug>.svg`.
  Article JSON references by figure-slug; the SVG path is
  derived.
- **(B) Inline SVG as escaped strings** in the article JSON.
- **(C) Companion sidecar file**: `<article-slug>.figures.json`
  next to the article, containing the SVG bodies as strings.

**Recommendation: (A) separate files.**

*Rationale.* This mirrors the artifact model exactly
(`content/artifacts/<slug>.jsx`). A 300-line SVG inline in
article JSON destroys readability for every future readability
pass; each such pass would have to scroll past hundreds of
`<path d="...">` lines. Separate files give each figure its own
git history and make cross-review of prose independent of SVG
review. The `content/figures/<article-slug>/` directory-per-
article shape scales cleanly to the 0/1/2/many case without
directory bloat at the top level.

*Cost.* One extra directory-lookup at prerender time (trivial).

### 2.3 ★ Placement mechanism

**How does the article JSON say "put figure X between paragraphs
3 and 4 of Solution"?**

**Options:**
- **(A) Inline markers in prose fields.** Example:
  ```json
  "solution": "Hodor is not a separate monitor... Three
  detectors do the watching.\n\n{{figure:where-hodor-runs}}\n\n
  The first is a background thread..."
  ```
  Renderer splits the prose on the marker, inlines the figure
  at that position, splits the surrounding text into
  paragraphs as today.
- **(B) Positional metadata array.** Example:
  ```json
  "figures": [
    { "slug": "where-hodor-runs", "section": "solution",
      "afterParagraph": 1 }
  ]
  ```
- **(C) Prose-as-array-of-blocks.** Rewrite `problem` and
  `solution` from `string` to `Array<{ type: 'paragraph' | 'figure';
  ... }>`. Most explicit; largest schema disruption.

**Recommendation: (A) inline markers.**

*Rationale.* Markers travel with their paragraph — every
readability pass that splits, merges, or reorders paragraphs
keeps figures anchored automatically. Positional metadata (B) is
brittle: every prose edit that changes paragraph count shifts
every downstream index and silently mis-places figures.
Block-array (C) is the cleanest data model but requires
rewriting every existing article's prose fields and every
consumer of those fields; disproportionate for a feature that
will initially touch a handful of articles.

*Cost.* Introduces a small tokenized syntax in prose fields
that must be documented in the taste doc and validated
(orphan-marker check, §4). The Prose component becomes
figure-aware — a modest change.

*Marker syntax.* `{{figure:<slug>}}` on its own line,
surrounded by blank lines. Rejected shapes (validator errors):
markers inside a paragraph, markers referencing nonexistent
figure slugs, duplicate markers for the same slug.

### 2.4 ★ Which prose fields may hold figures?

**Options:**
- **(A) Problem + Solution only** — the two main narrative
  fields.
- **(B) All prose fields** including `summary`, `crux`,
  `tradeoffs[]`, `patterns[].note`.
- **(C) Configurable per field**, opt-in.

**Recommendation: (A) Problem + Solution only.**

*Rationale.* `summary`, `crux`, `cruxSummary` are card and
browse-surface strings — they must remain portable plain text
for search, catalog cards, JSON-LD `description` fields, and
sharing. `tradeoffs` are list items; a figure inside a `<li>`
reads awkwardly. `patterns[].note` renders in the chip-detail
context, which is not a place for diagrams. Problem + Solution
are the narrative body — the natural home for supporting
diagrams.

*Cost.* Policy call, not a technical constraint. Easy to
loosen later by adding fields to the allowlist.

### 2.5 SEO / social-card handling

**Options:**
- **(A) SVG only, no og:image work.** Emit each figure as a
  static file at `/figures/<article-slug>/<figure-slug>.svg` so
  JSON-LD `TechArticle.image` can point at the first figure
  (helps Google image discovery). Twitter/Slack/LinkedIn social
  cards keep using the default site og:image (they render SVG
  poorly and rasterizing at build time adds a toolchain).
- **(B) Build-time PNG rendering for social cards.** Add a
  headless renderer (`sharp`, `resvg-js`, or a Puppeteer step)
  to emit a PNG next to every SVG. Better social preview cards
  on Slack/Twitter/LinkedIn. Cost: one more build-time
  dependency, per-figure render time on cold cache, another
  failure mode.
- **(C) No JSON-LD image and no social work.** Ship figures
  purely as reading-experience improvements; skip SEO and
  social integration entirely.

**Recommendation: (A).** Ships an image discovery signal for
Google without adding a rasterization toolchain. Social cards
regress gracefully to the site default.

*Reversibility.* Moving from (A) → (B) later is additive.

### 2.6 Authoring workflow

**Options:**
- **(A) Standalone figure round.** Adding figures is its own
  round type with its own DECISIONS entry stating why each
  figure adds real value (not namesake). Readability passes
  may edit figure eyebrow/caption text but not add or remove
  figures.
- **(B) Allowed inside readability rounds.** Readability passes
  can add figures as a natural extension of improving an
  article's reading experience.
- **(C) Owner-authored only, never Fable.** Figures are always
  hand-drawn by the owner. Fable never proposes or draws a
  figure.

**Recommendation: (A) standalone figure round**, with the
option for the owner to bundle figures into a readability round
when the two overlap naturally. The DECISIONS discipline
matches how pattern mints work today: each figure earns its
place with a stated reason, which is the direct defense against
the "why not add a figure while I'm here" drift the owner
called out.

---

## 3. Proposed schema (recommendation baseline)

Assuming §2 recommendations (A, A, A, A, A, A):

### 3.1 Article gains one optional field

```ts
// src/types/article.ts
export interface Article {
  // ... existing fields unchanged ...
  figures?: Figure[]
}
```

### 3.2 The Figure type

```ts
// src/types/figure.ts (new)
export interface Figure {
  // Kebab-case, unique within the article. Referenced by
  // {{figure:<slug>}} markers in the article's prose fields
  // (problem, solution). Also drives the on-disk path:
  //   content/figures/<article-slug>/<figure-slug>.svg
  //   and the public URL:
  //   /figures/<article-slug>/<figure-slug>.svg
  slug: string

  // Uppercase mono label rendered above the SVG in the
  // reading shell's eyebrow style. 2-6 words. Example:
  // "WHERE HODOR RUNS", "THREE SIGNS OF OVERLOAD, ONE
  // CONFIRMATION".
  eyebrow: string

  // Plain-English sentence rendered below the SVG.
  // 12-40 words. Describes what the figure shows, in the
  // same source-faithful register as `crux` and `problem`.
  caption: string

  // Screen-reader label (SVG role="img" aria-label attribute
  // value). May equal `caption` but often shorter/tighter.
  // Required; empty is an error.
  ariaLabel: string
}
```

### 3.3 SVG file on disk

- Path: `content/figures/<article-slug>/<figure-slug>.svg`
- Contents: a single `<svg>` root element with `viewBox`,
  `role="img"`, and the drawn content. No `<script>`, no
  `<foreignObject>`, no `on*` event handlers, no
  `javascript:` URLs (safety validator, §4).
- Style: uses the site's design tokens directly (fill colors
  from the taste doc's approved palette; JetBrains Mono for
  monospaced labels; Inter for sentence labels).

### 3.4 Public URL (build output)

- Path: `dist/figures/<article-slug>/<figure-slug>.svg`
- Emitted by an extension to the build pipeline (a new
  `scripts/copy-figures.ts` step, or folded into
  `compile-artifacts` as a sibling walk).
- Used only for `TechArticle.image` JSON-LD (§2.5) and any
  future direct-link surface. The reading page inlines the
  SVG body into the HTML, so the URL is not fetched at page
  load.

### 3.5 Marker syntax in prose

```
Every service carries its own copy of Hodor.

{{figure:where-hodor-runs}}

The first detector is a background thread...
```

Rules (enforced by validator):
- On its own line, surrounded by blank lines (i.e. splits
  cleanly on the existing `\n{2,}` paragraph delimiter).
- Slug in the marker must resolve to an entry in the
  article's `figures[]`.
- Each figure defined in `figures[]` must be referenced by
  exactly one marker.
- Markers may only appear inside `problem` or `solution`
  (per §2.4).

---

## 4. New validator checks

All are additions to `scripts/checks/`. Post-resolution set
(§0.3–§0.4):

- **`figure-svg-exists`** *(error)* — every `figures[i].slug`
  must have a matching file at
  `content/figures/<article-slug>/<figures[i].slug>.svg`.
- **`figure-svg-safe`** *(error, hygiene)* — SVG file must
  contain no `<script>`, no `<foreignObject>`, no attributes
  starting with `on`, no `javascript:` URLs, no `<style>`,
  no off-repo `href` / `xlink:href` on `<image>`/`<use>`/`<a>`,
  no `<image href="data:...">` base64 raster. Demoted from
  security perimeter to build-time hygiene (§0.4); the
  browser's `<img>` sandbox is the perimeter. Also guards the
  JSON-LD `image` file and any future direct-link view.
- **`figure-text-vocabulary`** *(error)* — parse each SVG
  offline, extract every `<text>` node's `textContent`, run
  the same vocabulary / consistency lints the prose fields
  get (banned-jargon list, em-dash → spaced-hyphen, article↔
  figure label consistency). Render-independent; catches
  figure rot when article vocabulary shifts.
- **`figure-fields-nonempty`** *(error)* — every figure's
  `slug`, `eyebrow`, `caption`, `ariaLabel` must be
  non-empty strings. Eyebrow / caption / ariaLabel word
  counts enforced against the Q10 bands.
- **`orphan-figure-markers`** *(error)* — every
  `{{figure:X}}` marker in prose must resolve to a
  `figures[]` entry with slug `X`.
- **`unused-figure-defs`** *(error)* — every entry in
  `figures[]` must be referenced by at least one marker.
- **`marker-placement-legal`** *(error)* — markers may only
  appear inside `problem` or `solution` (Q4); a marker in
  any other field is an error. Also enforces marker syntax:
  own line, blank-line delimited, no inside-paragraph
  markers, no duplicate slugs.
- **`figure-count-ceiling`** — soft-warn at
  `figures.length > 3`, hard-error at `figures.length > 5`
  (Q7).

Plus the shared **`proseText()` / `proseRaw()`** helper
(§0.3 addition #2), located under `scripts/lib/` (or the
project's equivalent) since both prose consumers
(validators) and renderers (React) import it.

New unit tests parallel each check under
`scripts/checks/__tests__/`, using the shared fixture helpers.
`fixtures.ts` gains a `withFigure()` article-builder extension.

---

## 5. Open questions (owner input required) — ALL RESOLVED 2026-08-10

All fifteen questions below are resolved. See §0.1 for the
locked decisions; the question text is preserved for the
reasoning trail.

### 5.1 Format allowlist — §2.1
**Q1.** Confirm (A) SVG only, or accept raster too?

### 5.2 Storage — §2.2
**Q2.** Confirm (A) per-figure files under
`content/figures/<article>/<slug>.svg`?

### 5.3 Placement mechanism — §2.3
**Q3.** Confirm (A) inline `{{figure:<slug>}}` markers?
- Q3a. If yes, is `{{figure:slug}}` the right marker syntax, or
  do you prefer another (e.g. `[[figure:slug]]`,
  `<!-- figure:slug -->`, or an HTML-like `<figure/>` tag)?

### 5.4 Field allowlist — §2.4
**Q4.** Confirm (A) Problem + Solution only? Or do you want
figures in `tradeoffs[]` items as well? (I recommend no; the
owner may disagree.)

### 5.5 SEO / social cards — §2.5
**Q5.** Confirm (A) JSON-LD `image` from first figure, no PNG
rasterization for social cards?

### 5.6 Authoring workflow — §2.6
**Q6.** Confirm (A) standalone figure round with DECISIONS
entry per figure? Or something looser?

### 5.7 Ceiling policy — §4
**Q7.** Where do the ceiling numbers sit?
- Soft warning at how many figures? (proposed: 3)
- Hard error at how many? (proposed: 5)
- Or no ceiling at all — leave it to editorial judgment?

### 5.8 Visual style scope
**Q8.** The sample uses light-theme SVG matching the reading
shell. Is that the permanent choice, or should figures
optionally support the dark artifact palette when a figure
sits close to the artifact iframe visually? (Recommend: always
light. One palette, one rendering context, no confusion.)

### 5.9 Retrofit policy
**Q9.** Once the feature ships, do we retrofit figures onto
older articles that would benefit? If yes, is that a dedicated
sprint, or opportunistic during future readability passes on
each article? (Existing articles' `figures?: []` remains valid
untouched, so this is a scheduling question, not a schema
question.)

### 5.10 Eyebrow and caption length bands
**Q10.** Should figure `eyebrow` and `caption` get their own
character/word bands the way the taste doc v6 bands `summary`,
`crux`, `problem`, `solution`, and `cruxSummary`? Proposed:
- `eyebrow`: 2–6 words, uppercase.
- `caption`: 12–40 words.
- `ariaLabel`: 4–20 words.
Or leave editorial judgment to hold the line?

### 5.11 Sanitizer strictness
**Q11.** The `figure-svg-safe` validator will reject any SVG
containing `<script>`, `<foreignObject>`, `on*` attributes, or
`javascript:` URLs. Do you want it stricter — e.g. also reject
`<style>` (an SVG-embedded style leaks into the page unless
scoped), external `<image href="...">` or `<use href="...">`
that point off-repo (implicit network dependency), or embedded
`<a xlink:href>` links? Recommend: reject `<style>` and
off-repo `href` too. Keeps figures fully self-contained and
network-independent (matches the site-boundary invariant §1.3).

### 5.12 Where does the taste doc grow?
**Q12.** Should the taste doc (docs/behindscale-taste.md) gain
a new §7 or §8 covering the figure-authoring bar (when to add
a figure, when not to; visual style rules; the "adds real
value" test) once this feature ships? Or does the design doc
itself become the reference and taste doc stays untouched?

### 5.13 Fable's role in drawing SVGs
**Q13.** Two operating modes are possible:
- Fable proposes figures in a round's DECISIONS and draws the
  SVGs itself (fastest cadence; risks visual drift).
- Owner is the only figure author; Fable may only edit
  eyebrow/caption text under owner direction.
Which mode is intended? (Ties back to Q6.)

### 5.14 Bidirectional migration
**Q14.** Would you ever remove a figure from a live article
(e.g. after a readability pass concludes it wasn't
value-adding after all)? If yes: the delete flow is
straightforward (remove marker, remove `figures[]` entry,
delete SVG file, commit as `chore: remove figure X from
<article>`). Just confirming this is a supported operation
and not a one-way ratchet.

### 5.15 Sample figures — retrofit LinkedIn Hodor as the first?
**Q15.** The two figures from `sample.asp` are already drawn
and ready. Once the feature ships, do we land them on the
LinkedIn Hodor article as the first-ever figures in the
library (which would also serve as the reference figures for
future rounds)? Or hold them back for a fresh test?

---

## 6. Implementation sketch (once §5 is resolved)

Not a plan — an ordering. Each item below becomes a discrete
commit under the standard build/test/push discipline.

1. **Content-contract additions** (`src/types/figure.ts`,
   extension to `article.ts`, barrel export). Extend the
   validator fixtures and article predicates.
2. **Six new validators** (§4) with unit tests. Register in
   `scripts/validate-content.ts`. Run against the empty
   `figures?: []` state — everything passes untouched.
3. **Prose renderer** — extend `src/components/Prose.tsx` to
   split on figure markers as well as paragraph blanks;
   receive the article's `figures[]` as a prop to resolve
   each marker; render each `<figure>` inline with the same
   DOM shape as the sample (`figure.fig` > eyebrow div > SVG
   (via safe `dangerouslySetInnerHTML`) > figcaption).
4. **Global CSS** — port the `figure.fig`, `.fig-eyebrow`,
   `figure.fig figcaption` styles from `sample.asp` into the
   existing style pipeline, using the design tokens.
5. **Build pipeline** — new step to copy each
   `content/figures/<article>/<figure>.svg` to
   `public/figures/<article>/<figure>.svg` (or emit directly
   to `dist/figures/...`); the copy step runs the same safety
   validator as a defense-in-depth guard before writing.
6. **Prerender** — inline SVG file contents at each marker
   position during SSG so the HTML ships with the SVG in-body
   (zero fetch cost). Extend `TechArticle` JSON-LD's `image`
   field to the first figure's URL when `figures.length > 0`.
7. **Ship with zero figures** — everything above passes on the
   current corpus (41 articles, 0 figures each). Contract is
   live but nothing on-site changes.
8. **First real figures** — retrofit LinkedIn Hodor with
   `sample.asp`'s two figures (assuming Q15 = yes). This
   commit is where the feature actually appears to users.
9. **Taste-doc update** — record the figure-authoring bar
   (Q12).
10. **Progress-tracker + board-doc updates** — new content
    contract, new validators, ceiling policy, figure count in
    the summary line.

---

## 7. Non-goals (explicitly out of scope)

- **Animated / interactive figures.** That is what artifacts
  are for. Figures are static.
- **Auto-generated figures from prose.** No LLM-drawn figures
  at build time. Every figure is authored deliberately.
- **Cross-article figure reuse.** Each figure lives under its
  article. If two articles would use the same diagram, that
  is a signal the figure is generic (probably a pattern-level
  diagram, not an article-level one) and should be resolved
  differently — likely a `content/pattern-figures/` directory
  at some future point, but out of scope here.
- **Figure lightbox / modal.** No click-to-enlarge. Figures
  render at natural size in the reading flow.
- **Raster / photo / screenshot support.** Per §2.1
  recommendation.
- **Figure translations / i18n.** No.
- **Figure comments / discussions / social features.** No.
