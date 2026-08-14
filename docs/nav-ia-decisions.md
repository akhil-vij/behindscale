# behindscale — Navigation IA: Finalised Design Doc

Version 1.0 · 2026-08-13 (interview spec reconciled 2026-08-14) · Status:
SETTLED except items marked OWNER-PENDING

The implementation plan cites this doc by section. **Repo truth wins over
any prior document.**

Provenance: design brief → design agent's IA proposal (Option C) → clickable
prototype (10 surfaces) → implementation agent's repo-grounded review →
rulings → decision ledger → this consolidation. The design agent's
do-not-build list of ten is ratified verbatim and incorporated by reference
from the proposal; it is product record and is not relitigated.

---

## P0 — Governing invariants

**Derive-or-die.** Every count-like or membership-like string on any surface
derives at build time from article/question/registry data; none is stored.
This is the mechanism (not hygiene) by which publishing an editorial round
upgrades the workbench, class pages, and company pages with zero touch — the
ledger/repo skew (round 36 stripe-docdb, round 37's 15th class: delivered,
not yet published) is the standing proof case.

Normative derivation table:

| Surface string | Derives from |
|---|---|
| "Browse all N breakdowns" | `articles.length` |
| Company eyebrow "N breakdowns · N problems · N patterns" | company's articles → distinct cruxTags / union `patterns[]` |
| Class "seen at N companies" / "N systems" | `articles.filter(cruxTag).map(source.company)` distinct |
| Workbench "N problem classes" | distinct in-use cruxTags |
| Question "Answered by N companies" | distinct `article.source.company` across `evidence[]` |

**Frozen article schema.** The article JSON schema does not change. All new
edges derive from existing fields (`source.company`, `cruxTag`, `patterns[]`)
or from reverse indexes over new content types (questions' `evidence` lists).
The only schema addition anywhere in this program is `urlSlug` on the cruxtag
registry. Companies, problem essays, and interview questions are new content
types in new files — never fields on articles.

| New edge | Derives from | New article field? |
|---|---|---|
| article → company (delta ①) | `source.company` | none |
| article → problem class (delta ②) | `cruxTag` | none |
| article → question (delta ③) | reverse index over `questions[*].evidence[].article` | none |
| article → pattern (existing) | `patterns[]` | none |

---

## The IA (Option C, as prototyped and approved)

- **Nav (all pages, one template):** Problems · Patterns · Interview +
  search + reserved avatar slot. Nav rule: the three learning axes are
  nav-primary; secondary nouns (Companies, Newsletter) get footer-reachable
  hubs. Revisit trigger for a Companies nav slot: month-3 evidence of
  company-query entry traffic.
- **URL map:** `/problems` (301 ← /catalog; the workbench, doubling as the
  problems index) · `/problems/<urlSlug>` (class pages, full or starter
  state) · `/patterns`, `/patterns/:slug` (unchanged) · `/interview`,
  `/interview/:slug` · `/companies/<companySlug>` (+ index, see D4) ·
  `/newsletter` (static pitch page, footer-linked) · `/articles/:slug`
  (unchanged body; three lateral deltas: source eyebrow → company page,
  "Part of:" → problem page, "answers this question" chip).
- **Class page = the one living object:** edition content in web costume +
  provenance line; email furniture (masthead, edition number, pacing
  eyebrow, next-week teaser) exists only in the email.
- **Reserved slots:** avatar right of search (accounts, later); practice
  card at the bottom of /interview (phase-2 mock docks there; phase-1
  drills live on question pages and need no slot).

---

## Decisions (all settled unless marked)

### D1 — Slug scheme
`cruxtags.json` entries gain `urlSlug` (plain-words page address). `cruxTag`
remains the registry slug, the foreign key in 41 article files, and the
anchor id — it is never renamed and never displayed. **OWNER-PENDING: the 14
urlSlug values** (blocks build step 3, not steps 1-2).

### D2 — /catalog → /problems migration and the @id rule
Rename ships as a 301 (`vercel.json` precedent — two `permanent:true`
pattern redirects already exist; query strings carry, hashes are
client-side). Step 2 is atomic: the build assertion (`prerender.ts:626-658`)
moves in the same commit as the `@id` builder.

DefinedTerm `@id`s are **anchor-based at `/problems#term-<registry-slug>`,
permanently, for all classes** — every class renders a workbench anchor
(verified: all 14 cruxTags are in active use), so `article.about` needs no
conditional logic as pages roll out. Ratified refinement: the workbench
DefinedTerm carries `subjectOf`/`url` → the class page when it exists; the
class page's `CollectionPage` carries `about: {@id: <term anchor>}`. Class
pages rank on their own canonical (`/problems/<urlSlug>`) + `CollectionPage`
markup, not on where the term `@id` lives.

**Nine-touchpoint migration checklist (normative; build assertion called out):**

| Touchpoint | File | Change |
|---|---|---|
| 301 | `vercel.json` | add `{ source:/catalog, destination:/problems, permanent:true }` |
| Legacy rewrite | `src/pages/CatalogRedirect.tsx` | `/?source=` → `/problems?source=` |
| `@id` builder | `scripts/prerender.ts` `cruxTagTermId` | `/catalog#term-` → `/problems#term-` |
| **Build assertion** | `scripts/prerender.ts:626-658` | dangling-`@id` check moves in the same commit |
| Lateral link | `src/pages/ArticleDetail.tsx:207` (`AlsoSolvingThis`) | `/catalog#term-` → `/problems#term-` |
| SearchAction | `scripts/prerender.ts:164` | `/catalog?q=` → `/problems?q=` |
| Breadcrumb label | `scripts/prerender.ts` `articleMeta` | "Catalog" → "Problems" |
| Nav active-state | `src/components/Navbar.tsx:21` | `catalogActive` logic + label |
| Sitemap | `scripts/generate-sitemap.ts:64` | `/catalog` → `/problems` |

### D3 — Problem-page content: storage, states, and the edition pipeline
Gating rule: essay file exists → FULL state; absent → STARTER state derived
from member articles' `cruxSummary` + source attribution (no interview corner
when no question cites the class; no padding).

Ratified counter (repo-grounded): the essay is **not** markdown. Verified —
zero markdown/MDX/frontmatter runtime in `package.json`; `Prose.tsx` renders
plain-text-plus-lists only (markdown deliberately deferred); the full-state
page is structured layout (metric grid, per-company colored vantage rows,
collapsibles, takeaway cards, dark simulator CTA), not prose. The essay lives
at `content/problems/<registry-slug>.json` as a structured record of typed
blocks (`lede`, `metricGrid`, `vantageRows`, `deepDive`, `numbers`,
`whatToSteal`, `simulatorRef`, ...), rendered by dedicated components; prose
inside blocks uses the existing `Prose` string format. The prototype's
full-state page is the reference implementation of the block set. Two rules
attach:

1. **The block set is a schema, not a per-edition invention.** Future
   editions compose from existing block types; adding a block type is a
   deliberate schema change with its own review, never an inline act.
2. **The JSON record is canonical; the email is derived.** Each edition is
   authored once as the `problems/<slug>.json` record; the email rendering is
   generated from it (blocks → email-safe markup) plus the email-only
   furniture. `edition-NN.md` ceases to be a maintained artifact — it becomes
   an output, eliminating dual-authoring drift between the page and the email.

### D4 — Companies: registry, key, and the hub
Registry `content/companies/<companySlug>.json` = `{ slug, blurb,
blogUrls[] }`; everything else (walls, patterns, breakdowns, question strip,
counts) derives.

Ratified counter (repo-grounded): the key is a **company slug**, default
`slugify(source.company)`, aggregating across all of a company's
`source.slug`s. Verified — Stripe's `source.slug` is `stripe-engineering`;
the docdb round publishes as `stripe-dev-blog`; keying on `source.slug` would
split Stripe into two company pages the moment round 36 lands (a derive-or-die
violation). The prototype's own `/companies/stripe` confirms the intent. The
registry entry may carry an explicit slug override where the default
misfires; known edge to settle in the slug pass: "Amazon (AWS)" →
`amazon-aws` by default vs the likely-intended `aws`.

Discoverability: nav stays three entries; a modest `/companies` index ships
footer-linked and sitemap'd so company pages are not crawler orphans.
**OWNER-PENDING: index in v1 vs v1.1** (recommendation: v1 — it is a trivial
list page once the registry exists in step 5, and deferring saves almost
nothing; blocks nothing before step 5).

### D5 — Interview pages
A heavy authored content type: `whatTheyreTesting` / `answerShape` /
`followUps` are authored prose fields; `evidence[]` is the curated lens; the
article→question chip derives from a `questionsByArticle` reverse index (never
an authored article field); `FAQPage` + `BreadcrumbList` JSON-LD per page.

**The realising sub-spec is `spec-interview-pages.md`** (received 2026-08-14),
incorporated by reference and folded into the unified plan at **step 4**. It
is consistent with this doc (frozen article schema, question-owns-the-lens
authorship, reverse index mirroring `patternStats`, both-indexer requirement,
`FAQPage`, `@id` assertion extension). Reconciliation against repo truth on
receipt produced three carry-forwards, normative when the sub-spec is
implemented:

1. **`/catalog` → `/problems` rewrite.** The sub-spec (§3, §6, §7) predates
   the D2 migration and still writes `/catalog#term-<cruxTag>` and nav
   "Catalog". Because interview pages are step 4 (after the step-2 rename),
   `cruxTagTermId` is already `/problems#term-<registry-slug>` by then. All
   crux links and the nav label in the sub-spec resolve to the post-migration
   forms. Do not reintroduce `/catalog`.
2. **`followUps ≥ 2`** (this doc's D5 amendment). The sub-spec §4 validator
   lists the ≥3-evidence / ≥3-company floor but not the `followUps ≥ 2` rule.
   Add it: `FAQPage` needs ≥2 Q&A pairs to be structurally valid, and
   `followUps` are those pairs. The existing floor stands.
3. **The question chip must not be purple.** Verified — the specimen's
   `answers:` chip is `#7C3AED`, which the repo tokens define as
   `--cat-purple`, the exact color `PatternChip` renders for the
   `consistency` category. `idempotency-keys` *is* `consistency`, so a purple
   question chip would sit indistinguishable beside a purple pattern chip on
   the stripe-idempotency article — the collision the sub-spec's §5 forbids.
   Resolution: distinguish the `QuestionChip` **structurally** (a leading
   "Answers:" label and/or a `Q` glyph), or use brand-gold, which sits
   outside the five-category pattern ramp (blue/purple/green/orange/cyan).
   Never rely on color alone, and never purple.

Minor implementation note (not a doc-level decision): `article.artifact.teaser`
is optional in the schema, so the sub-spec §4 validator should assert the
`artifactCta.article` has a **teaser**, not merely an artifact, or the derived
CTA renders textless.

### D6 — SEO plumbing
JSON-LD mapping: problems → `CollectionPage` + `DefinedTerm` (per D2);
companies → `Organization` + `CollectionPage`; interview → `FAQPage` (`QAPage`
only if a page ever narrows to a single Q&A). The dangling-`@id` assertion
extends to all five new edges (article→company, article→question,
article→problem, question→article, essay→article). Every new page type is
added by hand to all four registries — `routes[]` table (`prerender.ts:586`),
sitemap array (`generate-sitemap.ts`), `src/content/index.ts` globs,
`scripts/load-content.ts` dirs — plus a `*Meta()` builder; the implementation
plan lists these per page type.

### D7 — Launch-data findings
Ship on repo truth: Stripe at 2 breakdowns (the docdb card renders only when
the article publishes), Figma as the thin company archetype, the workbench at
14 classes. P0 makes the round-36/37 publishes zero-touch upgrades; the 15th
class page appears as a starter the day its registry entry and articles land.

---

## Additions

**A — Hero artifact: separate track.** `hero-artifact.jsx` is repo-net-new
(design-phase provenance notwithstanding); it stays outside this program's
blast radius. Landing deltas remain exactly: nav, CTA → /problems, trust-band
wordmarks → built company pages. **OWNER-PENDING: whether/when the landing
gains the hero** (blocks nothing).

**B — Nav standardization + glossary.** One nav template across all page types
(search + avatar slot everywhere, including the interview pages); vestigial
`catalog-search` id renamed `problems-search`. Glossary, pinned:

| Term | Meaning | Where |
|---|---|---|
| `cruxTag` | registry slug / join key | code + article JSON |
| "problem class" | display noun | public UI |
| `urlSlug` | page address | registry field (D1) |

No other new fields anywhere.

**C — Build order (settled, dependency-correct).**

1. Registries + `urlSlug` + derivations + **validators** (validators land
   before their content, inside this step and again inside 4 and 5)
2. **Atomic:** /catalog→/problems rename + redirects + `@id` migration +
   assertion update
3. Problem pages — starter state for all 14
4. Interview pages (`spec-interview-pages.md` folded in, per D5 reconciliation)
5. Company pages + full-state essay for `ambiguous-failure-under-retry`
   (+ /companies index if OWNER rules v1)
6. Newsletter page

---

## OWNER-PENDING register

| # | Item | Blocks | Status |
|---|------|--------|--------|
| 1 | 14 urlSlug values (D1) + company-slug edge cases (D4, e.g. AWS) | step 3 (and company URLs at step 5) | drafting next, from cruxtags.json |
| 2 | /companies index v1 vs v1.1 (D4) | step 5 scope only | recommendation: v1 |
| 3 | Hero artifact on the landing (A) | nothing | separate track |

---

## Reconciliation log

- **v1.0 (2026-08-13)** — decision ledger consolidated to settled positions.
- **2026-08-14** — `spec-interview-pages.md` received and reconciled against
  repo truth. Verdict: consistent; incorporated by reference as the D5
  step-4 sub-spec. Three carry-forwards recorded in D5 (the /catalog→/problems
  rewrite, the `followUps ≥ 2` amendment, and the non-purple `QuestionChip`
  finding), plus one minor validator note (require `artifactCta` teaser).
