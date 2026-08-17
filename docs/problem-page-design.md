# Problem Detail Page — Technical Design & Contract

Version 1.1 · 2026-08-17 · Governs `src/pages/ProblemDetail.tsx`,
`src/types/problemEssay.ts`, the `content/problems/*.json` content type, the
`problemMeta()` prerender builder, and the `problem-essay` validator.

Grounded in the two prototype comps in `Behindscale_nav_design.zip`:
`problem-queue-backlog.dc.html` (**minimal**) and
`problem-ambiguous-timeouts.dc.html` (**full**).

## 0. Review rulings folded (v1.1, 2026-08-17)

Owner review — APPROVED as the governing contract. Changes folded in:

- **Continuum supersedes the D3 binary gate (ratified).** File presence
  *enables authored sections*; it does not switch a page between two
  templates. The plan's `problemEssayBySlug.has()` starter/full gate is
  retired language.
- **Phase-5b "Also in this class" strip is RETIRED — do not build it.** The
  per-row `vantageRows` fallback (unmatched members keep derived rows)
  dissolves the drift seam entirely; a newly published member appears in the
  strip automatically. The non-blocking drift **WARNING** stays (§9). §13
  suppress-when-covered is the anti-redundancy half of the same design.
- **D-1…D-4 ruled** (§11, now "Resolved decisions").
- **Addition — `extraSections` escape valve** (§5a): one generic
  authored-section list so the schema can never say "no" to an editor.
- **Addition — email degradation per block** (§10): every block type defines
  how it degrades in the sent email, in the same reviewed step that adds it.
- **Addition — config-gated subscribe** (§3 row 16, §5b): the subscribe
  surface renders when a site-config newsletter URL is set (external
  Buttondown now, `/newsletter` at Phase 6) — not gated on Phase 6.
- **Meta description fallback widened** to `lede ?? intro[0] ?? definition`
  (§7).
- **"All 14" is "all classes" by construction.** The 15th class (round 37)
  enters as a pure derivation event (registry entry + urlSlug + articles →
  minimal page, no essay). Invariant 1 working as designed.

---

## 1. Principle: one template, progressively authored

There is **one** page template and **one** URL per class. It renders on a
continuum:

- **Minimal state** — no essay file. Every section is derived from existing
  article content (the `queue-backlog` comp). This is how all 14 classes ship.
- **Authored states** — a `content/problems/<cruxTag>.json` exists. Each block
  it contains **replaces or augments** its derived placeholder. Fill every
  block and you get the full state (the `ambiguous-timeouts` comp).

There is **no binary starter/full gate** (this supersedes the plan's D3
`problemEssayBySlug.has()` switch). The rule is per-section:

> **render(section) = authored-if-present, else derived-if-derivable, else omit.**

Two consequences that bind everything below:

- **Derive-or-die (P0).** No authored file is required for a correct page. No
  stored counts; members, company counts, patterns, dates all derive.
- **Render-when-present.** A section with neither authored content nor a
  derivation simply does not render (invariant 6 — never throw, never a hole).

---

## 2. Routing & resolution

- Route: `/problems/:urlSlug` → `ProblemDetail` (ordered after `/problems`).
- `urlSlug` → `cruxTag` via `cruxTagByUrlSlug` (`src/content`). Unknown slug →
  inline not-found (never throws).
- The essay file is keyed by the **frozen `cruxTag`**, not the urlSlug:
  `content/problems/<cruxTag>.json`. An editorial urlSlug rename never orphans
  an essay. Filename **must equal** the `cruxTag` field (validator-enforced);
  the field is authoritative.
- `cruxTag` is the join key everywhere: registry entry, article `about` @id,
  essay key, member filter. `urlSlug` is public/routing only.

---

## 3. Section contract (source of truth per section)

Order is top-to-bottom. "Derived" = computed now. "Authored" = from
`ProblemEssay`. "Status": `live` (wired today) · `incremental` (renderer lands
with the first class that authors it) · `phase-6` (gated on `/newsletter`).

| # | Section | Minimal (derived) | Full (authored) | Render rule | Status |
|---|---------|-------------------|-----------------|-------------|--------|
| 1 | Eyebrow | `Problem · seen at N companies` | `Problem · <label> · seen at N companies` | always; label joins only when `headline` present | live |
| 2 | H1 | class `label` | `headline` | `headline ?? label` | live |
| 3 | Lede | authored italic teaser | (folded into intro) | render `lede` when present; suppress when `intro` present | live |
| 4 | Provenance strip | — | "First sent as Edition N · updated as new evidence lands" + newsletter link | render when `edition` present **and** `/newsletter` exists | phase-6 |
| 5 | Intro prose | — | paragraphs | render `intro[]` when present | live |
| 6 | Metric grid | — | metric cards + caption | render `metricGrid` when present | incremental |
| 7 | The wall | registry `definition` + generic synthesis | authored prose + diagram (figure) | authored `wall` replaces definition; else definition (+ synthesis when `N>1`) | live (derived) / incremental (authored) |
| 8 | Same wall, N systems | rows: company/source + `cruxSummary` + breakdown link | rows: accent dot + company(+link) + year + tag + hand-written line + link | `vantageRows` replace derived rows 1:1 by `articleSlug`; unmatched members keep derived rows | live (derived) / incremental (authored) |
| 9 | Deep dive | — | title + prose + step cards + callout stat | render `deepDive` when present | incremental |
| 10 | The numbers that stick | — | prose + chart figures + captions | render `numbers` when present | incremental |
| 11 | What to steal | — | takeaway cards | render `whatToSteal` when present | incremental |
| 12 | Patterns in this class | neutral chips (derived union) | same | always when non-empty | live |
| 13 | Every breakdown | source·date + title cards | (full omits — vantage rows cover all systems) | render derived cards **unless** `vantageRows` covers every member | live |
| 14 | Interview corner | — (no question cites it) | "if this comes up…" card + guidance + question link | render when `questionsByCruxTag` has an entry (Phase 4); `interviewNote` augments | phase-4 |
| 15 | Simulator CTA (dark) | — | "break it yourself" + button → article | render `simulator` when present | incremental |
| 15b | **Extra sections** (escape valve) | — | authored `{title, blocks}` list | render each when present; fixed insertion point (between §11 and §12) | incremental |
| 16 | Subscribe ("The weekly") | — | static pitch + originals list | render when a site-config newsletter URL is set (external now, `/newsletter` at Phase 6) | config-gated |

**Section 13 rule (important):** "Every breakdown" is the derived
member-card grid. It renders in the minimal state. In the full state it is
**suppressed when `vantageRows` already covers every member** (the full comp
drops it), preventing a redundant second listing of the same systems.

---

## 4. Derived data contract

All derivations read the in-memory `articles` / `patternBySlug` /`cruxtags`
(`src/content`). For a class keyed `cruxTag`:

- **members** = `articles.filter(a => a.cruxTag === cruxTag)`, already sorted
  `publishedAt` desc (matches comp row/card order).
- **company count** = distinct `member.source.company`.
- **derived vantage row** (per member) = `member.source.company` +
  `member.source.name` + `member.cruxSummary` + link to `/articles/<slug>`.
- **derived breakdown card** (per member) = `source.name · <formatted date>` +
  `member.title` + link.
- **pattern chips** = union of members' `patterns[].slug`, resolved against
  `patternBySlug` (skip unresolved), alphabetised. Neutral styling only —
  pattern categories are not colour-encoded on this surface.
- **synthesis line** (minimal "The wall") = `"<N> teams hit this wall; the
  breakdowns below are the evidence."`, rendered only when `N > 1`. Generic by
  design — no per-class noun invented.

---

## 5. Data model — `ProblemEssay`

Full target schema. **Every field except `cruxTag` is optional.** Fields are
grouped by build status; `incremental` shapes are *proposed* and finalised when
the block's renderer + validator land together (§10).

```ts
interface ProblemEssay {
  // — identity (required) —
  cruxTag: string            // frozen key; must equal filename and resolve to a registry entry

  // — header (LIVE) —
  headline?: string          // → H1; label moves to eyebrow
  lede?: string              // italic teaser; suppressed when `intro` present
  intro?: string[]           // opening prose paragraphs

  // — provenance (stored now; strip renders in PHASE 6) —
  edition?: number           // positive int, unique across essays; feeds /newsletter list
  firstSentAt?: string       // ISO date

  // — rich blocks (INCREMENTAL; shapes proposed) —
  metricGrid?: MetricCard[]          // + metricGridCaption?
  metricGridCaption?: string
  wall?: ProseBlock[]                // authored "The wall"; prose may carry {{figure:…}} markers
  vantageRows?: VantageRow[]         // replaces derived rows by articleSlug
  deepDive?: { title: string; blocks: DeepDiveBlock[] }
  numbers?: NumberBlock[]            // "the numbers that stick"
  whatToSteal?: Takeaway[]
  simulator?: { articleSlug: string; eyebrow?: string; blurb: string; ctaLabel?: string }
  interviewNote?: string             // OPTIONAL override of the derived interview corner (Phase 4)

  // — escape valve (LIVE as a field stub; renderer incremental) —
  extraSections?: { title: string; blocks: ProseBlock[] }[]  // see §5a

  // — essay-hosted figures (INCREMENTAL; reuses the figures system) —
  figures?: Figure[]                 // wall diagram, number charts, etc. — see §6
}

interface MetricCard  { value: string; label: string; source: string }
interface VantageRow  { articleSlug: string; year?: string; tag?: string; line: string }
interface Takeaway    { lead: string; body: string }
// ProseBlock / DeepDiveBlock / NumberBlock: discriminated unions
//   { kind: 'prose'; text: string }               // text may carry figure markers
//   { kind: 'steps'; steps: { text: string; emphasis?: boolean }[] }
//   { kind: 'stat';  value: string; label: string }
//   { kind: 'chart'; figure: string; caption?: string }   // chart == an SVG figure
```

Notes:

- **`vantageRows` are keyed by `articleSlug`.** A row replaces exactly one
  derived member row. Members without an authored row keep their derived row —
  so a half-authored class is coherent (this is the Phase-5b drift seam: the
  derived fallback *is* the "also in this class" safety net, per-row).
- **The vantage-row company dot** is **not authored per row** and **never a
  raw hex** — it derives from an optional token-name accent on the *company
  registry* entry (D-1), neutral until that exists.
- **Company link** in a vantage row renders only when that company has a
  `/companies/<slug>` page (Phase 5) — render-when-present.
- **`lede` vs `intro`.** Minimal uses `lede`. When `intro` is authored the lede
  is suppressed (the full comp opens on intro prose, no separate italic line).

### 5a. `extraSections` — the flexibility escape valve

The 16 slots are a closed set; a future timeline, glossary box, or
"spot-this-in-your-own-system" checklist would each force a schema change.
`extraSections` is one generic authored-section list that keeps the schema from
ever saying "no" to an editor, without breaking the one-template / fixed-order
promise (readers learn the page shape):

- Rendered at a **single fixed insertion point** — between `whatToSteal` (§11)
  and the pattern chips (§12).
- Each entry is `{ title, blocks: ProseBlock[] }`; the `ProseBlock` union
  (prose / steps / stat / chart) means figures work inside it with no new
  machinery.
- **Incubator, not destination.** When a bespoke section shape recurs across
  classes it is PROMOTED to a first-class block with its own renderer +
  validator rule (the deliberate-schema rule still governs).

Shipped now as a **field stub** (schema + validator shape rule); its renderer
lands with the `ProseBlock` renderers (incremental).

### 5b. Subscribe surface — config-gated, not Phase-6-gated

The newsletter signup will exist as an **external hosted page (Buttondown)**
weeks before `/newsletter` ships. So the subscribe section (and the footer
link) render whenever a single site-config value — `newsletterSignupUrl` — is
set: external URL now, `/newsletter` at Phase 6 (one value flips it). Invariant
7 is honoured because the target exists before the link does. Empty config →
the section does not render (current state).

---

## 6. Figures integration

The full comp's diagrams (the 3-case client/server diagram) and charts (timeout
bars, exponential-backoff bars) are **SVG figures**, not bespoke React. The
essay becomes a **third figure host** alongside articles and patterns:

- `figureHosts(content)` (`scripts/figure-hosts.ts`) yields an entry for each
  essay: `{ slug: cruxTag, kind: 'problem', figures, markerFields, … }`.
- Storage: `content/figures/<cruxTag>/<figure-slug>.svg` (flat, host-agnostic —
  same as articles/patterns).
- Marker fields (where `{{figure:<slug>}}` is legal): `wall` prose blocks,
  `deepDive` prose blocks, `numbers` chart blocks.
- All eight existing figure checks + the `<img>`-sandbox security model + the
  count ceiling apply unchanged. **No new figure machinery.**

This is deferred with the rich blocks (incremental); noted here so the schema
above is figure-ready by construction.

---

## 7. SEO / prerender / JSON-LD contract

`problemMeta(group, urlSlug)` (`scripts/prerender.ts`), per class with members:

- **title** = `"<headline ?? label> — behindscale"`.
- **description** = `truncate(lede ?? intro?.[0] ?? definition, 160)` — an
  authored intro's first sentence beats the registry definition.
- **canonical** = `/problems/<urlSlug>`.
- **JSON-LD** (three nodes):
  - `CollectionPage` `@id: /problems/<urlSlug>`, `mainEntity` = `ItemList` of
    member article URLs.
  - `DefinedTerm` `@id: cruxTagTermId(cruxTag)` (= `/problems#term-<cruxTag>`,
    the frozen workbench anchor — **reused, not minted**), `name`=label,
    `description`=definition, `subjectOf: /problems/<urlSlug>`. The term
    identity stays the class (label + definition), independent of the essay's
    hook line.
  - `BreadcrumbList`: Home → Problems → `label`.
- **@id assertion.** The `DefinedTerm` @id is already in the emitted set (the
  prerender assertion loops all registry slugs), so class pages satisfy it with
  no new edge. `subjectOf` targets a page URL, not a term-id — outside the
  term-id contract. **The assertion must stay green with zero changes.**
- **Sitemap:** one `/problems/<urlSlug>` per class with members, no `lastmod`
  (derived surface).

---

## 8. Invariants (must always hold)

1. **No essay required.** Deleting every `content/problems/*.json` leaves one
   correct minimal page per class (14 today; the 15th appears from its registry
   entry + articles alone).
2. **No throw on bad input.** Unknown urlSlug, missing registry entry,
   unresolved article/pattern slug → skip-and-flag, never crash.
3. **No stored counts.** Every count/date/list derives from `articles`.
4. **Frozen article schema.** Problem essays never require article-JSON
   changes; the essay is additive and separate.
5. **Token-only styling.** No hardcoded hex in `src/` (the comps already use
   our light-shell tokens 1:1).
6. **@id assertion green** through every authoring state.
7. **No link to a 404.** Newsletter/company/question links render only when
   their target surface exists.

---

## 9. Validator contract (`scripts/checks/problem-essay.ts`)

Runs when any `content/problems/*.json` exists. Scope grows with the schema;
**today's scope** (the header blocks we render) is marked ✅, forward rules are
marked ▢.

- ✅ `cruxTag` present, kebab-case, resolves to a `cruxtags.json` entry.
- ✅ filename (basename without `.json`) equals `cruxTag`.
- ✅ at most one essay per `cruxTag`.
- ✅ `headline` / `lede`: non-empty strings when present (bounds: headline
  ≤ 120 chars, lede ≤ 200 — advisory warn).
- ✅ `intro`: array of non-empty strings when present.
- ✅ `extraSections`: array of `{ title (non-empty), blocks (array) }` when
  present. (Deep `ProseBlock` shape validated once its renderer lands.)
- ▢ `edition`: positive integer, **unique across essays**; `firstSentAt`:
  valid ISO date. (Both present or both absent.)
- ▢ `vantageRows[].articleSlug`: resolves to a real article **and** that
  article's `cruxTag` equals this essay's (a row must be a class member).
- ▢ `simulator.articleSlug`: resolves to a real article (warn if not a member).
- ▢ `metricGrid[].source`: warn when it doesn't match a member `source.company`.
- ▢ figure fields: delegated to the existing figure checks via `figureHosts`.
- ▢ **drift warning** (Phase 5b): warn when members outnumber `vantageRows`
  (visible, non-blocking — a publish is never blocked by an essay one revision
  behind).

Registration: import + append to `CHECKS` in `scripts/validate-content.ts`;
load essays in `scripts/load-content.ts` into `ContentSet` (mirrors how figures
were added). Predicate `checkProblemEssay` in `src/types/predicates.ts`.

---

## 10. Incremental build order

Each block ships as a unit: **schema field + renderer + validator rule +
(if it embeds a figure) figure-host wiring + EMAIL degradation**, together, in
one reviewed step. The essay record is canonical and editions are *sent* from
it (D3 rule 2), so no block may exist that the email pipeline cannot carry.
Sane email defaults: `metricGrid` → table; `steps` → numbered list; `chart`
figure → static image or link-to-page; `stat` → bold line; `extraSections` →
heading + degraded blocks. Nothing to build now — the rule just binds the
checklist.

1. **Header + validator (next).** Wire `checkProblemEssay` + `load-content` for
   the LIVE fields (`cruxTag`, `headline`, `lede`, `intro`, `edition`,
   `firstSentAt`). This is the "build the validator" step the owner asked to
   scope first.
2. **`vantageRows`** — the highest-value authored block (upgrades the "Same
   wall" rows). Needs D-1 (accent) resolved.
3. **`wall` + figures** — authored wall prose + the first essay-hosted diagram
   (activates the essay figure host).
4. **`metricGrid`**, **`whatToSteal`**, **`simulator`** — self-contained cards.
5. **`deepDive`**, **`numbers`** — the richest blocks (prose + steps + chart
   figures).
6. **Provenance strip + subscribe** — with Phase 6 `/newsletter`.
7. **Interview corner** — with Phase 4 (`questionsByCruxTag`); `interviewNote`
   folds in.

---

## 11. Resolved decisions (owner-ruled 2026-08-17)

- **D-1 · Vantage-row accent → option (a), home pinned.** Neutral dot until a
  company-accent registry exists, then automatic. The accent's home is an
  **optional token-name field on the company registry entry**
  (`content/companies/*.json`) — one place, never per-row, never raw hex. This
  also resolves `open-decisions.md` #3's location when Phase 5 lands. (Hence
  `accent` removed from `VantageRow` in §5.)
- **D-2 · Interview corner → question-owned.** The corner derives from the
  question file's existing fields (single source); `interviewNote` is an
  optional per-class override only — never a second parallel field authored
  twice.
- **D-3 · Essay key → confirmed.** `cruxTag`-keyed, filename-must-match, urlSlug
  never in filenames (the D1 frozen-key principle).
- **D-4 · Minimal-state lede → omit until authored (no synthetic ledes,
  ever).** Owner content commitment: the first authoring pass is 14
  one-sentence `lede`s (one per class), which upgrades every page *and* every
  meta description via `lede ?? intro[0] ?? definition`. Those `{cruxTag, lede}`
  files are the first real exercise of the step-1 validator.
```
