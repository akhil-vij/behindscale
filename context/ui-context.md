# UI Context

## Theme

behindscale has two distinct visual environments, used intentionally:

- **Reading shell (light, editorial):** Everything that is text to be read —
  the article index, summaries, problem/solution write-ups, the pattern
  library. Optimized for sustained reading: warm off-white background (never
  pure white), high-contrast text, generous whitespace, comfortable measure
  (line length). Reference points: Stripe docs, Linear blog, Mintlify.
- **Artifact surface (dark, technical):** The interactive artifacts embedded
  per article. These stay dark — like a code editor or dashboard embedded in
  documentation. The contrast with the light shell creates hierarchy and
  signals "interactive exploration zone." Artifacts own their own internal
  styling (they are self-contained bundles in iframes) but should align with
  the dark token palette below for consistency.

There is no user-facing light/dark toggle initially. The shell is light; the
artifacts are dark. This is a deliberate design choice, not a missing feature.

## Colors

All shell components use these CSS custom properties — no hardcoded hex
values anywhere in `src/`. Artifacts (self-contained) should mirror the dark
tokens for visual continuity.

### Reading shell (light)

| Role                | CSS Variable          | Value     |
| ------------------- | --------------------- | --------- |
| Page background     | `--bg-base`           | `#FBFAF8` |
| Surface (cards)     | `--bg-surface`        | `#FFFFFF` |
| Surface (subtle)    | `--bg-subtle`         | `#F4F2EE` |
| Primary text        | `--text-primary`      | `#1A1A1F` |
| Secondary text      | `--text-secondary`    | `#52525B` |
| Muted text          | `--text-muted`        | `#8A8A94` |
| Primary accent      | `--accent-primary`    | `#2563EB` |
| Accent (hover)      | `--accent-hover`      | `#1D4ED8` |
| Border (default)    | `--border-default`    | `#E7E4DE` |
| Border (strong)     | `--border-strong`     | `#D6D2CA` |
| Success             | `--state-success`     | `#15803D` |
| Error               | `--state-error`       | `#DC2626` |
| Code background     | `--code-bg`           | `#F4F2EE` |

### Artifact / dark tokens (for artifact bundles and any dark embed)

| Role                | CSS Variable          | Value     |
| ------------------- | --------------------- | --------- |
| Artifact background | `--art-bg`            | `#08090D` |
| Artifact surface    | `--art-surface`       | `#0F1118` |
| Artifact surface 2  | `--art-surface-2`     | `#161922` |
| Artifact border     | `--art-border`        | `#1F2333` |
| Artifact text       | `--art-text`          | `#C8CDD8` |
| Artifact text muted | `--art-text-muted`    | `#6B7280` |

### Pattern / tag accent ramp (shared, used for categorizing patterns)

Use these for tag chips, pattern category coding, and artifact accents so
colors mean the same thing everywhere.

| Role     | CSS Variable    | Value     |
| -------- | --------------- | --------- |
| Blue     | `--cat-blue`    | `#2563EB` |
| Green    | `--cat-green`   | `#15803D` |
| Orange   | `--cat-orange`  | `#EA580C` |
| Purple   | `--cat-purple`  | `#7C3AED` |
| Cyan     | `--cat-cyan`    | `#0891B2` |
| Red      | `--cat-red`     | `#DC2626` |
| Amber    | `--cat-amber`   | `#B45309` |

## Typography

Reading comfort is the priority for the shell. Use a clean, modern sans for
UI and body, and a monospace for code, tags, and artifact text.

| Role           | Font                          | Variable        |
| -------------- | ----------------------------- | --------------- |
| UI + body text | Inter (fallback: system sans) | `--font-sans`   |
| Headings       | Inter (tight tracking)        | `--font-sans`   |
| Code / mono    | JetBrains Mono (fallback mono)| `--font-mono`   |

Type scale (shell): body 16px / line-height 1.7; small 14px; captions 12px;
h1 ~32px, h2 ~24px, h3 ~18px. Keep body measure to ~68–75 characters.

## Border Radius

| Context              | Class            | Value |
| -------------------- | ---------------- | ----- |
| Inline / chips / tags| `rounded-md`     | 6px   |
| Cards / panels       | `rounded-xl`     | 12px  |
| Modals / overlays    | `rounded-2xl`    | 16px  |
| Artifact iframe frame| `rounded-xl`     | 12px  |

## Component Library

- Tailwind CSS as the styling system. Optionally shadcn/ui for primitives
  (buttons, inputs, dialog) — if used, components live in `src/components/ui/`
  and are added via the CLI rather than hand-written.
- All custom components consume the CSS variable tokens above via Tailwind
  theme extension. No raw hex in component files.

## Layout Patterns

behindscale has **two equally prominent navigation surfaces**: the article
feed and the pattern library. Both are reachable from the navbar at all
times. Article cards expose the patterns they embody; pattern cards expose
the articles that embody them. The reader can enter from either side and
traverse to the other.

- **Article index (home, `/`):** centered single-column feed
  (max-width ~960px) of article cards; left-aligned filter/tag rail on
  desktop that collapses above the feed on mobile. Each article card shows
  source attribution (eyebrow), title, a short summary, and **2–3 pattern
  chips** identifying the patterns this article embodies.
- **Article page (`/articles/:slug`):** centered reading column
  (max-width ~720px) for the summary; the interactive artifact breaks out to
  a wider container (max-width ~960px) and sits in a dark, rounded frame.
  Pattern chips appear in the article header (below source attribution) and
  again in a "Patterns in this article" section near the bottom of the
  reading column, each linked to its pattern detail page.
- **Pattern library index (`/patterns`):** grid of pattern cards on desktop
  (3 columns), single column on mobile. Each card shows the pattern name,
  its category (if set), its frequency count
  ("Seen in 7 articles across 5 companies"), and a 1–2 line teaser drawn
  from the start of the definition. Cards link to the pattern detail page.
  Optional flat category filter at the top.
- **Pattern detail page (`/patterns/:slug`):** centered reading column
  (max-width ~720px) for the definition, when-it-applies, and tradeoffs.
  Below that, a section titled "Seen in" that lists every article embodying
  this pattern as cards — each showing source attribution, article title,
  and the per-article note (how *this* article applies the pattern). This
  is the durable-knowledge surface; treat it with the same reading-comfort
  rigor as the article page.
- **Navbar:** light top bar with a bottom border (`--border-default`),
  wordmark left, two primary nav items ("Articles", "Patterns") centered or
  inline-right, search affordance and any secondary links right.

### Pattern Chips

Pattern chips are the bidirectional cross-link between articles and
patterns. They appear on article cards, in article headers, in artifact
contexts when relevant, and on pattern-back-link cards.

- Visual: small pill, `rounded-md`, `--font-mono`, color-coded by category
  using the `--cat-*` ramp (if the pattern has a category) or a neutral
  border + text style if uncategorized.
- Behavior: always a link to the pattern detail page (`/patterns/:slug`).
- Constraint: never more than 3 chips visible on a card at once; if an
  article embodies more, show the first 3 and a "+N more" affordance.
- Hover/focus: light surface fill, never a hard color shift.
- A chip is a wayfinding element, not a tag in the broad sense. Tags
  (general topical labels like "load-shedding") are visually distinct from
  pattern chips; do not collapse the two into one component.

### Source Attribution

Source attribution is a first-class element, not a footnote. Every place an
article is referenced — index cards, article page header, pattern library
back-links — shows where it came from, prominently and consistently.

- **Article card (in the index):** the `source.name` appears as a small
  uppercase eyebrow above the article title (e.g. "UBER ENGINEERING"),
  styled with `--text-muted` and `--font-mono`. The article date sits
  beside it. The card itself is a link to the article page; the source
  name additionally links to a filtered view of all articles from that blog.
- **Article page header:** below the title, render a source row with:
  the `source.name` (linked to `source.url`, opens in new tab), a separator,
  the publish date, and a small "↗ Read original" link that points to
  `article.url`. The reader should never have to hunt for where this came
  from or how to find the source post.
- **Pattern library back-links:** every article-link under a pattern shows
  `source.name` alongside the article title so the breadth of a pattern
  across companies is visible at a glance ("seen in Uber, Stripe, Airbnb").
- **Filter affordance:** the article index supports a source filter
  (chips/dropdown) sourced from `pipeline/feeds.json`. Selecting one
  narrows the index to articles from that source.

Attribution must never be styled in a way that visually competes with the
article title — it is a credibility signal and a wayfinding cue, not the
headline. Muted token, smaller size, distinct typographic treatment.

- **Artifact embed:** dark rounded frame with a thin border and subtle
  shadow, full-width within its container, with a small "open in full" affordance.

## Icons

- Lucide React. Stroke-based icons only.
- Sizes: `h-4 w-4` for inline/text-adjacent, `h-5 w-5` for buttons and nav.
- Icons inherit text color via `currentColor`; no multi-color icons.

## Responsive

- Mobile-first. The reading shell must be fully comfortable on a phone
  (this is a stated product goal — browsing on mobile while commuting).
- Artifacts are dark dashboards; ensure they scroll horizontally within their
  iframe rather than forcing the page to overflow.
