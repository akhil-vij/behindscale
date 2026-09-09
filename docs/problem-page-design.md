# Problem Detail Page — Technical Design & Contract

Version 2.0 · 2026-09-09 · Governs `src/pages/ProblemDetail.tsx`,
`src/types/problemEssay.ts`, the `content/problems/*.json` content type, the
`problemMeta()` prerender builder, and the `problem-essay` validator.

Grounded in the two prototype comps in `Behindscale_nav_design.zip`:
`problem-queue-backlog.dc.html` (**minimal**) and
`problem-ambiguous-timeouts.dc.html` (**full**).

> **v2.0 note (2026-09-09).** The v7.3 interactive port (2026-09-06) and the
> Batch-1/2 rounds (2026-09-08/09) **replaced the speculative rich-block schema**
> this doc originally proposed (`metricGrid`, `vantageRows`, `deepDive`,
> `numbers`, `whatToSteal`, `simulator`) with a concrete one built around a
> playable mission and a side-by-side comparison. §3 and §5 have been rewritten
> to the shipped shape. The one-template principle, routing, derived data,
> figures, SEO, and invariants below are unchanged.
>
> **Companion docs — read alongside this one:**
> - `docs/authoring-problem-pages.md` — the authoring workflow, and the live
>   per-block field table (§4b).
> - `docs/problem-detail-implementation.md` — the *runtime*: the sandboxed
>   artifacts, the iframe postMessage protocol, save-the-day persistence, the
>   wall module (`youMapping`), iframe sizing, and the viewport engineering.
> - `src/types/problemEssay.ts` — the authoritative schema (this doc summarises
>   it; the types are canonical).

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

Order is top-to-bottom, as composed by `ProblemDetail.tsx`. "Derived" =
computed from articles now. "Authored" = from `ProblemEssay`. Every authored
block is **render-when-present**; a block with neither authored content nor a
derivation is omitted. Field shapes are in §5 (summary) and
`src/types/problemEssay.ts` (canonical); the per-block *authoring* semantics are
in `authoring-problem-pages.md` §4b.

| # | Section | Field | Minimal (derived) | Render rule |
|---|---------|-------|-------------------|-------------|
| 1 | Eyebrow | — | `Problem · seen at N companies · <year range>` | always; `label` joins when `headline` present |
| 2 | H1 | `headline` | class `label` | `headline ?? label` |
| 3 | Lede | `lede` | — | render when present |
| 4 | "How this page works" strip | `howItWorks[]` | — | one mono line, ` · `-joined; render when present |
| 5 | Station nav (sticky, scroll-spy) | `stations[]` | — | render when present; deck-jump appears after `touched` |
| 6 | Intro prose | `intro[]` | — | render when present |
| 7 | The wall (+ try-it artifact, stats, no-JS figure) | `wall`, `tryIt`, `figures[]` | registry `definition` (+ synthesis when N>1) | authored `wall` replaces the definition; `tryIt` mounts the "cause it" artifact |
| 8 | Mission ("build it" artifact + outline card + stop block) | `mission` | — | render when present; **presence drives the /problems Playable badge** |
| 9 | Comparison / hint sheet (spectrum · diagram strip **+ YOU row** · matrix **+ YOU column** · full answers) | `comparison` | derived "Same wall, N systems" table | authored `comparison` replaces the derived table; the YOU column/row fill from the wall module |
| 10 | Decide ("Which answer is yours") | `decide` | — | render when present; a row can light matrix column(s) |
| 11 | What to steal | `steal` | — | render when present |
| 12 | Extra sections (escape valve) | `extraSections[]` | — | fixed insertion point (§5a); **field stub — validated, not yet rendered** |
| 13 | Interview ("If this comes up…", live ticks) | `interview` | — | render when present; one follow-up row per attack |
| 14 | Patterns in this class | `patterns` | neutral chips (derived union) | chips always (when non-empty); authored block adds intro + order |
| 15 | Every breakdown / cards | `cards` | source·date + title cards | authored `cards` = chronological cards + break-it teasers |
| 16 | Sources ("Read the originals") | `sources` | — | render when present; URLs derive from members |
| 17 | Subscribe ("The weekly") | — | — | render when `newsletterSignupUrl` is set (§5b) |
| 4′ | Provenance strip | `edition`, `firstSentAt` | — | **stored now, renders in Phase 6** (needs `/newsletter`) |

The interactive sections (5, 7-tryIt, 8, 9, 10, 13) are the v7.3 port's
concrete replacement for the original speculative blocks; their runtime (the
artifacts, the protocol, the YOU-column fill) is documented in
`problem-detail-implementation.md`.

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

**Every field except `cruxTag` is optional.** `src/types/problemEssay.ts` is
canonical (each field carries a doc comment); this is the summary. The per-block
*authoring* semantics — what each renders and how a second wall uses it — are in
`authoring-problem-pages.md` §4b.

```ts
interface ProblemEssay {
  // — identity (required) —
  cruxTag: string            // frozen key; must equal filename and resolve to a registry entry

  // — header —
  headline?: string          // → H1; label moves to the eyebrow
  lede?: string              // one italic teaser sentence (also the search snippet)
  howItWorks?: string[]      // the "how this page works" strip (mono, · -joined)
  intro?: string[]           // opening prose paragraphs

  // — provenance (stored now; strip renders in PHASE 6) —
  edition?: number           // positive int, unique across essays
  firstSentAt?: string       // ISO date

  // — v7.3 interactive rich blocks (all render-when-present) —
  figures?: Figure[]                 // essay-hosted SVGs (§6): the no-JS wall figure + {{figure:…}} markers
  stations?: ProblemStation[]        // sticky nav + time budgets (drives the /problems estimate)
  wall?: ProblemWall                 // { prose[], figureSlug?, stats[], statsCaption? }
  tryIt?: ProblemTryIt               // { artifactSlug, teaser, caption, noscript? } — the "cause it" artifact
  mission?: ProblemMission           // { artifactSlug, teaser, title, intro, decisionsSummary?, outline?, stopblock?, stuckNote? }
  comparison?: ProblemComparison     // spectrum · diagramRows[] (+YOU row) · columns + matrixRows[] (+YOU column) · questions[]
  decide?: ProblemDecide             // "Which answer is yours" (a row can light matrix columns)
  steal?: ProblemSteal               // "What to steal"
  interview?: ProblemInterview       // five parts + one follow-up row per attack (live ticks)
  patterns?: ProblemPatternsSection  // intro + optional order (chips stay derived)
  cards?: ProblemCards               // "Every article" cards + break-it teasers
  sources?: ProblemSources           // "Read the originals" (URLs derive from members)

  // — escape valve (field stub: validated, not yet rendered) —
  extraSections?: ProblemExtraSection[]   // see §5a
}
```

Notes:

- **The comparison is the join point.** `comparison.matrixRows[].id` and the
  `{{slot}}` tokens in the YOU diagram SVG must match the keys the wall module's
  `youMapping()` returns, or the YOU column/row never fills. The wall module is
  the **only** per-wall code (`src/walls/<wall>.ts`, registered by cruxTag); see
  `problem-detail-implementation.md` §5 and §8.
- **Artifacts are content, not schema.** `tryIt`/`mission` carry an
  `artifactSlug` resolving to `/artifacts/<slug>/index.html` (built from
  `content/artifacts/<slug>.jsx`). The page never imports artifact code — it
  embeds a sandboxed iframe and speaks postMessage protocol v1 (impl doc §4).
- **`lede` vs `intro`.** Both may be present; the lede is the italic teaser and
  the search snippet, the intro is the opening prose.
- **Superseded fields.** `metricGrid`, `vantageRows`, `deepDive`, `numbers`,
  `whatToSteal`, `simulator`, and `interviewNote` were proposed in v1.1 and
  **never built** — the interactive blocks above replaced them. Only
  `extraSections` (§5a) and `figures` (§6) survive from that set.

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

Runs when any `content/problems/*.json` exists. The scope grew with the v7.3
port — it now validates the interactive blocks and their cross-references, not
just the header. Current checks:

- **Identity.** `cruxTag` present, kebab-case, resolves to a `cruxtags.json`
  entry; filename equals `cruxTag`; at most one essay per `cruxTag`.
- **Header.** `headline` / `lede` non-empty strings when present (advisory
  length bounds); `intro` / `howItWorks` arrays of non-empty strings.
- **Stations.** anchors resolve; time budgets are numbers.
- **Wall / try-it / mission.** shapes valid; `artifactSlug`s present; the
  mission's `decisionsSummary` requires the `{{decisions}}` marker exactly once.
- **Comparison (the important one).** `matrixRows[].id` and the YOU diagram
  `{{slot}}`s must be keys the wall module's `youMapping()` returns — a mismatch
  **fails**, and a comparison with no registered wall module **warns** (the YOU
  column would never fill); inline SVGs referenced by `diagramRows[].svg` /
  `you.*Svg` exist and pass the figure-svg-safe allowlist.
- **Decide.** `rows[].highlights` resolve against `comparison.columns`.
- **Interview.** exactly **one follow-up row per attack** (count ==
  the wall module's `attackCount`).
- **Refs.** `steal[].qref`, `cards.teasers`, `sources.items[].articleSlug`,
  `patterns.order` resolve to real questions / articles / patterns.
- **Escape valve.** `extraSections`: `{ title (non-empty), blocks (array) }`
  (deep block shape validated once its renderer lands).
- **Provenance.** `edition` positive int (unique across essays) / `firstSentAt`
  ISO — both present or both absent.
- **Figures.** delegated to the existing figure checks via `figureHosts`.

Registration: import + append to `CHECKS` in `scripts/validate-content.ts`;
load essays in `scripts/load-content.ts` into `ContentSet` (mirrors how figures
were added). Predicate `checkProblemEssay` in `src/types/predicates.ts`.

---

## 10. Incremental build order (largely historical)

> **Superseded (2026-09-09).** This was the roadmap for the speculative blocks.
> The v7.3 port took a different path and shipped the interactive block set
> (§3/§5) as live. What survives is the **unit rule** and the **email-degradation
> rule** below — apply them to any *new* block. The header + validator (step 1)
> shipped; steps 2–5 (`vantageRows`/`metricGrid`/`deepDive`/`numbers`/
> `simulator`) were not built.

Each block ships as a unit: **schema field + renderer + validator rule +
(if it embeds a figure) figure-host wiring + EMAIL degradation**, together, in
one reviewed step. The essay record is canonical and editions are *sent* from
it, so no block may exist that the email pipeline cannot carry. Sane email
defaults: `steps` → numbered list; `chart` figure → static image or
link-to-page; `stat` → bold line; `extraSections` → heading + degraded blocks;
`mission`/`tryIt`/`comparison` → link to the live page (interactive by nature).

Still pending on their phase gates:

- **Provenance strip + subscribe** — Phase 6 `/newsletter`.
- **`extraSections` renderer** — with the shared `ProseBlock` renderer.

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
