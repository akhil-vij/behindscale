# behindscale — Navigation IA: Implementation Plan

Version 1.0 · 2026-08-16 · Companion to `docs/nav-ia-decisions.md` (the
settled design doc). **That doc rules; this one sequences.** Every phase cites
the decision it implements (P0, D1–D7, A/B/C). Repo truth wins over both.

This plan is instructions, not code. It lists, per phase: goal, prerequisites,
new content type + schema, derivations, validators, routes + components, SEO
plumbing, article deltas, acceptance criteria, and rollback.

---

## 0. Ground rules (apply to every phase)

- **Derive-or-die (P0).** No count or membership string is stored; each derives
  at build time. Every phase that renders a count names its derivation.
- **Frozen article schema (P0/B).** No field is added to `Article`. New edges
  derive from existing fields (`source.company`, `cruxTag`, `patterns[]`) or
  from reverse indexes over new content types. The only schema addition in the
  whole program is `urlSlug` on the cruxtag registry — **already shipped** (D1).
- **Validators land before their content (C).** Within a phase, the schema
  predicate + the check + its test land and go green *before* the content files
  that they gate.
- **Explicit registries (D6).** Four discovery/emit surfaces are hand-maintained
  and must be updated together for any new content type or route; drift is a
  compile/grep-visible error, never silent:
  1. `src/content/index.ts` — `import.meta.glob` + derived maps (website bundle)
  2. `scripts/load-content.ts` — `readdirSync` dir + validate loop; `ContentSet`
     in `scripts/types.ts`
  3. `scripts/prerender.ts` — `routes[]` table + a `*Meta()` builder + the
     cross-page `@id` assertion (:626–658)
  4. `scripts/generate-sitemap.ts` — `entries[]` array
- **Every commit is green.** `npm test` + `npm run build` (which gates on
  `npm run validate`) pass before push, same cadence as the figure rounds.

### The repeatable "new content type" spine

Each new type (question, company, problem-essay) walks the same six steps:

| # | Step | Files |
|---|------|-------|
| 1 | Type + predicate | `src/types/<t>.ts`, `src/types/index.ts` (barrel), `src/types/predicates.ts` (`check<T>`) |
| 2 | Website indexer | `src/content/index.ts` (glob + `<t>BySlug` + reverse indexes) |
| 3 | Build loader | `scripts/load-content.ts` (`<T>_DIR` + loop), `scripts/types.ts` (`ContentSet`) |
| 4 | Validator(s) | `scripts/checks/<name>.ts` + register in `scripts/validate-content.ts` + `__tests__` |
| 5 | Routes + page | `src/AppRoutes.tsx`, `src/pages/<Page>.tsx` |
| 6 | SEO | `prerender.ts` `routes[]` + `<t>Meta()` + `@id` edges; `generate-sitemap.ts` |

The `figure-hosts.ts` refactor (2026-08-16) is the model: **one shared
abstraction, every consumer iterates it.** Apply the same discipline to reverse
indexes (`patternStats` is the reference: `src/content/index.ts:100-121`).

---

## Phase 1 — Foundations (mostly shipped)

**Goal.** The shared substrate every later phase leans on. No user-visible
change.

**Status.** The urlSlug portion of C-step-1 is **DONE** (commit `00f4136`):
`cruxtags.json` carries all 14 `urlSlug`s; `cruxtag-urlslug` validator (16th
check) enforces present + kebab + unique; `CruxTagEntry.urlSlug` typed.

**Remaining in Phase 1.** Nothing structural to build ahead of time — the
per-type registries land *with* their phases (validators-before-content, C).
The one foundational helper to add when Phase 3 starts:

- **`urlSlug` resolver.** A tiny `src/lib/cruxLabels.ts`-style helper (or extend
  `src/content/index.ts`) exposing `cruxTagByUrlSlug` and `urlSlugForCruxTag`
  maps derived from `cruxtags`, so `/problems/<urlSlug>` route → registry key,
  and articles → their class page URL, both resolve in one place. Pure
  derivation; no new data.

**Acceptance.** Already green (235 tests, 16 checks, 0 errors).

---

## Phase 2 — `/catalog` → `/problems` rename (ATOMIC) — implements D2, B

**Goal.** Rename the workbench and repoint every internal reference in **one
commit**, because the build assertion breaks if `@id`s and DOM anchors drift
apart mid-flight.

**Prerequisites.** None (Phase 1 done).

**The nine touchpoints (D2 checklist — normative).**

| Touchpoint | File | Change |
|---|---|---|
| 301 redirect | `vercel.json` | add `{ source:"/catalog", destination:"/problems", permanent:true }` (query strings carry; precedent: two pattern redirects already there) |
| Legacy rewrite | `src/pages/CatalogRedirect.tsx` | `/?source=` → `/problems?source=` |
| `@id` builder | `scripts/prerender.ts` `cruxTagTermId` | `/catalog#term-` → `/problems#term-` |
| **Build assertion** | `scripts/prerender.ts:626–658` | must move in the SAME commit as the `@id` builder |
| Lateral link | `src/pages/ArticleDetail.tsx:207` (`AlsoSolvingThis`) | `/catalog#term-` → `/problems#term-` |
| SearchAction JSON-LD | `scripts/prerender.ts:164` | `/catalog?q=` → `/problems?q=` |
| Breadcrumb label | `scripts/prerender.ts` `articleMeta` | "Catalog" → "Problems" |
| Nav active-state | `src/components/Navbar.tsx:21` | `catalogActive` → `problemsActive`, label, `to="/problems"` |
| Sitemap | `scripts/generate-sitemap.ts:64` | `/catalog` → `/problems` |

**Also in this phase (routing + nav):**
- `src/AppRoutes.tsx`: route `path="/catalog"` → `path="/problems"` (the
  workbench doubles as the problems index). Keep the component
  (`Catalog.tsx`); optionally rename to `Problems.tsx` for clarity (low-risk;
  update the import).
- **Nav standardization (B):** one nav template across all pages; rename the
  vestigial `id="catalog-search"` → `problems-search` (in `Catalog/Problems`
  page + the `Navbar` focus handler). **Do not** add the Interview nav link yet
  (its page lands in Phase 4; a link to a 404 is worse than its absence).
- **Glossary (B):** no code — the `cruxTag` / "problem class" / `urlSlug`
  mapping is already pinned in the decision doc.

**@id rule (D2).** `DefinedTerm` `@id`s become `/problems#term-<registry-slug>`
**permanently for all 14** (every class renders a workbench anchor). No
conditional logic on `article.about`. The `subjectOf`/`about` term↔page
linkage lands in Phase 3 when class pages exist.

**Derivations.** Unchanged (the workbench already derives its groups/counts).

**Acceptance.**
1. `npm run build` green; the `@id` assertion passes with the new anchor form.
2. `dist/` has `problems.html`; a request to `/catalog` 301s to `/problems`
   (verify the `vercel.json` rule; local check: grep the redirect).
3. Every prerendered article's JSON-LD `about`/breadcrumb points at
   `/problems#term-<slug>`; grep `dist/` for any surviving `/catalog`.
4. `AlsoSolvingThis` links and the sitemap show `/problems`.

**Rollback.** Single revert (atomic commit). No content migration to undo.

---

## Phase 3 — Problem class pages, STARTER state for all 14 — implements D3, D6, D7

**Goal.** `/problems/<urlSlug>` renders for all 14 classes, in **starter state**
(auto-derived), with no essay files yet.

**Prerequisites.** Phase 2 (the `/problems` namespace + anchor `@id`s); urlSlug
(done).

**No new content type yet** — starter pages are pure derivation. (The essay
content type lands in Phase 5.)

**Route + component (spine step 5).**
- `src/AppRoutes.tsx`: `<Route path="/problems/:urlSlug" element={<ProblemDetail/>} />`.
  Order it after `/problems` so the index isn't shadowed.
- `src/pages/ProblemDetail.tsx`: `useParams()` → `cruxTagByUrlSlug.get(urlSlug)`;
  missing → inline not-found (invariant 6, never throw), mirroring
  `PatternDetail`.

**Derivations (P0 — everything on the page).**
- **Members / "seen at N companies":** `articles.filter(a => a.cruxTag === key)`;
  N = distinct `source.company`.
- **Starter rows:** each member article's `cruxSummary` + `SourceAttribution`
  (reuse the component). No stored prose.
- **Patterns in this class:** union of members' `patterns[]` → `patternBySlug`.
- **Interview corner:** rendered only if some question cites this class
  (`questionsByCruxTag` reverse index — lands in Phase 4; until then the corner
  never renders, which is correct render-when-present behavior).
- **Full-vs-starter gate (D3):** `problemEssayBySlug.has(key)` → full; else
  starter. The map is empty until Phase 5, so all 14 are starter now.

**SEO (D6).**
- `prerender.ts`: `...cruxtags-with-articles.map(c => ({ path:`/problems/${urlSlug}`, meta: problemMeta(c) }))`.
- `problemMeta()`: title = class label + site suffix; description =
  `truncateForMeta(definition)`; canonical `/problems/<urlSlug>`; JSON-LD
  **`CollectionPage`** (mainEntity = ItemList of member articles) **+
  `DefinedTerm`** carrying `@id: cruxTagTermId(key)` and
  `subjectOf: /problems/<urlSlug>` (the D2 refinement — connects the workbench
  term to its rich page). Breadcrumb Home → Problems → class.
- `generate-sitemap.ts`: add the 14 `/problems/<urlSlug>` URLs (no `lastmod` —
  derived surface, same reasoning as `/catalog`).
- **`@id` assertion:** class pages emit a `DefinedTerm` whose `@id` equals the
  workbench anchor; the existing assertion already requires every referenced
  term-id to be emitted — verify class-page emission satisfies it (no new edge
  yet; `article.about` still points at the anchor, now also `subjectOf`-linked).

**Article delta ② (D-series / prototype).** `ArticleDetail`: the crux "Part of:
<class> →" line points at `/problems/<urlSlug>` (was the `/catalog#term-`
anchor). Derived from `article.cruxTag` → `urlSlugForCruxTag`.

**Validator.** No new content files → no new *content* check. Add a **routing
guard test** (unit): every `article.cruxTag` resolves to a `urlSlug`
(guaranteed by `cruxtag-urlslug` + coverage, but assert the resolver map is
total so `ProblemDetail`/delta ② never dead-link).

**Acceptance.**
1. All 14 `/problems/<urlSlug>.html` prerender; each lists its real member
   articles and a correct "seen at N companies" (spot-check `ambiguous-timeouts`
   = 5, `outgrowing-one-cluster` = 5).
2. No interview corner renders anywhere yet (no questions).
3. Article pages' "Part of:" links resolve to the class page.
4. `@id` assertion green; sitemap has 14 new URLs.

**Rollback.** Remove the route + the 14 sitemap/routes entries; delta ② reverts
to the anchor link. No content to delete.

---

## Phase 4 — Interview pages — implements D5 (folds `docs/spec-interview-pages.md`)

**Goal.** `/interview` index + `/interview/:slug` question pages, launch set of
5 (one shipped in the bundle, four are content that follow). Ship the one.

**Prerequisites.** Phase 2 (nav) + Phase 3 (so the question→class links point at
real `/problems/<urlSlug>` pages).

**Fold the sub-spec.** `docs/spec-interview-pages.md` is the detailed build
spec; implement it verbatim **except the three reconciliation carry-forwards
(D5), which override it:**
1. **Crux links use `/problems#term-<registry-slug>`**, not the sub-spec's stale
   `/catalog#term-` (Phase 2 already renamed).
2. **Validator adds `followUps ≥ 2`** (for `FAQPage` validity) on top of the
   sub-spec's ≥3-evidence / ≥3-company floor.
3. **`QuestionChip` must not be purple** — `#7C3AED` is `--cat-purple` (the
   `consistency` pattern color; `idempotency-keys` is `consistency`, so a purple
   question chip collides on the very article that anchors it). Distinguish
   structurally (an "Answers:" prefix / `Q` glyph) or use brand-gold.

**New content type: question (spine steps 1–4).**
- `content/interview/<slug>.json`; move `interview-double-payments.json` →
  `content/interview/how-do-you-prevent-double-payments.json` and strip its
  inline `teaser` (now derived).
- `src/types/question.ts` (schema per sub-spec §1: `slug`, `question`,
  `aliases[]`, `whatTheyreTesting`, `cruxTags[]`, `patterns[]`, `evidence[]`
  `{article, adds}`, `answerShape[]`, `followUps[]` `{question, pointer,
  answer}`, `artifactCta {article}`, `relatedQuestions[]`); `checkQuestion` in
  predicates.
- Indexers: `src/content/index.ts` glob `/content/interview/*.json` + `questions`
  + `questionBySlug` + **`questionsByArticle`** (reverse index over
  `questions[*].evidence[].article`, mirroring `patternStats`) + **
  `questionsByCruxTag`** (over `questions[*].cruxTags[]`, feeds Phase 3's
  interview corner). `scripts/load-content.ts` + `ContentSet`.
- **Validator** `scripts/checks/interview-refs.ts` (sub-spec §4 + carry-forward):
  every `evidence[].article` / `followUps[].pointer` / `artifactCta.article`
  resolves; `artifactCta.article` HAS an artifact **with a teaser** (the minor
  note in D5 — teaser is optional on `artifact`); every `cruxTags[]` in
  `cruxtags.json`; every `patterns[]` in `content/patterns/`; every
  `relatedQuestions[]` resolves; `evidence` ≥3 with ≥3 distinct companies;
  **`followUps` ≥ 2.** Dangling refs fail the build.

**Routes + components (spine step 5).**
- `src/AppRoutes.tsx`: `/interview` → `QuestionIndex`, `/interview/:slug` →
  `QuestionDetail`.
- `QuestionDetail` mirrors `PatternDetail`; ten sections per sub-spec §3.
- `QuestionIndex` minimal (reading-column cards; no search/filters).
- **`QuestionChip`** component (non-purple; sub-spec §5); placed on
  `ArticleDetail` only (**article delta ③** — "This article answers …"),
  derived from `questionsByArticle`. Article **cards untouched** in v1.
  **Chip disambiguation (owner ruling).** `cat-purple` already means
  *consistency = idempotency-keys*, and the launch question anchors on that
  very article — so a purple question chip would collide on-page. The fix is
  **structural, not a new color**: an `"Answers:"` label prefix / `Q` glyph
  that reads as "question," NOT brand-gold. Rationale: gold already carries a
  meaning; a second one starts a color-vocabulary problem that compounds every
  future chip. Structure disambiguates without spending a hue.
- **Nav:** add the `Interview` link to `Navbar` now (its page exists);
  `interviewActive = pathname.startsWith('/interview')`. Nav order Problems ·
  Patterns · Interview.

**Derivations.** "Answered by N companies" = distinct `source.company` across
`evidence`; artifact CTA teaser + link derived from `article.artifact`; evidence
rows' company/source-name from `articleBySlug`. Only `adds` per row is authored.

**SEO (D6, sub-spec §7).** `questionMeta()`: title = question verbatim +
suffix; description = `whatTheyreTesting` truncated; canonical; og:type
`website`; JSON-LD **`FAQPage`** (from `followUps[]`) **+ `BreadcrumbList`**
(Home → Interview → question). `@id`: reference only already-emitted pattern /
cruxTag `DefinedTerm` `@id`s; **extend the assertion** so question-page
references (article→question via chip is a reverse index, not an emitted `@id`;
the emitted edges to guard are question→pattern `mentions` and question→cruxTag
`about`). Sitemap: `/interview` + question URLs.

**Phase-3 activation.** With `questionsByCruxTag` now populated, the interview
corner on `/problems/ambiguous-timeouts` (the class `how-do-you-prevent-double-
payments` cites) begins rendering — **zero touch** to Phase 3 code (derive-or-
die).

**Acceptance (sub-spec §8 + carry-forwards).**
1. Build green with the sample question; deleting a referenced article slug
   FAILS the build via the new check (test once, restore).
2. `/interview` lists the question; `/interview/how-do-you-prevent-double-
   payments` renders all ten sections; unknown slug → inline not-found.
3. The five evidence articles show the (non-purple) "answers" chip, round-
   tripping to the question.
4. Prerendered HTML has `FAQPage` + `BreadcrumbList`; sitemap includes it;
   `followUps ≥ 2` holds.
5. The ambiguous-timeouts class page now shows its interview corner.

**Rollback.** Remove routes + nav link + the content dir + the check; the
`questionsByArticle`/`questionsByCruxTag` maps empty out and the article chip +
class-page corner vanish (render-when-present).

---

## Phase 5 — Company pages + first full-state essay — implements D3, D4, D6, D7

**Two things ship here:** company pages (D4), and the **full-state** problem
essay for `ambiguous-failure-under-retry` (D3), which upgrades that one class
page from starter to full.

**Prerequisites.** Phase 3 (class pages), Phase 4 (question strip derivation).

### 5a. Companies (D4)

**New content type: company (spine steps 1–4).**
- `content/companies/<companySlug>.json` = `{ slug, blurb, blogUrls[] }`. Key =
  `slugify(source.company)`; **`"Amazon (AWS)"` carries the explicit override
  `aws`** (the only misfire, per the D4 enumeration). Everything else derives.
- `src/types/company.ts` + `checkCompany`.
- Indexers: glob `/content/companies/*.json` + `companyBySlug` + a
  **`companySlug` derivation** from `source.company` (one place); reverse
  aggregation `articlesByCompany`. Loader + `ContentSet`.
- **Registry is OPTIONAL (owner ruling, confirmed).** A company with articles
  but no registry entry renders a valid derived-only page — which also
  guarantees a brand-new source never 404s. Two binding conditions:
  1. **The `/companies` index derives from `articlesByCompany`** (every company
     with ≥1 published article) — **never from the registry.** The registry
     only supplies blurbs/links to pages the index already lists.
  2. **Stripe and Figma carry registry entries by Phase 5 close**, so the two
     showcase pages have blurbs.
- **Validator** `scripts/checks/company-registry.ts`: **when an entry exists** —
  its `slug` is reachable from some article's `slugify(source.company)` (or
  override); no two entries collide on a slug; `blogUrls` non-empty. A company
  with articles and no entry is *not* flagged (renders derived-only).

**Route + component.**
- `/companies/:companySlug` → `CompanyDetail`. **`/companies` index (OWNER-
  PENDING #2 — CLOSED: ship v1):** footer-linked list page **deriving its roster
  from `articlesByCompany`** (every company with ≥1 published article), not the
  registry (§5a rule 1). Registry entries only decorate the rows that exist.
- `CompanyDetail` derivations (P0): walls = distinct `cruxTag` across the
  company's articles (link `/problems/<urlSlug>`); patterns = union
  `patterns[]`; breakdowns = the articles; "asked about their systems" =
  questions citing the company (`questionsByArticle` ∩ company's articles);
  counts all derived. Only `blurb` + `blogUrls` are stored.

**Article delta ① .** `ArticleDetail` source eyebrow → `/companies/<companySlug>`
(derived from `source.company`).

**SEO.** `companyMeta()`: JSON-LD **`Organization` + `CollectionPage`**;
canonical; breadcrumb. Sitemap: company URLs (+ `/companies` index if v1).
**Extend `@id` assertion** for the article→company edge.

**D7 reality.** Stripe renders **2 breakdowns / 2 walls** on published data
(docdb unpublished); Figma is the thin single-breakdown archetype. Both correct;
the docdb publish upgrades Stripe with zero touch (P0).

### 5b. First full-state essay (D3)

**New content type: problem-essay (spine steps 1–4).**
- `content/problems/<registry-slug>.json` — a **structured record of typed
  blocks** (NOT markdown; repo has no md runtime): `lede`, `metricGrid[]`,
  `vantageRows[]`, `deepDive`, `numbers[]`, `whatToSteal[]`, `simulatorRef`,
  `patterns[]`. Prose inside blocks uses the existing `Prose` string format.
- **Provenance fields (owner amendment).** Add `edition` (integer) and
  `firstSentAt` (date) to the essay record. Two surfaces need them and neither
  is derivable: the full page's provenance line ("First sent as Edition 1,
  <date>") and Phase 6's editions list (numbers, dates, ordering). Making them
  first-class fields turns Phase 6's list into a proper derivation instead of a
  quiet impossibility.
- `src/types/problemEssay.ts` + `checkProblemEssay`. **The block set is a
  schema, not a per-edition invention** (D3 rule 1) — adding a block type is a
  reviewed schema change.
- Indexer: glob `/content/problems/*.json` + `problemEssayBySlug` (keyed by
  registry slug). Loader + `ContentSet`.
- **Validator** `scripts/checks/problem-essay.ts`: block shapes valid; any
  article-referencing block (`vantageRows`, `simulatorRef`) resolves to real
  article slugs; the essay's registry-slug key exists in `cruxtags.json`;
  **`edition` and `firstSentAt` both present, `edition` unique across essays.**
  **Drift warning (WARN, never fail):** warn when a class's **derived** member
  count exceeds its `vantageRows` count — so essay/membership drift is visible
  at build time. It must NOT block a publish: an essay one revision behind a new
  member is a normal, non-blocking state.
- **Renderer:** `ProblemDetail` full-state branch — dedicated block components
  (metric grid, colored vantage rows, collapsibles, takeaway cards, dark
  simulator CTA). Gate: `problemEssayBySlug.has(cruxTag)` → full (D3).
- **Essay↔membership drift seam (owner amendment).** The full state is where
  derive-or-die meets authored content: `vantageRows` are hand-written and
  frozen at N companies, but membership is derived — so the day a new member
  publishes (the queued docdb case), the derived count says N+1 while the essay
  shows N rows, and the newest member is invisible on the page meant to
  showcase it. Fix: the full-state `ProblemDetail` **also derives an "Also in
  this class" strip** listing member articles NOT covered by `vantageRows`
  (each rendered from `cruxSummary` + `SourceAttribution`, exactly like a
  starter row). **Renders only when non-empty** (render-when-present), so the
  common no-drift case shows nothing. The starter state can't have this bug;
  only the full state can, and this closes it in the renderer while the
  validator warning surfaces it at build time.
- Author the **`ambiguous-failure-under-retry.json`** essay (transcribed from
  edition-01; the prototype's full page is the reference layout). This flips
  `/problems/ambiguous-timeouts` from starter to full — **zero touch** to the
  Phase-3 renderer beyond the branch.
- **D3 rule 2 (email derived from JSON)** is a *pipeline* concern (email
  generation from the block record); **out of scope for the website build** —
  a follow-up. **But the D3-rule-2 discipline starts at the first essay, not at
  the pipeline:** until that generator exists, edition emails are hand-sent and
  `edition-NN.md` files are **OUTPUTS of the essay JSON, never edited directly.**
  The JSON is the one source; the markdown is a rendering of it.

**Acceptance.**
1. `/companies/stripe` (2 walls), `/companies/figma` (thin) render with fully
   derived counts; article source eyebrows link to them.
2. `/problems/ambiguous-timeouts` renders full-state (with its "First sent as
   Edition N, <date>" line); the other 13 stay starter.
3. `@id` assertion green with the article→company edge; sitemaps updated.
4. `/companies` index derives its roster from `articlesByCompany` (v1, closed).
5. **Drift:** removing a `vantageRow` for a still-member article makes the "Also
   in this class" strip render that article AND raises the build WARNING (test
   once, restore); with all members covered, the strip is absent and no warning.

**Rollback.** Company: remove type/route/registry. Essay: delete the one JSON →
the class page falls back to starter (the gate). Both independently revertible.

---

## Phase 6 — Newsletter page — implements the IA's newsletter surface

**Goal.** `/newsletter` static pitch page, footer-linked.

**Prerequisites.** Phase 3 (an edition's "view in browser" IS its problem page,
so the Edition-1 card links `/problems/ambiguous-timeouts`).

**Scope.**
- `src/AppRoutes.tsx`: `/newsletter` → `Newsletter` page (static pitch + signup
  input that is **non-functional in v1**, per the prototype/out-of-scope).
- Footer: add the Newsletter link (secondary noun — footer-reachable, no nav
  slot, per the nav rule).
- "Editions so far": derived from `problemEssayBySlug` **sorted by `edition`**,
  each row showing `edition` number + `firstSentAt` date + linking to its
  problem page (each essay = a permanent edition). Proper derivation off the
  Phase-5b provenance fields, not a hand-list. Until more essays exist, one
  entry. (The full problem page's "First sent as Edition N, <date>" provenance
  line reads the same two fields.)
- **SEO:** `newsletterMeta()` (title/description/canonical, og:type `website`;
  optional `WebPage` JSON-LD). Sitemap: `/newsletter` (no `lastmod`).

**Acceptance.** `/newsletter` prerenders; Edition-1 card → the ambiguous-timeouts
problem page; footer link present; sitemap includes it.

**Rollback.** Remove route + footer link + sitemap entry.

---

## Cross-cutting concerns

- **The `@id` dangling-reference assertion (`prerender.ts:626–658`) grows every
  phase.** Emitted term-ids: patterns (existing) + cruxTags (Phase 2 anchors) +
  problem-page `DefinedTerm`s (Phase 3) + company `Organization`s (Phase 5).
  Referenced edges to guard: article→cruxTag (`about`), article→pattern
  (`mentions`), question→cruxTag/pattern (Phase 4), article→company (Phase 5),
  essay→article (Phase 5). Extend the assertion IN the phase that introduces the
  edge; never let an edge ship unguarded.
- **Derive-or-die audit per phase.** Before each phase's commit, grep the new
  components for hardcoded integers/among-strings; each must trace to a
  derivation. (The prototype's "3 breakdowns", "41 breakdowns" are the anti-
  pattern.)
- **Nav standardization (B)** lands in Phase 2 (one template, `problems-search`
  id); the Interview link is the only per-phase nav addition (Phase 4).
- **Reserved slots** (avatar, practice) stay unrendered dashed placeholders —
  no code beyond leaving the layout room (they signal the accounts/practice
  roadmap, out of scope).

## Owner decisions — all closed for this program (2026-08-16 review)

| Item | Resolution |
|---|---|
| `/companies` index v1 vs v1.1 (OWNER-PENDING #2) | **CLOSED — ship v1**, footer-linked, roster derived from `articlesByCompany` (§5a). |
| `#6`/`#9`/`#11` urlSlug vetoes (D1) | **CLOSED — stamped defaults CONFIRMED:** `cluster-blast-radius`, `blind-during-outages`, `mitigation-gaps`. Phase 3 unblocked; slugs may freeze. |
| `#5` slug (`single-cluster-scaling-ceiling`) verification | **CLOSED — fallback `outgrowing-one-cluster` is correct:** the class spans non-database members (Colossus is a file system), so a `…-database` slug would mislabel it. Confirmed in `cruxtags.json`. |
| Company registry required vs optional | **CLOSED — OPTIONAL** (§5a): derived-only pages are valid; index derives from articles, not registry; Stripe + Figma carry entries by Phase 5 close. |
| Hero artifact on landing (A) | Parked — separate track, never blocks. |

## Out of scope for this program (ratified)

Hero artifact (A, separate track); the 12 non-ambiguous full essays and the 4
non-shipped questions (content, follow separately, must pass their §4 checks);
pattern pages (unchanged); accounts/auth; practice mode; working newsletter
signup submission; question chips on article *cards*; a `?cruxTag=` filter.
Email-from-essay generation (D3 rule 2) is a pipeline follow-up, not website.

## Testing & rollout posture

- **Per phase:** unit tests for every new predicate + check + reverse index;
  `npm test` + `npm run build` green before push. Follow the figure-round
  cadence (one coherent commit per phase, or a small atomic series within it).
- **Phase 2 is the only irreversible-feeling step** (the rename) — it is a
  single atomic commit with the assertion moved in-commit, and a clean revert.
- **Phases 3–6 are additive and independently revertible** (remove routes +
  content + checks; reverse indexes empty out and render-when-present hides the
  surfaces).
- **Prerender verification per phase:** grep `dist/` for the new routes, the
  JSON-LD types, and the absence of stale `/catalog`.

## Change log

- **v1.0 (2026-08-16)** — initial plan against `nav-ia-decisions.md` v1.1.
  Phase 1's urlSlug portion already shipped (`00f4136`).
- **v1.1 (2026-08-16)** — folded the owner review (APPROVED). §1: verified the
  `#5` slug — `single-cluster-scaling-ceiling` carries `outgrowing-one-cluster`
  in `cruxtags.json`, correct because the class spans non-database members
  (Colossus is a file system); the `…-database` fallback would have mislabeled
  it. §2: added the essay↔membership **drift seam** to Phase 5b — derived "Also
  in this class" strip (render-when-present) + a build **WARNING** when derived
  members exceed `vantageRows` (never fails a publish). §3: added `edition` +
  `firstSentAt` provenance fields to the problem-essay schema; Phase 6's
  editions list now derives from them. §4: company **registry confirmed
  OPTIONAL** (index derives from `articlesByCompany`; Stripe/Figma entries by
  Phase 5). §5: owner closures — `/companies` v1, urlSlug vetoes #6/#9/#11
  confirmed, hero parked. Phase-4 chip: fix is **structural** (`"Answers:"` /
  `Q` glyph), not brand-gold. All owner decisions for this program now closed;
  Phases 2–6 cleared to execute in order with per-phase check-ins.
