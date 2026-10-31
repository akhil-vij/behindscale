# UI Context

## Theme

behindscale has two distinct visual environments, used intentionally:

- **Reading shell (light, editorial):** Everything that is text to be read —
  the landing page, the problems workbench and problem-class pages, article
  breakdowns, the pattern library. Optimized for sustained reading: warm
  off-white background (never pure white), high-contrast text, generous
  whitespace, comfortable measure (line length). Reference points: Stripe
  docs, Linear blog, Mintlify.
- **Artifact surface (dark, technical):** The interactive artifacts embedded
  in article, pattern and problem pages (simulations, try-its, missions).
  These stay dark — like a code editor or dashboard embedded in
  documentation. The contrast with the light shell creates hierarchy and
  signals "interactive exploration zone." Artifacts own their own internal
  styling (they are self-contained bundles in iframes) but should align with
  the dark token palette below for consistency.

There is no user-facing light/dark toggle initially. The shell is light; the
artifacts are dark. This is a deliberate design choice, not a missing feature.

## Colors

Tokens are defined once, as CSS custom properties on `:root` in
`src/index.css`, and exposed to Tailwind as colour names in
`tailwind.config.js` (`bg-bg-base`, `text-text-muted`, `border-art-border`).
No hardcoded hex in `src/` outside those definitions. Tokens that need alpha
also carry an `-rgb` triplet (`--cat-*-rgb`, `--brand-gold-rgb`,
`--art-live-rgb`), which is what lets Tailwind opacity modifiers like
`bg-cat-blue/10` work.

Artifacts cannot read `src/index.css`: each runs in its own sandboxed
document and loads no site CSS. Each bundle declares its own copy of the
dark values, and so does the HTML shell `scripts/compile-artifacts.ts`
writes around it.

### Reading shell (light)

| Role                | CSS Variable          | Value     |
| ------------------- | --------------------- | --------- |
| Page background     | `--bg-base`           | `#FBFAF8` |
| Surface (cards)     | `--bg-surface`        | `#FFFFFF` |
| Surface (subtle)    | `--bg-subtle`         | `#F4F2EE` |
| Primary text        | `--text-primary`      | `#1A1A1F` |
| Secondary text      | `--text-secondary`    | `#52525B` |
| Muted text          | `--text-muted`        | `#6E6E78` |
| Muted (non-text)    | `--muted-ghost`       | `#8A8A94` |
| Primary accent      | `--accent-primary`    | `#2563EB` |
| Accent (hover)      | `--accent-hover`      | `#1D4ED8` |
| Border (default)    | `--border-default`    | `#E7E4DE` |
| Border (strong)     | `--border-strong`     | `#D6D2CA` |
| Success             | `--state-success`     | `#15803D` |
| Error               | `--state-error`       | `#DC2626` |
| Code background     | `--code-bg`           | `#F4F2EE` |
| Brand gold          | `--brand-gold`        | `#F5B841` |

**Brand thread (2026-07-08):** `--brand-gold` is for hairline rules, the
wordmark mark, the artifact underglow and the crux underline. Never body
text.

**Muted split (F18, 2026-09-09):** `--text-muted` was `#8A8A94` (≈3.9:1 on the
light grounds — fails WCAG AA for text). It is darkened to `#6E6E78` for every
**text** use (measured 4.84:1 on `#FBFAF8`, 5.02:1 on `#FFFFFF`, ≈4.55:1 on
`#F4F2EE`): eyebrows, figure/diagram captions, stat labels, station-nav idle
items, card read-times/dates, result-count lines, footer small print, "not
stated" table cells, tick titles. `--muted-ghost` (`#8A8A94`, the old value)
carries the **non-text** uses where the contrast law doesn't apply: decorative
dashes, dividers, disabled-state hints, the reserved-slot circle, and the
diagram connectors/arrowheads/clock. Naming note: the Batch-1 design spec calls
these `--muted` / `--muted-ghost`; the codebase keeps the existing
`--text-muted` name and adds `--muted-ghost` (both mapped in `tailwind.config.js`).

**In-prose links (F18):** a link inside a paragraph or list item is underlined
at rest (1px, `text-underline-offset: 2px`) — colour alone is ~1.5:1 against
body text. Nav items, chips, card titles and mono eyebrow links stay bare
(affordances by position). A link inside a `<details>` `<summary>` moves into
the expanded body as its first line (`Read the breakdown →`) so the summary row
is one predictable control.

**Link arrows (2026-10-10, owner):** → for our own pages, ↗ only for outside
links, wherever the link sits and whether or not it opens a new tab ("Open in
full →" under article simulations, "OPEN FULL SCREEN →" on pattern pages).
Every link from a wall page to one of our breakdowns reads "Read the
breakdown →". `tests/e2e/link-arrows.spec.ts` checks every wall page, and the
arrows on every page in the sitemap.

**No long dashes as punctuation (2026-10-10, owner):** no em or en dash in
copy; use a colon, a full stop, or words ("2017 to 2022"). Compound names
keep theirs ("Logical–Physical"). `tests/e2e/share-tags.spec.ts` enforces it
for page titles, meta descriptions and the feed; the content-sourced
descriptions that still carry one are listed there (`KNOWN_CONTENT_DASHES`)
and in open-decisions #30.

### Artifact / dark tokens (for artifact bundles and any dark embed)

| Role                | CSS Variable          | Value     |
| ------------------- | --------------------- | --------- |
| Artifact background | `--art-bg`            | `#08090D` |
| Artifact surface    | `--art-surface`       | `#0F1118` |
| Artifact surface 2  | `--art-surface-2`     | `#161922` |
| Artifact border     | `--art-border`        | `#1F2333` |
| Artifact text       | `--art-text`          | `#C8CDD8` |
| Artifact text muted | `--art-text-muted`    | `#6B7280` |
| Live indicator      | `--art-live`          | `#30a46c` |
| Interactive border  | `--art-border-interactive` | `#3a4158` |
| Bright text         | `--art-text-bright`   | `#EDEFF3` |
| Verdict red         | `--art-red`           | `#ef4444` |
| Verdict amber       | `--art-amber`         | `#eab308` |
| Verdict green       | `--art-green`         | `#22c55e` |
| Problem-class accent| `--accent-problem`    | `#D946EF` |
| Problem accent hover| `--accent-problem-hover` | `#E879F9` |
| Muted text (local)  | `--art-muted`         | `#98A1B0` |
| Queue bar blue (local) | `--art-blue`       | `#3b82f6` |

Every row except the two marked *local* is defined in `src/index.css`. The
shell itself uses only the first seven (embed and error frames, the pattern
page's mechanism shell); the rest are reference values the problem-page
artifacts re-declare. The *local* rows exist only inside the problem-page
artifacts (`--art-blue` only in the queue-backlog mission).

Usage rules for the named dark tokens (problem page v7.3, 2026-09-06):

- `--art-border-interactive` is for **buttons and inputs only**. Display
  nodes (stage boxes, ghost boxes) keep `--art-border`; a display element
  drawn with the interactive border reads as tappable.
- `--art-text-bright` carries titles and the bill's BASELINE line.
- `--art-red` / `--art-amber` / `--art-green` are the dark-side verdict set,
  brighter than the light-shell semantics for contrast on `#08090D`. **Never
  on light surfaces** -- the shell keeps `--state-error` / `--cat-amber` /
  `--state-success`.
- `--art-blue` is the healthy fill of a stage's level bar (the queue in the
  queue-backlog mission), before it turns amber and red. Display only.
- `--art-live` is the status dot on an artifact's caption bar. It is distinct
  from `--state-success`, which is a darker UI green.
- `--accent-problem` (magenta) marks **interactive controls, attention cues,
  and the BUILD IT badge**; never the light shell, and never a
  non-interactive dark element (magenta means clickable; the badge is the
  one sanctioned exception).

**The `#08090D` family is canonical** for every dark artifact (v5
ratification 2026-08-29). Drift still exists in the shipped artifacts: most
older ones hardcode the taste-doc literals (`#111118` / `#0c0d13` /
`#2a2a3a` panels and borders), often alongside the `--art-*` values above,
and `skipper-workflow-engine` sits on its own grays (`#101018` / `#14141c` /
`#23232e`) and is the only one without the `#08090D` root. Migrate each
artifact onto the `--art-*` values at its next touch; no third family.

**Muted text on dark surfaces (legibility, 2026-09-06):** `--art-text-muted`
`#6B7280` measures 3.9:1 on `--art-surface` and 4.1:1 on `--art-bg`, under
the 4.5:1 AA floor for the 9–11px labels the artifacts set in it. Every
problem-page artifact (`problem-<wall>-tryit` / `-mission`) therefore
carries a local `--art-muted: #98A1B0` (7.2:1 on the surface), keeps every
HTML label at 10px or more (meter captions 9px), and dims locked / disabled
options to 0.7 / 0.5 instead of 0.55 / 0.35. That is a deliberate deviation
from the table above, recorded as open decision #22 (lift the token
site-wide, or keep it per-artifact).

### Problem-page shell tokens (light)

| Role                        | CSS Variable   | Value     |
| --------------------------- | -------------- | --------- |
| Hot row / hot answer border | `--hot-border` | `#EAD9C2` |
| Hot row / hot answer fill   | `--hot-bg`     | `#FBF4EA` |
| Window-bar fill             | `--bar-fill`   | `#E9E2D6` |

The "hot" tint marks the row a reader spends the most time on (the
"Still breaks when" matrix row, question 6) on the light shell; the
window-bar fill is the solid bar in the protection-window figure.

### Pattern / tag accent ramp (shared, used for categorizing patterns)

Use these for tag chips and pattern category coding so colors mean the same
thing everywhere.

| Role     | CSS Variable    | Value     |
| -------- | --------------- | --------- |
| Blue     | `--cat-blue`    | `#2563EB` |
| Green    | `--cat-green`   | `#15803D` |
| Orange   | `--cat-orange`  | `#EA580C` |
| Purple   | `--cat-purple`  | `#7C3AED` |
| Cyan     | `--cat-cyan`    | `#0891B2` |
| Red      | `--cat-red`     | `#DC2626` |
| Amber    | `--cat-amber`   | `#B45309` |

Category → colour (`docs/design-spec.md` §2): resilience blue, consistency
purple, throughput green, performance orange, observability cyan. One table
holds it: `PATTERN_CATEGORIES` in `src/lib/patternCategories.ts`, whose
entries carry both the listing dot and the chip classes (`PatternChip.tsx`
reads them); `src/lib/__tests__/patternCategories.test.ts` pins the mapping.
`--cat-amber` doubles as the light shell's attention ink: the
"hot" matrix row and question, SEEN AT lines, the BREAK IT teaser, the
numbered steal list.

## Typography

Reading comfort is the priority for the shell. Use a clean, modern sans for
UI and body, a serif for editorial display type, and a monospace for code,
tags, and artifact text.

| Role                  | Font                           | Variable        |
| --------------------- | ------------------------------ | --------------- |
| UI + body text        | Inter (fallback: system sans)  | `--font-sans`   |
| Content-page headings | Inter (tight tracking)         | `--font-sans`   |
| Editorial display     | Newsreader (variable, opsz)    | `--font-serif`  |
| Code / mono           | JetBrains Mono (fallback mono) | `--font-mono`   |

Newsreader carries the headings and card titles on the landing page,
`/problems` and `/sources`; article, pattern and problem pages head in Inter.
Mono carries code, eyebrows, chips, counts and artifact text. All three are
self-hosted through the `@fontsource` packages imported in `src/main.tsx`;
there is no font CDN.

Type scale (shell): body 16px / line-height 1.7 (the problem page sets
1.65); small 14px; captions 12–13px; content-page h1 ~30px (`text-3xl`), h2
20–24px, h3 ~17–18px; serif display headings scale with `clamp()`. Keep body
measure to ~68–75 characters (the 680–720px reading columns).

## Border Radius

| Context              | Class            | Value |
| -------------------- | ---------------- | ----- |
| Inline / chips / tags| `rounded-md`     | 6px   |
| Cards / panels       | `rounded-xl`     | 12px  |
| Modals / overlays    | `rounded-2xl`    | 16px  |
| Artifact iframe frame| `rounded-xl`     | 12px  |

Set in `tailwind.config.js`. Off the scale today: 8–10px on search inputs
and the problem page's row boxes, 14px on the landing hero frame.

## Component Library

- Tailwind CSS is the styling system. There is no component kit (no
  shadcn/ui, no `src/components/ui/`): shared components are hand-written in
  `src/components/`, page-specific ones sit beside their page
  (`src/pages/problem/`).
- All custom components consume the CSS variable tokens above via Tailwind
  theme extension. No raw hex in component files.
- The one plain-CSS surface is `src/pages/problem-page.css`: every rule
  scoped under `.problem-page`, tokens only (`var(--…)`).

## Layout Patterns

behindscale has **two equally prominent navigation surfaces**: the problems
workbench (`/problems`, where the article breakdowns live, grouped by
problem class) and the pattern library (`/patterns`). Both are in the
navbar at all times. Article cards expose the patterns they embody; pattern
pages list the breakdowns that embody them. The reader can enter from
either side and traverse to the other.

- **Navbar:** light top bar (`--bg-surface`, `--border-default` bottom
  border, 1080px): wordmark with its gold mark (links to `/`), then
  "Problems", "Patterns" and a Search button that focuses the `/problems`
  search box (navigating there first).
- **Landing (`/`):** a hero (serif H1 and lede beside the live artifact in a
  dark-in-light frame with a gold hairline; stacks text-first below `lg`), a
  trust band, an audience block, a preview of the top problem classes, and a
  CTA into `/problems`. No `<input>` on this page.
- **Problems workbench (`/problems`, 1080px):** search (`?q=`), Company
  filter chips, a "Showing N of M" line, then one section per problem class
  (cruxTag), largest first. A section header links to the class page and
  carries its definition, a SEEN AT line, and PLAYABLE / SIDE BY SIDE badges
  when it has a mission or comparison. Article cards fill an auto-fill grid
  (min 310px): source eyebrow, serif title (the link), crux summary, up to 3
  pattern chips.
- **Problem page (`/problems/:urlSlug`):** a 680px reading column; sections
  render when authored. A wall page (the rich state) adds the two artifacts
  (try-it, build-it mission), which break out to 960px at **equal widths**
  and draw their own dark frames (the embed runs bare). A sticky station nav
  under the header, spanning the same 960px, carries the time budgets from
  content; on phones it becomes a single nowrap row with a right-edge mask
  and the `· N MIN` budgets hidden. The mission frame takes its height from
  the artifact's `size` message: at 700px and above it is a bounded
  scrollport, `min(content, 100dvh − 56px)`, so the right working column's
  sticky engages; under 700px it is content-height and the page scrolls.
  The comparison table also spans 960px, first column frozen. The YOU
  column and YOU diagram own themselves with a 1.5px left rule
  (`--border-strong`) and a `--bg-subtle` tint in neutral ink -- never
  magenta on the light shell.
- **Article page (`/articles/:slug`):** a 720px reading column (title,
  source row, all pattern chips, summary, crux, Problem, Solution); the
  artifact breaks out to 960px in a dark, rounded frame before Tradeoffs,
  "Patterns in this article" (each chip with its per-article note) and
  "Also solving this" (the same problem class).
- **Pattern library (`/patterns`, 1020px):** patterns grouped under the five
  categories, with search (`?q=`) and single-select category chips
  (`?category=`). Cards (auto-fill, min 300px) show the name, breakdown
  count, a one-line definition and SEEN AT companies, and link to the
  pattern page.
- **Pattern page (`/patterns/:slug`, 680px):** eyebrow ("Pattern · seen in
  N breakdowns across M companies"), name, lede, category chip, then each
  section only when authored or derived: The mechanism (the artifact in its
  own dark shell), Definition, When it applies, Tradeoffs, "The same move, N
  ways" (one row per breakdown with company, source, year and the
  per-article note; past 8, the first 4 stay full and the rest collapse
  behind SHOW ALL), Often used together, Problems this pattern answers.
  This is the durable-knowledge surface; treat it with the same
  reading-comfort rigor as the article page.
- **Sources (`/sources`, 880px):** the `content/feeds.json` allowlist with
  each blog's breakdown count, each linking to `/problems?source=<slug>`.

### Pattern Chips

Pattern chips are the bidirectional cross-link between articles and
patterns. They appear on article cards, in article headers, and in an
article's "Patterns in this article" section. Problem pages list their
patterns as neutral `.chip` links in `problem-page.css`.

- Visual: small pill, `rounded-md`, `--font-mono`, color-coded by category
  (`--cat-*` text, a 10% fill, a 30% border) if the pattern has a category,
  or a neutral border + text style if uncategorized.
- Behavior: always a link to the pattern detail page (`/patterns/:slug`).
- Constraint: never more than 3 chips visible on a card at once. A card
  shows the first 3 with no overflow marker; the article page shows them
  all.
- Hover/focus: light surface fill (`--bg-subtle`) and the accent focus
  ring, never a hard color shift.
- A chip is a wayfinding element, not a tag in the broad sense. Tags
  (general topical labels like "load-shedding") are visually distinct from
  pattern chips; do not collapse the two into one component.

### Source Attribution

Source attribution is a first-class element, not a footnote. Every place an
article is referenced — workbench cards, the article page header, pattern
page back-links — shows where it came from, prominently and consistently.

- **Article card (on `/problems`):** the `source.name` appears as a small
  uppercase eyebrow above the article title (e.g. "UBER ENGINEERING"),
  styled with `--text-muted` and `--font-mono`, with the article date beside
  it. The title links to the article page; the source name links to
  `/problems?source=<slug>`.
- **Article page header:** below the title, a source row with the
  `source.name` and ↗ (linked to `source.url`, opens in new tab), a
  separator, the publish date, and a small "↗ Read original" link that
  points to `article.url`. The reader should never have to hunt for where
  this came from or how to find the source post.
- **Pattern page back-links:** every row in "The same move, N ways" shows
  the company and the source name beside the note, so the breadth of a
  pattern across companies is visible at a glance.
- **Filter affordance:** the workbench's Company chips are derived from
  realized content (the distinct `source.company` values across published
  articles, alphabetical) plus an explicit "All" chip as the cleared state.
  Active chip filled; inactive chips border-only. URL shape:
  `?source=<slug>`. `content/feeds.json` is the upstream allowlist and is
  listed in full on `/sources` (Unit 6 architecture decision: navigation
  surfaces filter by realized content; informational surfaces describe
  intended scope).

Attribution must never be styled in a way that visually competes with the
article title — it is a credibility signal and a wayfinding cue, not the
headline. Muted token, smaller size, distinct typographic treatment.

- **Artifact embed:** a dark rounded frame (`rounded-xl`, `--art-border`,
  `--art-bg`, a subtle shadow), full-width within its container, with an
  "Open in full →" link in a footer bar. Bare mode drops both for hosts
  that draw their own shell (pattern mechanism, problem page). A load or
  render failure shows one muted line in the same frame.

## Icons

- No icon library. The only icons are hand-written inline SVGs (the search
  magnifiers); everything else is a text glyph (→ ↗ ▾ ⟷).
- Stroke-based icons only.
- Sizes: `h-4 w-4` for inline/text-adjacent, `h-5 w-5` for buttons and nav.
- Icons inherit text color via `currentColor`; no multi-color icons.

## Responsive

- Mobile-first. The reading shell must be fully comfortable on a phone
  (this is a stated product goal — browsing on mobile while commuting).
- 700px is the shared phone/desktop line: the problem page's CSS, the
  host's mission sizing, and the problem-page artifacts (which key off
  their own frame width) all switch there. Under 700px each comparison
  diagram and the windows chart swap to their vertical `-v` file when one
  exists; otherwise the wrapper scrolls sideways with a "⟷ scroll" pill and
  a right-edge fade. 560px drops the problem page's stat strip and decision
  rows to one column; Tailwind `lg` splits the landing hero into two
  columns.
- Artifacts are dark dashboards; ensure they scroll horizontally within their
  iframe rather than forcing the page to overflow.
