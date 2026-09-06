# Authoring Problem Pages — Workflow Guide

A hands-on guide to creating and enriching the `/problems/<slug>` pages. For the
full technical spec (schema, rendering rules, SEO, invariants) see
`docs/problem-page-design.md` — this doc is the *how-to*.

---

## 1. The mental model

- **Every problem page already exists**, auto-built from your articles. You
  never *create* a page — you *enrich* one that's already live.
- **One optional file per class** enriches its page:
  `content/problems/<cruxTag>.json`. No file = the minimal auto-built page.
- **You add content one block at a time.** Each block you author *replaces* the
  auto-built version of that section. Leave a block out and the page falls back
  to the derived version. There is no "half-finished" state — a page with just
  a one-line `lede` is complete and correct.

The one rule the page follows, top to bottom:

> **authored if you wrote it · else auto-built if it can be · else hidden.**

So enriching is always safe and always incremental. You can stop at any point.

---

## 2. The lookup table (page ↔ file ↔ class)

The page URL you see and the file you create are named differently on purpose:

- The **URL** uses a short public slug (`/problems/queue-backlog`).
- The **file** is named by the frozen internal key, the **cruxTag**
  (`content/problems/buffer-degrades-under-backlog.json`).

The filename **must** equal the cruxTag exactly (the validator enforces this),
so use this table to go from the page you're looking at to the file to create:

| Class (page heading) | Page URL `/problems/…` | File to create `content/problems/….json` |
|---|---|---|
| Priority-blind load shedding | `blind-load-shedding` | `priority-blind-load-shedding.json` |
| Partial completion under crashes | `interrupted-operations` | `partial-completion-under-crashes.json` |
| Single-table scaling ceiling | `outgrowing-one-table` | `single-table-scaling-ceiling.json` |
| Ambiguous failure under retry | `ambiguous-timeouts` | `ambiguous-failure-under-retry.json` |
| Single-cluster scaling ceiling | `outgrowing-one-cluster` | `single-cluster-scaling-ceiling.json` |
| Blast radius scales with cluster size | `cluster-blast-radius` | `blast-radius-scales-with-cluster-size.json` |
| Buffer degrades under backlog | `queue-backlog` | `buffer-degrades-under-backlog.json` |
| Gray failure defeats automatic detection | `gray-failure` | `gray-failure-defeats-automatic-detection.json` |
| Observer shares fate with observed | `blind-during-outages` | `observer-shares-fate-with-observed.json` |
| Retry-amplified overload | `retry-storms` | `retry-amplified-overload.json` |
| Mitigation scoped narrower than the failure | `mitigation-gaps` | `mitigation-scoped-narrower-than-failure.json` |
| Degraded state outlives its trigger | `metastable-failure` | `degraded-state-outlives-its-trigger.json` |
| Unrecorded config outlives its authors | `undocumented-config` | `unrecorded-config-outlives-its-authors.json` |
| Placement precedes the access pattern | `blind-data-placement` | `placement-precedes-the-access-pattern.json` |

(Source of truth: `content/cruxtags.json`. To regenerate this table:
`node -e 'const r=require("./content/cruxtags.json");for(const[k,e]of Object.entries(r))console.log(k,e.urlSlug,e.label)'`.)

---

## 3. Your first pass: the 14 ledes

A **lede** is one punchy sentence under the page title. It's the highest-value,
lowest-effort upgrade: it improves the page *and* becomes the page's Google /
social search description automatically.

### Step 1 — create the file

Make the folder if it doesn't exist yet, then one file per class. Minimum
content is just the key plus the lede:

```json
// content/problems/buffer-degrades-under-backlog.json
{
  "cruxTag": "buffer-degrades-under-backlog",
  "lede": "The queue you added to protect your system becomes the thing that takes it down."
}
```

Two must-haves:
- `cruxTag` matches the filename (see the table).
- `lede` is one non-empty sentence.

### Step 2 — check it

```
npm run validate
```

Green = good. If something's off you get a precise, one-line reason (see §6).

### Step 3 — see it / ship it

`npm run build` produces the page locally; commit + push deploys it. The lede
appears in italics under the title, and the page's search description switches
from the generic class definition to your sentence.

### What makes a good lede

- One sentence, plain language, no jargon a non-expert would trip on.
- Name the trap, not the fix ("the queue you added to protect your system
  becomes the thing that takes it down").
- It's the search snippet too, so it should read well standalone.
- **Don't** restate the class label; the label is already the heading.

Send me the 14 sentences and I can create the files, or drop them in yourself —
either way `npm run validate` is the safety net.

---

## 4. What each field does (and what it upgrades)

Fields you can author **today**. Every field except `cruxTag` is optional.

| Field | Type | What it does on the page | Also upgrades |
|---|---|---|---|
| `cruxTag` | string (required) | identifies the class; must equal the filename | — |
| `headline` | string | replaces the class label as the big H1; the label moves up into the small eyebrow line | page `<title>` |
| `lede` | string | one italic sentence under the title | **search description** |
| `intro` | string[] | opening paragraph(s) above "The wall" | search description (1st sentence, if no lede) |
| `edition` | number | (stored now) newsletter edition number | future newsletter list |
| `firstSentAt` | date | (stored now) when first sent | future provenance line |
| `extraSections` | list | reserved escape valve for one-off sections | *(not rendered yet — see §7)* |

Search-description priority: `lede` → first `intro` sentence → class definition.
So a lede alone gives you a hand-written snippet on every one of these pages.

### A richer example

```json
{
  "cruxTag": "ambiguous-failure-under-retry",
  "headline": "Your payment API timed out. Did the charge go through?",
  "lede": "A timeout tells you nothing about whether the work happened.",
  "intro": [
    "The request went out. The timer expired. No response came back.",
    "Now you have to guess — and guessing wrong either drops the work or does it twice."
  ]
}
```

Everything else on the page (the company rows, the pattern chips, the breakdown
cards) is still auto-built from your articles. You only author what you want to
override.

### 4b. The rich blocks (the v7.3 port, 2026-09-06)

`/problems/ambiguous-timeouts` is the first page with every rich block
authored (`content/problems/ambiguous-failure-under-retry.json` is the
worked example). Every block is optional and render-when-present; the shell
hard-codes none of a wall's mechanics, so a second wall is authored the same
way. One sentence per field on how a second wall uses it:

| Field | What it renders | A second wall... |
|---|---|---|
| `figures[]` + `wall.figureSlug` | the no-JS stand-in for the try-it artifact, through the figures pipeline (`content/figures/<cruxTag>/<slug>.svg`, `<img>`-loaded inside `<noscript>`) | draws its own wall figure; the eight figure checks apply unchanged |
| `howItWorks[]` | the "how this page works" strip under the lede (one mono eyebrow line, ` · `-separated): the reader's path, e.g. "Cause it · Build it · Survive a day · Compare with five real systems" | writes its own three or four items |
| `stations[]` `{id, anchor, label, minutes, openEnded?, estimate?}` | the sticky station nav with its `· N MIN` budgets and scroll-spy; the list-page estimate is the sum of `estimate: true` budgets rounded up to 5 (no stored estimate) | sets its own budgets; the estimate follows |
| `wall` `{prose[], figureSlug?, stats[], statsCaption?}` | "The wall": authored prose replaces the derived definition paragraph; the stat strip (each number company-attributed) | authors its own wall prose and stats |
| `tryIt` `{artifactSlug, teaser, caption, noscript?}` | the try-it artifact (960px breakout, bare) + its caption; the teaser is the frame title and the no-JS line; `noscript` adds one plain sentence to that fallback (what the artifact lets you do) | points at its own `content/artifacts/<slug>.jsx` |
| `mission` `{artifactSlug, teaser, title, intro, decisionsSummary?, outline?, stopblock?, stuckNote?}` | the build-it artifact + the page-flow stop block; **presence lights the /problems Playable badge** (teaser + estimate). With `decisionsSummary`, the intro carries a `{{decisions}}` marker where the shell composes "<N> decisions are yours — <summary> — and the goal is a day of traffic, survived." (N counted from `outline.decisions`) | points at its own mission bundle that speaks protocol v1; supplies its own clause |
| `mission.outline` `{decisions[{label, options[]}], events[], attacks[{company, year, text}]}` | the static "What's inside the mission" card above the artifact (three columns: your N decisions · the day, N events · N attacks, from the posts; closing line names the comparison's next column) AND the same three lists as plain text inside the frame's `<noscript>` -- what a crawler or no-JS reader sees of the mission | lists its own deck groups, events and attacks; headings and counts compose |
| `comparison` | the hint sheet: `spectrum` (points at `left` %), `legend`, `diagramRows[]` (inline SVGs from `content/problems/<cruxTag>/<svg>.svg`, company → article link), `you` (empty + filled SVGs; `{{slot}}`s filled from the wall module), `columns` + `matrixRows[]` (row `id` == youMapping key; a cell is a string or `{ns}` for the dashed-gap "not stated"), `questions[]` (answers per company, `ns` for not-stated, optional inline `figure`) | authors as many columns, rows, and questions as it has -- the shell counts nothing |
| `decide` `{intro, rows[{if, then, highlights?}], elsewhere?}` | "Which answer is yours"; a row with `highlights` (company names as in `comparison.columns`, one or several) is clickable and lights those columns in the at-a-glance table (the YOU column's grammar), scrolling the table into view if needed | its own constraint → article rows, each naming the column(s) it points at (the validator checks them against the columns) |
| `steal` `{intro, items[{rule, text, qref?}]}` | "What to steal", each rule linking its question | its own rules |
| `interview` `{asks[], shape, followupsIntro, followups[{ask, attack, held}], senior, staff, closing, redFlags[]}` | the five interview parts; one follow-up row per attack, each with a live tick | one row per attack its mission runs (the validator checks the count) |
| `patterns` `{intro, order?}` | the intro line; chips stay DERIVED from the members, `order` only sequences them | optional |
| `cards` `{title?, intro, teasers?}` | "Every article" cards (chronological) with a break-it line per member (override of the article's own teaser) | optional overrides |
| `sources` `{intro, items[{label, articleSlug}]}` | the "Read the originals" line; URLs derive from the member articles | its own labels |

Inline markup in every prose field: `**bold**`, `[text](/path)`,
`[text](#anchor)`. Copy uses spaced hyphens, never em-dashes.

**Per-wall code.** The one thing that is code, not content, is the
`youMapping()` that turns the mission's emitted state into the YOU cells /
diagram slots / ticks: `src/walls/<wall>.ts`, registered by cruxTag in
`src/walls/index.ts`. The validator refuses a `comparison` whose row ids or
`{{slot}}`s the wall module doesn't return, and warns when a comparison has no
wall module (the YOU column would never fill).

**Per-wall artifacts.** Each artifact is one self-contained `.jsx` with its
stylesheet inline. Two rules learned the hard way (2026-09-06): scope the
CSS reset as `:where(#<root>) * { margin: 0; padding: 0; box-sizing:
border-box }` -- an `#id *` reset carries ID specificity and silently
outranks every class rule's padding and margin -- and set muted labels in
the local `--art-muted: #98A1B0` (the site's `#6B7280` is 3.9:1 on the dark
surface, under the 4.5:1 floor for 9-11px text; open decision #22 holds
the token question). Fonts stay the fallback mono stack; a sandboxed bundle
fetches nothing.

**Validation.** `npm run validate` checks every shape and cross-reference:
member articles, pattern order, question refs, station anchors, inline SVG
existence + the figure-svg-safe allowlist, YOU keys vs the wall module, and
one interview row per attack. `npm test` runs the rules-parity and
click-through suites; `npm run test:e2e` the browser suite (round-trip, text
parity against the reference build, no-JS, prerender, mobile scroll chaining).

---

## 5. The end-to-end workflow

```
1. Pick a class            → find its cruxTag in the table (§2)
2. Create/edit the file    → content/problems/<cruxTag>.json
3. npm run validate        → catches shape + naming mistakes (fast)
4. npm run build           → renders the page locally to preview
5. commit + push           → deploys
```

Steps 3–4 also run automatically on deploy, so a broken file can never ship —
the build fails loudly instead.

---

## 6. When something's wrong

The validator gives a one-line reason and a fix. Common ones:

| Message | Meaning | Fix |
|---|---|---|
| `filename … must equal its cruxTag …` | file named by the URL slug, not the cruxTag | rename to `<cruxTag>.json` (§2) |
| `cruxTag … has no entry in content/cruxtags.json` | typo in `cruxTag` | copy it exactly from the table |
| `lede expected non-empty string when present` | empty or blank lede | write a sentence or remove the field |
| `intro expected array of non-empty strings` | `intro` is a string, not a list | wrap paragraphs in `[ "…", "…" ]` |
| `more than one problem essay declares cruxTag …` | two files for one class | keep one |

---

## 7. Growing a page richer over time

The full design (`docs/problem-page-design.md`) defines more blocks — a metric
grid, hand-written "vantage" rows, a deep-dive, number charts, a "what to steal"
list, a simulator link, diagrams. These are **not authorable yet**: each one
ships when its on-page renderer is built, as one reviewed unit
(schema + renderer + validator rule + email handling). We add them in priority
order as you want them.

**How to ask for the next block:** tell me which class you want to enrich and
what it needs (e.g. "queue-backlog needs the hand-written company rows"), and
I'll build that block's renderer + extend the validator, then you author it the
same way — add a field to the JSON.

`extraSections` exists as a reserved field for genuinely one-off sections; it's
validated but not rendered yet, and it's the incubator — when a one-off shape
recurs across classes it graduates into a real block.

---

## 8. Turning on "Subscribe"

The problem pages have a built-in "Subscribe" card that stays **hidden** until a
signup link exists. When you have one (e.g. a Buttondown page), set it once:

```ts
// src/config/site.ts
export const newsletterSignupUrl = 'https://yourname.buttondown.email/'
```

That single value turns the Subscribe card on across **every** problem page.
Leave it empty and nothing renders (the current state) — so we never link to a
page that doesn't exist yet.

---

## 9. Quick reference

- **Files live in:** `content/problems/<cruxTag>.json`
- **Naming:** filename = `cruxTag` (see §2 table), page URL = the short slug
- **Check:** `npm run validate`
- **Author today:** `headline`, `lede`, `intro` (+ stored `edition`,
  `firstSentAt`), and the rich blocks of §4b (`stations`, `wall`, `tryIt`,
  `mission`, `comparison`, `decide`, `steal`, `interview`, `patterns`,
  `cards`, `sources`, `figures`)
- **Full spec:** `docs/problem-page-design.md`
