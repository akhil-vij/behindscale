# behindscale — Landing + Catalog design spec

Reference implementation: `design/Landing.html` (pixel reference, DesignCoded
export with inlined fonts — do not port verbatim), `design/Catalog.html`
(clean ~288-line DOM — direct port target for `/catalog`).
This document is the source of truth for the design tokens, layout, and
the two-page (landing + catalog) reframe. The look and feel is **frozen**;
do not redesign.

---

## 1. Aesthetic direction — "the dissection journal"

The identity risk (deliberate, approved constraint set: gold accent +
light/dark editorial contrast + live artifact are fixed points):

- The page is a **light, warm editorial reading surface**; the artifact is
  a **dark, monospaced technical instrument**. The contrast is the brand
  — a dark jewel set in a lighter frame, never a page painted dark to
  match.
- **Editorial serif headlines** (Newsreader) with a single italic "crux"
  emphasis, set large with tight leading, read like a technical journal
  — not a templated all-grotesque dev-tool site.
- A **pervasive monospace label layer** (JetBrains Mono) for eyebrows,
  tags, metrics, filters — the "lab instrument" texture.
- **Gold (#F5B841) is a restrained thread**, not a body color: hairline
  rules, the wordmark mark, the artifact underglow, the crux underline.
  Never used as low-contrast text. Blue (#2563EB) stays purely functional
  (links/focus) per the existing tokens.

This intentionally avoids the three named tropes (cream+terracotta serif;
near-black+acid-green; broadsheet hairline columns).

---

## 2. Design tokens

### Palette — light editorial shell (from ui-context, unchanged)
| Role | Hex |
|---|---|
| Page background | `#FBFAF8` |
| Surface (cards) | `#FFFFFF` |
| Surface subtle / bands | `#F4F2EE` |
| Text primary | `#1A1A1F` |
| Text secondary | `#52525B` |
| Text muted | `#8A8A94` |
| Border default | `#E7E4DE` |
| Border strong | `#D6D2CA` |
| Functional accent (links/focus) | `#2563EB` / hover `#1D4ED8` |
| **Brand thread (gold)** | `#F5B841` — rules, mark, glow, crux underline only |

### Fixed dark-artifact palette (do not restyle)
`--art-bg #0b0d12` · surfaces `#0e1118`/`#12151d` · border `#20242e` ·
text `#c7ccd6`/muted `#78818f` · gold `#F5B841` (critical) · gray
`#5b6472` (bulk) · green `#30a46c` (served) · red `#e5484d` (dropped).

### Pattern-chip category ramp (five categories, not three)

The live pattern library uses **five** categories:

| Slug            | Ramp token       | Hex        |
| --------------- | ---------------- | ---------- |
| `resilience`    | `--cat-blue`     | `#2563EB`  |
| `consistency`   | `--cat-purple`   | `#7C3AED`  |
| `throughput`    | `--cat-green`    | `#15803D`  |
| `performance`   | `--cat-orange`   | `#EA580C`  |
| `observability` | `--cat-cyan`     | `#0891B2`  |

Chip render: `text-cat-<color>` foreground, `bg-cat-<color>/10`
background (10% alpha), `border-cat-<color>/30` border (30% alpha).
Uncategorized patterns render with the neutral fallback
(`text-text-secondary border-border-default bg-bg-surface`) —
uncategorized is a valid state, not an error.

**Why five, not three:** an earlier draft of this spec listed only
three categories (`resilience`, `consistency`, `performance`). That
count was an artifact of the handoff author's partial 7-pattern view
of the world — the working copy that produced this document held
patterns spanning three categories at that moment. The **live library
has always used five**, and consolidating them would collapse real
taxonomy distinctions: `throughput` (work per unit time / volume) and
`performance` (latency / response time) are genuinely different
categories with different patterns (`checkpoint-bounded-scans` is a
performance/latency pattern, whereas the throughput patterns are
about volume); `observability` is its own class, held by
`dead-mans-switch`. Governing principle: the taxonomy is canonical;
the design accommodates it, never the reverse. Same rule as the
cruxTag registry — categories are content, and content is not bent
to fit a color ramp.

The remaining ramp tokens (`--cat-red`, `--cat-amber`) are reserved
headroom, held aside for a possible sixth category or for semantic
use (error / warning) that would want to feel distinct from the
category ramp.

### Type pairing
- **Display / headings:** Newsreader (serif, opsz 6–72; weights
  400/500/600 + italic). Hero H1 `clamp(2.4rem, 5.2vw, 3.7rem)`,
  line-height 1.03, tracking −0.02em. Section H2/H3 same family,
  500–600.
- **Body / UI:** Inter (400/500/600/700). Body 16px, line-height
  ~1.65, measure ≤ ~34em.
- **Mono / data:** JetBrains Mono (400/500/600). Eyebrows, tags,
  metrics, filters. Letter-spacing 0.08–0.16em on uppercase labels.

### Spacing scale (4-based)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Section padding fluid
via clamp.

### Radius (from ui-context)
chips 6–7px · cards/panels 12px · artifact frame 14px.

---

## 3. Layout structure

```
┌──────────────────────────────────────────────────────────────┐
│ NAV (sticky, blur, bottom border)                              │
│  ◼ behindscale            Catalog  Patterns   [⌕ Search]       │
├──────────────────────────────────────────────────────────────┤
│ HERO  (max 1200, two-col flex, wraps → stack)                  │
│  ── SYSTEM DESIGN, DISSECTED                                   │
│  Real systems, taken apart down       ┌── ● LIVE ARTIFACT ──┐  │
│  to the *one bottleneck* that         │  ┌────────────────┐ │  │
│  defines them.                        │  │  DARK ARTIFACT │ │  │
│  <lede: crux, live model>             │  │  (gold glow +  │ │  │
│  [ Browse the catalog ↓ ]  or jump →  │  │  ring + shadow)│ │  │
│                                       │  └────────────────┘ │  │
│                                       │  drag TRAFFIC…       │  │
│                                       └──────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ TRUST BAND (#F4F2EE) — DISSECTED FROM FIRST-PARTY BLOGS        │
│   Stripe Uber Meta Figma GitHub Slack AWS Netflix Discord Notion│
├──────────────────────────────────────────────────────────────┤
│ CATALOG PREVIEW (top-3 multi-company problem-classes)          │
│  ━━ Priority-blind load shedding            2 SYSTEMS          │
│     SEEN AT Netflix · Uber                                     │
│  ━━ Partial completion under crashes        2 SYSTEMS          │
│     SEEN AT Airbnb · Uber                                      │
│  ━━ Single-table scaling ceiling            2 SYSTEMS          │
│     SEEN AT Figma · Notion                                     │
│                                                                │
│  [ Browse all N breakdowns → ]      one CTA, count derived     │
├──────────────────────────────────────────────────────────────┤
│ FOOTER  ◼ behindscale   Catalog Patterns Sources   FIRST-PARTY │
└──────────────────────────────────────────────────────────────┘
```

**Above the fold, three jobs:** (1) headline states the crux concept
in plain language; (2) the **live artifact is the dominant visual**
(right column, ~1.1fr vs 0.85fr text); (3) recognizable company
names in a trust band directly beneath reinforce credibility without
competing with the artifact. One clear path down = "Browse the
catalog" → `/catalog`.

---

## 4. The dark-in-light seam (the key detail)

The artifact keeps its own dark styling (owns `#0b0d12`, border, 14px
radius). The frame treatment lives *around* it:

- **Gold underglow:** a blurred radial (`rgba(245,184,65,.22)`, blur
  34px) sits behind and slightly below the artifact — reads as brand
  + makes it "glow".
- **Floating jewel shadow:** layered box-shadow on the wrapper —
  `0 34px 70px -28px rgba(11,13,18,.55)` plus a tight `0 2px 4px` —
  lifts it off the paper.
- **Gold hairline ring:** `0 0 0 1px rgba(245,184,65,.22)` as the
  outermost shadow layer — a 1px seam that ties artifact to brand.
- **Light chrome above/below:** a mono caption bar in the *page*
  style — `● LIVE ARTIFACT · PRIORITY-BLIND LOAD SHEDDING` (green
  status dot) and a hint line ("drag TRAFFIC past capacity, then
  flip SHED SMART…"). This answers "what is this?" and "can I trust
  it?" instantly.
- **Breathing room:** generous gap; the frame is `max-width 640px`
  (the artifact's natural width), centered in its column.

---

## 5. Article card

`#FFFFFF`, 1px `#E7E4DE`, 12px radius, 18–20px padding, column flex.
Hover: border → `#D6D2CA`, soft shadow, `translateY(-2px)`.

1. **Row:** source eyebrow (mono, uppercase, muted — e.g.
   `STRIPE ENGINEERING`). Source is first-class per brief.
   **No read-time** — not modeled in the content contract.
2. **Title:** Newsreader 600, ~1.24rem — the crux-framed post title.
3. **One-line cruxSummary:** the single bottleneck compression,
   secondary text, ~0.9rem. Reads from `article.cruxSummary`.
4. **Pattern chips:** mono pills, category-colored (fg + 8%/20%
   bg/border) using the five-category ramp above, max 3, pinned to
   card bottom. Chips link to `/patterns/:slug`; the title links to
   the article (kept as separate links — no nested anchors).

Tags vs chips: chips = the 2–3 named patterns (wayfinding). General
topical tags would be a visually distinct component if added later
— do not merge them.

---

## 6. Problem-class browse view (the catalog's spine)

Primary organization = the crux taxonomy (`cruxTag`). Each group:

- **Header:** 2px top rule (`#1A1A1F`), crux label (Newsreader 600,
  from `content/cruxtags.json`), `N SYSTEMS` count right. The header
  wrapper carries **`id="term-<slug>"`** — the same anchor is the
  target for structured-data `@id` references from article pages,
  the article-page cruxTag chip's lateral link, and the landing
  preview's row link.
- **Definition line:** 1 sentence naming the bottleneck class (from
  `content/cruxtags.json`).
- **`SEEN AT` row (gold-amber mono):** the canonical companies in
  that group (derived from distinct `source.company` across
  members) — this is what makes "every company that hit this
  problem" legible at a glance (the cross-company comparison
  payoff).
- **Cards:** responsive grid `repeat(auto-fill, minmax(310px, 1fr))`.

Group order: **count descending, tie-break alphabetical by label.**
The four two-company groups lead; single-company groups follow in
alpha order.

---

## 7. Search + company filter placement

Both sit in a controls block directly under the catalog heading,
above the groups:

1. **Search field** (full width, mono, magnifier icon, id
   `catalog-search` — the nav "Search" affordance jumps focus here).
   Client-side; matches title, company, source, cruxSummary, crux,
   cruxTag label, and pattern names. **Weight cruxTag/problem-class
   matches as their own result group above article matches** — search
   is a door into the taxonomy, not a text grep.
2. **Company filter** (secondary axis): `COMPANY` mono label +
   chips — `All` + each canonical `source.company` alphabetically.
   Active chip filled (`#1A1A1F`/paper text), inactive border-only.
   Maps to `?source=<slug>` in the real app. Derived from realized
   content only (see `context/architecture.md` → Rendering →
   Company canonicalization).
3. **Result count** line in mono.
4. **Empty state:** dashed panel echoing the query + a "clear
   filters" reset.

---

## 8. Responsive behavior

Achieved with flex-wrap + `clamp()` + auto-fill grid (no fragile
fixed breakpoints):

- **Hero** columns wrap to a single column on narrow screens —
  **text first, then artifact** (correct reading order on mobile).
- **Artifact degradation:** it is percentage-based internally
  (lanes, dots, gate), so it scales down cleanly and stays legible;
  meters and controls flex-wrap; the TRAFFIC slider and SHED SMART
  toggle are full-size touch targets. No horizontal page overflow —
  it shrinks within its `max-width:640px` frame. No separate mobile
  fallback needed; interaction remains usable to ~320px.
- **Cards** collapse to one column; **nav / filter chips / logos**
  all wrap.

---

## 9. Quality floor

- **Focus:** visible `:focus-visible` ring (2px `#2563EB`, 2px
  offset) on all interactive elements.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)`
  neutralizes page transitions/animations. The hero artifact's dot
  flow is JS-driven; provide a paused/static state under
  reduced-motion so it's compliant while still legible.
- **Contrast:** all text uses the token ramp against paper/white
  — gold is never used as text on light; the crux emphasis is
  serif + gold underline, not gold text.

---

## 10. Implementation notes

- **Company "logos" are styled text wordmarks**, not official SVGs
  — drop in real brand marks (monochrome, muted `#8A8A94`, full
  color on hover) when available.
- Article/pattern links point to real routes (`/articles/:slug`,
  `/patterns/:slug`, `/catalog?source=<slug>`).
- Data (crux groups, articles, patterns) is loaded from
  `content/articles/*.json`, `content/patterns/*.json`, and
  `content/cruxtags.json` at build time. The catalog + landing
  preview share a single grouping module (`src/lib/catalogGroups.ts`).
- Hero artifact is embedded via sandboxed iframe pointing at
  `/artifacts/_hero/index.html`, wired identically to article
  artifacts (see `context/architecture.md` → Rendering →
  Site-level artifacts). The dark-in-light seam frame lives outside
  the iframe.
- The hero artifact is **exempt from the standalone-visitor
  contract** (no context block, no article backlink) — the landing
  page wrapper is its context. See `docs/behindscale-taste.md`
  §4 for the editorial rationale.
