# behindscale — Navigation IA: Finalised Design Doc

Version 1.1 · 2026-08-13 (rationale + discussion distilled 2026-08-14) ·
Status: SETTLED except items marked OWNER-PENDING

The implementation plan cites this doc by section. **Repo truth wins over
any prior document.**

Provenance: design brief → design agent's IA proposal (Option C) → clickable
prototype (10 surfaces) → implementation agent's repo-grounded review →
rulings → decision ledger → this consolidation. The design agent's
do-not-build list of ten is ratified verbatim and incorporated by reference
from the proposal; it is product record and is not relitigated.

**How to read this doc.** Every decision below is stated as **Decision** (the
settled position), **Why** (the reasoning), **Alternatives considered** (what
we rejected and on what grounds), and **Trade-off** (the cost we knowingly
accept). Settled decisions are not relitigated; the rationale is recorded so
the implementation plan — and anyone who inherits this — can see the shape of
the argument, not just its conclusion.

---

## The design discussion, distilled

This program began as a clickable prototype of an accepted IA (Option C),
reviewed page-by-page against the live repo. Ten findings from that review
shaped every decision that follows; recording them keeps the "why" legible.

1. **Empty-section discipline was the prototype's best instinct — ratify it.**
   The starter class page and thin company page *drop* sections that have no
   data (no interview corner when no question cites the class; no question
   strip when no question cites the company; no padding). This is the
   product's deepest existing convention (`ArtifactTeaser` and
   `AlsoSolvingThis` already render only when their data exists). It became
   the file-presence gating rule (D3) and the derive-or-die invariant (P0).

2. **The "honest flagship" finding reframed the launch data.** The rich Stripe
   company page shows 3 walls / 3 breakdowns / 6 patterns — but on *published*
   repo data Stripe sits in only two crux classes (`ambiguous-failure-under-
   retry`, `priority-blind-load-shedding`); its third wall exists only via the
   unpublished `stripe-docdb` round. The flagship is padded by unpublished
   content. Rather than fake it, we made **derivation** the mechanism (P0):
   ship the honest 2-wall page, and let publishing the round upgrade it with
   zero touch. This is the single insight that turned "derive counts" from
   hygiene into architecture.

3. **A crux class had no page — the whole `/problems` elevation is net-new.**
   Today a cruxTag is only a catalog *grouping* reachable at
   `/catalog#term-<slug>`, load-bearing across the JSON-LD `@id` contract, the
   `AlsoSolvingThis` link, the `SearchAction`, and a build-time assertion.
   Promoting each class to a first-class page (`/problems/<slug>`) is
   defensible but ripples through internals a visual prototype can't show →
   D2's nine-touchpoint migration.

4. **The slug scheme was a collision, not a naming whim.** The prototype used
   three slugs for one class (page `ambiguous-timeouts`, registry key
   `ambiguous-failure-under-retry`, anchor `#term-…`). Because `cruxTag` is the
   *foreign key* joining 41 article files, this is structural → D1.

5. **Company pages need data that doesn't exist.** Most of a company page is
   derivable (like `patternStats`), but the intro blurb and blog URLs are not
   — the tell is that the prototype's Figma intro has no blog link while
   Stripe's has two, because it's hand-authored per company → D4's thin
   registry.

6. **Interview questions are a heavy authored type, not a thin lens.** The
   evidence rows are a lens over articles, but "what they're testing," the
   6-step answer shape, and follow-ups are original long-form content →
   D5's authored fields + the acknowledgement that each question is a
   mini-article.

7. **Newsletter = problem page is the strongest reuse decision.** An edition's
   "view in browser" *is* its problem page; one artifact serves email + a
   permanent web page → D3's canonical-JSON / derived-email pipeline.

8. **SEO was entirely absent from the prototype, and it's the whole point.**
   These pages target exact search phrases; interview pages especially are
   textbook `FAQPage` candidates. The highest-leverage, most under-specified
   area → D6.

9. **The runtime files are throwaway (mostly).** `support.js` is a generated
   dc-runtime micro-framework ("GENERATED … do not edit") — custom templating,
   in-browser Babel, React-from-CDN, an editor bridge; **none survives** into
   the Vite/React site. `hero-artifact.jsx` is ~transfer-ready React but
   repo-net-new UI. Nobody should mistake the prototype runtime for product
   code → A.

10. **Consistency nits worth pinning.** The interview specimen's nav dropped
    search + avatar (template drift); a vestigial `catalog-search` id survives
    the rename; counts are hardcoded in labels → B and P0.

---

## P0 — Governing invariants

### Derive-or-die

**Decision.** Every count-like or membership-like string on any surface
derives at build time from article/question/registry data; none is stored.

Normative derivation table:

| Surface string | Derives from |
|---|---|
| "Browse all N breakdowns" | `articles.length` |
| Company eyebrow "N breakdowns · N problems · N patterns" | company's articles → distinct cruxTags / union `patterns[]` |
| Class "seen at N companies" / "N systems" | `articles.filter(cruxTag).map(source.company)` distinct |
| Workbench "N problem classes" | distinct in-use cruxTags |
| Question "Answered by N companies" | distinct `article.source.company` across `evidence[]` |

**Why.** The editorial ledger runs ahead of the published repo (round 36
`stripe-docdb`, round 37's 15th class: delivered, not yet published).
Derivation is the *mechanism* by which publishing a round upgrades the
workbench, class pages, and company pages with **zero touch** — the skew is
the standing proof case, not a corner case.

**In plain terms.** The day the `stripe-docdb` article is published, Stripe's
company page changes its own eyebrow from "2 breakdowns" to "3" and grows a new
wall — and nobody edits that page. If we had simply typed "2" into the page,
someone would have to remember to change it by hand, and would eventually
forget.

**Alternatives considered.** Store counts/member-lists as convenience fields
(what the prototype does in labels). Rejected: every publish would then
require hand-editing every surface that mentions the number, and stale counts
are worse than none — they lie to the reader and to crawlers.

**Trade-off.** Every surface needs a real derivation (a reverse index or an
aggregation at build time); there is no hardcoded shortcut, even for a count
that "won't change soon." We accept more build-time computation to buy
zero-touch upgrades.

### Frozen article schema

**Decision.** The article JSON schema does not change. All new edges derive
from existing fields (`source.company`, `cruxTag`, `patterns[]`) or from
reverse indexes over new content types. The only schema additions anywhere are
`urlSlug` (on the cruxtag registry) and `aliases` (on the pattern registry).

**Schema-addition amendment (v1.2, 2026-08-18).** The `/patterns` listing
rebuild adds an optional `aliases: string[]` to `content/patterns/*.json`
(1–3 lowercase industry-vocabulary search terms per pattern). Same sanction as
`urlSlug`: it is a *public-surface bridge from arrival vocabulary to house
vocabulary* — a reader searching "partitioning" or "backpressure" reaches the
house-coined pattern name they'd never have guessed. Both live on **registries**
(cruxtag, pattern), never on article files, so the frozen-article invariant is
untouched. `aliases` is display-free search data (except the card's
`matches: <alias>` line). It ships with the schema + validator + search wiring
and **zero aliases present** — the field is optional, recall comes from the
definition + category-gloss corpus layers on day one, and aliases land
incrementally through the owner's per-pattern review (never generated).

**Schema-addition amendment (v1.3, 2026-08-19).** Pattern detail pages gain
interactive artifacts. `content/patterns/*.json` gains an optional
`artifact: { path: string; teaser?: string } | null` — the identical shape
to `Article.artifact`. Same sanction as `aliases`/`urlSlug`: it lives on a
**registry** (the pattern file), never on an article file, so the
frozen-article invariant is untouched. This is the technical body of
`docs/pattern-artifacts-design.md` (APPROVED 2026-08-19). Both capabilities
(figures + artifacts) now read one host registry
(`scripts/content-hosts.ts`, generalizing the shipped `figure-hosts.ts`),
capability-gated, so future category/company/question hosts join as data.
Collision handling ratified as **Approach A** (flat `/artifacts/<slug>/`
namespace + global `artifact-slug-unique` guard — symmetric with the
shipped figures model). Ships with the schema + four validators
(`artifact-path-matches-slug` generalized, `artifact-slug-unique`,
`artifact-bundle-exists`, `orphan-artifacts`) and **zero pattern artifacts
authored** — the field is optional; authoring is additive (the first, the
PALS hero port, lands in the pattern-detail page rebuild).

**Schema-addition amendment (v1.4, 2026-08-19).** The `/patterns/:slug`
detail rebuild adds an optional `oneLineDefinition: string` to
`content/patterns/*.json` — a single plain sentence rendered as the page's
lede and, when present, the SEO meta description. Same sanction as
`aliases`/`artifact`: it lives on the **pattern registry**, never on an
article file, so the frozen-article invariant is untouched. Render-when-present
with **zero authored today** — the header collapses with no reserved gap and
SEO falls back to its derivation until the owner authors ledes per-pattern
(never generated). The detail page is otherwise pure derivation over the
existing `patternStats` relations (breakdown/company counts, the strip,
co-occurrence, the problems door); the artifact *mechanism section* is
deferred to a later per-pattern enrich pass (progressive authoring, the
ProblemDetail model).

| New edge | Derives from | New article field? |
|---|---|---|
| article → company (delta ①) | `source.company` | none |
| article → problem class (delta ②) | `cruxTag` | none |
| article → question (delta ③) | reverse index over `questions[*].evidence[].article` | none |
| article → pattern (existing) | `patterns[]` | none |

**Why.** Article files are review-gated editorial artifacts. Coupling a
fast-moving marketing/navigation layer to them would drag every nav change
through editorial review and risk breaking in-flight rounds. We already
refused this coupling once (keeping question data out of article JSONs); this
invariant generalises that refusal.

**In plain terms.** To make the Stripe idempotency article show an "Answers:
How do you prevent double payments?" chip, we never open the article file.
Instead, the *question* file lists that article as evidence, and at build time
we compute a lookup — "which questions point at this article?" — and use it to
draw the chip. The article file stays frozen; the link still appears.

**Alternatives considered.** Add `answers: [questionSlug]` (or
`questions[]`) to article JSON so the article→question chip is a direct field.
Rejected: the per-relationship prose (each evidence one-liner) belongs to the
question, evidence order is editorial, and it recouples the two layers. The
reverse index gives the same chip with none of the coupling.

**Trade-off.** Every new edge must be *derived* (more index-building code in
`src/content/index.ts`, more to keep in sync) rather than read from a field.
We accept index code in exchange for an untouchable article schema.

---

## The IA (Option C, as prototyped and approved)

**Decision.**
- **Nav (all pages, one template):** Problems · Patterns · Interview + search
  + reserved avatar slot. Rule: the three **learning axes** are nav-primary;
  secondary nouns (Companies, Newsletter) get footer-reachable hubs.
- **URL map:** `/problems` (301 ← /catalog; the workbench, doubling as the
  problems index) · `/problems/<urlSlug>` (class pages, full or starter state)
  · `/patterns`, `/patterns/:slug` (unchanged) · `/interview`,
  `/interview/:slug` · `/companies/<companySlug>` (+ index, see D4) ·
  `/newsletter` (static pitch page, footer-linked) · `/articles/:slug`
  (unchanged body; three lateral deltas).
- **Class page = the one living object:** edition content in web costume +
  provenance line; email furniture (masthead, edition number, pacing eyebrow,
  next-week teaser) exists only in the email.
- **Reserved slots:** avatar right of search (accounts, later); practice card
  at the bottom of /interview (phase-2 mock docks there; phase-1 drills live
  on question pages and need no slot).

**Why the nav rule.** Problems/Patterns/Interview are the three ways a reader
*learns* (by bottleneck, by solution vocabulary, by interview question).
Companies and Newsletter are ways to *browse/subscribe* — real, but secondary.
Keeping nav to three axes preserves a legible mental model; a fourth entry
would blur "how I learn" with "how I browse."

**Alternatives considered.** (a) A Companies nav entry — rejected now, but with
a concrete revisit trigger: month-3 evidence of company-query entry traffic.
(b) A separate `/newsletter` nav entry — rejected; a subscribe surface is not
a learning axis.

**Trade-off.** Company and newsletter pages are reachable only laterally
(article eyebrows, trust-band, footer) and via their hubs. We mitigate the
crawler-orphan risk for companies with a footer-linked, sitemap'd index (D4).

---

## Decisions

### D1 — Slug scheme

**Decision.** `cruxtags.json` entries gain `urlSlug` (plain-words page
address). `cruxTag` remains the registry slug, the foreign key in 41 article
files, and the anchor id — never renamed, never displayed. Page URL =
`urlSlug`.

**STAMPED (2026-08-16).** All 14 `urlSlug` values ruled and written to
`content/cruxtags.json`; the `cruxtag-urlslug` validator enforces present +
kebab-case + unique. Style rule: **term of art where one exists, plain symptom
where it doesn't**, and the governing principle — **problem pages get problem
vocabulary; solution words belong to /patterns and /interview; a broad
single-word slug is a namespace claim, spent only on true terms of art.**

| `cruxTag` (frozen key) | `urlSlug` (page address) |
|---|---|
| `priority-blind-load-shedding` | `blind-load-shedding` |
| `partial-completion-under-crashes` | `interrupted-operations` |
| `single-table-scaling-ceiling` | `outgrowing-one-table` |
| `ambiguous-failure-under-retry` | `ambiguous-timeouts` |
| `single-cluster-scaling-ceiling` | `outgrowing-one-cluster` |
| `blast-radius-scales-with-cluster-size` | `cluster-blast-radius` |
| `buffer-degrades-under-backlog` | `queue-backlog` |
| `gray-failure-defeats-automatic-detection` | `gray-failure` |
| `observer-shares-fate-with-observed` | `blind-during-outages` |
| `retry-amplified-overload` | `retry-storms` |
| `mitigation-scoped-narrower-than-failure` | `mitigation-gaps` |
| `degraded-state-outlives-its-trigger` | `metastable-failure` |
| `unrecorded-config-outlives-its-authors` | `undocumented-config` |
| `placement-precedes-the-access-pattern` | `blind-data-placement` |

Notes on the four that moved off the first draft: **#1** `blind-load-shedding`
(not `load-shedding` — that solution word competes with
`/interview/design-a-rate-limiter` for one query family, and load-shedding is a
solution term on a problem page); **#2** `interrupted-operations` (not
`partial-failures` — "partial failure" is an established term for a *different*
concept, so the slug would mislabel the class); **#5** `outgrowing-one-cluster`
(not `outgrowing-one-database` — verified from the article files that one member,
`google-colossus`, is a *storage* cluster, not a database, so the database
wording would mislabel it); **#9** `blind-during-outages` and **#14**
`blind-data-placement` form a deliberate "blind-" house motif with #1.

Three values are stamped as defaults still open to an owner veto (trivial to
flip — no route consumes them yet): **#6** `cluster-blast-radius` (bare
`blast-radius` is defensible on search grounds; taste-flagged), **#9**
`blind-during-outages` (fallback `monitoring-shares-fate` if the motif is
disliked), **#11** `mitigation-gaps` (lowest-confidence; `partial-mitigation`
considered and rejected — "gap" names the problem, "partial" only a property).

**Why.** The join key carries no display duty; a plain-words URL is an
editorial/marketing concern that should not reach into the data layer.

**In plain terms.** The class is stored in data as `ambiguous-failure-under-
retry` (the exact string 41 article files and the code join on). Readers see it
at the friendlier address `/problems/ambiguous-timeouts`. Only the address is
"prettified"; the underlying key never moves, so renaming for readability
touches one registry line, not 41 article files.

**Alternatives considered.** Rename the cruxTag registry keys to the
plain-words slugs across all 41 article files. Rejected on three grounds: (a)
join keys shouldn't carry display duty; (b) the rename touches review-gated
editorial artifacts and would break in-flight editorial rounds that reference
registry slugs; (c) the `@id`/anchor contract is keyed on the registry slug,
so leaving it fixed keeps D2 stable. This is the same coupling we refused for
question data.

**Trade-off.** A class now has two identifiers (registry `slug` + `urlSlug`)
and one indirection everyone must respect: pages address by `urlSlug`, data
and anchors join by `cruxTag`. A small, explicit mapping is the price of never
touching article files for a naming change.

### D2 — /catalog → /problems migration and the @id rule

**Decision.** Rename ships as a 301 (`vercel.json` precedent — two
`permanent:true` pattern redirects already exist; query strings carry, hashes
are client-side). Step 2 is **atomic**: the build assertion
(`prerender.ts:626-658`) moves in the same commit as the `@id` builder.
DefinedTerm `@id`s are **anchor-based at `/problems#term-<registry-slug>`,
permanently, for all classes**. Refinement: the workbench DefinedTerm carries
`subjectOf`/`url` → the class page when it exists; the class page's
`CollectionPage` carries `about: {@id: <term anchor>}`.

**Nine-touchpoint migration checklist (normative):**

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

**Why the rename.** "Problems" is the public noun the whole IA is built around
("Browse by problem class"), it targets exact-phrase search, and elevating
classes to real pages gives each a linkable home a `#term` anchor can't be.

**Why permanent anchor-based @ids.** Verified: all 14 cruxTags are in active
use, so every class always renders a workbench anchor. Keeping the DefinedTerm
`@id` at that anchor means `article.about` **never needs conditional logic** as
class pages roll out — the reference target is stable from day one, whether or
not a given class has a page yet.

**In plain terms.** Think of the `@id` as a permanent street address for a
problem class on the workbench page. Every article already "points home" to
that address in its behind-the-scenes data (this is what search engines read).
When we later build a dedicated page for the class, we keep the old address
alive and just add a signpost from it to the new page — so nothing that already
points home ever breaks, and we never have to rewrite where an article points
just because its class got a page.

**Alternatives considered.** (a) Keep `/catalog` — rejected; the public noun
and the class-page hub both argue for `/problems`. (b) Make
`article.about`'s `@id` conditional: point at the class page when built, else
the anchor. Rejected: it introduces per-article conditional logic and a
transitional dual scheme, and `article.about` would *change* as pages roll
out — churn in structured data for no gain. The `subjectOf`/`about`
cross-links give the entity graph the term↔page connection without that churn.

**Trade-off.** (a) The rename is a nine-touchpoint change with a
*build-breaking* assertion in the middle, so it must land atomically — more
risk in one commit than a drip migration. (b) The DefinedTerm identity lives
at the workbench anchor, not the rich class page; we accept that because the
class page ranks on its own canonical (`/problems/<urlSlug>`) +
`CollectionPage` markup, and the `subjectOf` link still points crawlers from
the term to the page.

### D3 — Problem-page content: storage, states, and the edition pipeline

**Decision.** Gating rule: essay file exists → FULL state; absent → STARTER
state derived from member articles' `cruxSummary` + source attribution. The
essay lives at `content/problems/<registry-slug>.json` as a **structured
record of typed blocks** (`lede`, `metricGrid`, `vantageRows`, `deepDive`,
`numbers`, `whatToSteal`, `simulatorRef`, …), rendered by dedicated
components; prose inside blocks uses the existing `Prose` string format. Two
rules attach: (1) the block set is a schema, not a per-edition invention; (2)
the JSON record is canonical, the email is *derived* from it — `edition-NN.md`
becomes an output, not a maintained artifact.

**Why file-presence gating.** It's the render-when-present ethos expressed as
data: no state flag to keep in sync, no way for "full" and "no essay" to
disagree. Presence *is* the state.

**In plain terms.** `ambiguous-timeouts` has an essay file written for it, so
it shows the full magazine-style page (metric grid, deep dive, "what to
steal"). `queue-backlog` has no essay file yet, so it shows a simple
auto-built list of the systems that hit that wall. The only thing that flips a
class from the simple page to the rich one is whether its essay file exists —
there is no separate "is this page finished?" switch to forget to set.

**Why structured JSON, not markdown (repo-grounded counter).** Verified: zero
markdown/MDX/frontmatter runtime in `package.json`; `Prose.tsx` renders
plain-text-plus-lists only (markdown deliberately deferred); and the
full-state page is *structured layout* (metric grid, per-company colored
vantage rows, collapsibles, takeaway cards, dark simulator CTA), not prose. A
markdown body cannot express that layout, and the prototype itself proves it —
the design agent hand-transcribed the markdown edition into rich components
precisely because markdown couldn't carry the structure.

**Why canonical-JSON / derived-email.** Authoring the edition once (as the
JSON record) and generating the email from it eliminates dual-authoring drift
between the page and the email — the page and the email can never disagree
because they share one source.

**Alternatives considered.** (a) `.md` + frontmatter essay — rejected (no md
runtime; Prose is plain-text-only; full page is components). (b) MDX (markdown
+ embedded components) — rejected as a dependency jump the repo deliberately
avoided. (c) A `state` flag field on the registry instead of file presence —
rejected; a flag can drift from reality, presence cannot. (d) Keep
`edition-NN.md` as the maintained source and transcribe to the page by hand —
rejected; that *is* the dual-authoring drift we're eliminating.

**Trade-off.** (a) The block set becomes a governed schema — adding a block
type is a deliberate, reviewed change, never an inline act, which slows a
one-off creative flourish. (b) Full-state essays are heavier to author than
auto-derived starters; the library will carry two visibly different tiers of
class page for a long time. We accept both: the schema discipline is what lets
the email be generated, and the two-tier look is honest about which classes
have had an edition written.

### D4 — Companies: registry, key, and the hub

**Decision.** Registry `content/companies/<companySlug>.json` = `{ slug,
blurb, blogUrls[] }`; everything else (walls, patterns, breakdowns, question
strip, counts) derives. The key is a **company slug**, default
`slugify(source.company)`, aggregating across all of a company's
`source.slug`s; a registry entry may carry an explicit override. A modest
`/companies` index ships footer-linked and sitemap'd. **OWNER-PENDING: index
in v1 vs v1.1** (recommendation: v1).

**Company-slug enumeration (2026-08-16).** All 23 distinct `source.company`
values in the repo slugify cleanly **except one**: `"Amazon (AWS)"` →
`slugify` yields `amazon-aws`; **RULED override → `aws`** (the registry entry
for Amazon carries the explicit slug). No other value misfires. The
Google/Google-Cloud merge question is **not-applicable today**: the repo has
exactly one company `"Google"` (→ `/companies/google`); `google-cloud` is only
a `source.slug`, not a distinct `source.company`, and D4 keys on company, so
there is nothing to merge. If a future article sets
`source.company: "Google Cloud"`, rule then (recommend merging under
`/companies/google` if it's Google infra). Every company today has exactly one
`source.slug`, so multi-source aggregation is dormant until the docdb round
(Stripe's second blog) publishes.

**Why a thin registry + derivation.** The company page mirrors the pattern
page's article-declares / page-derives model (`patternStats`): walls, patterns,
breakdowns, and the question strip are all aggregations over the company's
articles. Only two things aren't derivable — the hand-written intro blurb and
the blog URL(s) — so those, and only those, are stored.

**Why key on company, not source.slug (repo-grounded counter).** Verified:
Stripe's `source.slug` is `stripe-engineering`; the docdb round publishes as
`stripe-dev-blog`. Keying on `source.slug` would split Stripe into *two*
company pages the moment round 36 lands — a direct derive-or-die violation.
The prototype's own `/companies/stripe` URL confirms company-level keying was
always the intent.

**In plain terms.** Stripe writes on two blogs — `stripe-engineering` and
`stripe-dev-blog`. If we filed company pages by blog, the day we publish an
article from the second blog we'd suddenly have two half-empty "Stripe" pages.
Filing by company name instead keeps everything Stripe writes on one
`/companies/stripe`, no matter how many blogs it comes from.

**Why a `/companies` index despite no nav entry.** A page type stood up *for
SEO* that is reachable only laterally is a crawler orphan. A footer-linked,
sitemap'd index gives crawlers (and readers) a hub without spending a nav slot
reserved for the learning axes.

**Alternatives considered.** (a) Key on `source.slug` — rejected (splits
companies). (b) Give Companies a nav entry — rejected (nav is for learning
axes; revisit at month-3 traffic evidence). (c) No index, lateral-only —
rejected (orphans). (d) Store counts/member-lists on the registry — rejected
(P0).

**Trade-off.** The default `slugify(company)` misfires on edge cases ("Amazon
(AWS)" → `amazon-aws` vs the likely-intended `aws`), so the registry needs an
override field and a human pass on company slugs. We accept a small manual
slug step to keep URLs clean.

### D5 — Interview pages

**Decision.** A heavy authored content type: `whatTheyreTesting` /
`answerShape` / `followUps` are authored prose fields; `evidence[]` is the
curated lens; the article→question chip derives from a `questionsByArticle`
reverse index (never an authored article field); `FAQPage` + `BreadcrumbList`
JSON-LD per page. The realising sub-spec is `docs/spec-interview-pages.md`
(received 2026-08-14), incorporated by reference and folded into the unified
plan at **step 4**.

**Why question-owns-the-lens authorship.** The per-relationship prose (each
evidence one-liner) belongs to the question; evidence order is editorial; and
article files are review-gated artifacts the marketing layer must not couple
to. So the question file owns the curated slug lists, and the article→question
chip is a *derived* reverse index (mirroring `patternStats`), not a field on
41 article files.

**Why "heavy authored type," not "thin lens."** On inspection the page is only
half lens: the evidence rows curate existing articles, but "what they're
testing," the answer shape, and the follow-ups are original long-form content
written per question. Calling it thin would have under-budgeted the authoring
cost — each question is closer to a mini-article.

**Alternatives considered.** (a) Article owns `answers[]` — rejected (couples
the layers; per-relationship prose belongs to the question). (b) Treat
questions as a thin derived lens with no original prose — rejected (the answer
shape and follow-ups are the reader's actual value and aren't derivable).

**In plain terms.** The list of five companies and their one-line takes is just
a curated view of articles we already have — that part is a "lens." But "what
the interviewer is really testing" and the step-by-step way to answer are
freshly written for each question. That's real writing, not a rearrangement of
existing content — which is why a question costs about as much to make as a
small article.

**Trade-off.** High authoring cost per question (five at launch, more later),
and a second chip species to design so it never reads as a pattern chip. We
accept the authoring cost because the original answer content is the point of
the page.

**Reconciliation carry-forwards (normative when the sub-spec is implemented):**
1. **`/catalog` → `/problems` rewrite.** The sub-spec (§3, §6, §7) predates
   the D2 migration and still writes `/catalog#term-<cruxTag>` and nav
   "Catalog". Interview pages are step 4 (after the step-2 rename), so
   `cruxTagTermId` is already `/problems#term-<registry-slug>` by then. Do not
   reintroduce `/catalog`.
2. **`followUps ≥ 2`** (this doc's D5 amendment; add to the sub-spec §4
   validator). `FAQPage` needs ≥2 Q&A pairs to be structurally valid and
   `followUps` are those pairs. The existing ≥3-evidence / ≥3-company floor
   stands.
3. **The question chip must not be purple.** Verified: the specimen's `answers:`
   chip is `#7C3AED`, which the repo tokens define as `--cat-purple` — the
   exact color `PatternChip` renders for the `consistency` category.
   `idempotency-keys` *is* `consistency`, so a purple question chip would sit
   indistinguishable beside a purple pattern chip on the stripe-idempotency
   article. Resolution: distinguish the `QuestionChip` **structurally** (an
   "Answers:" label and/or a `Q` glyph), or use brand-gold (outside the
   five-category pattern ramp). Never rely on color alone, and never purple.

Minor implementation note: `article.artifact.teaser` is optional, so the
sub-spec §4 validator should assert `artifactCta.article` has a **teaser**, not
merely an artifact, or the derived CTA renders textless.

### D6 — SEO plumbing

**Decision.** JSON-LD mapping: problems → `CollectionPage` + `DefinedTerm`
(per D2); companies → `Organization` + `CollectionPage`; interview → `FAQPage`
(`QAPage` only if a page ever narrows to a single Q&A). The dangling-`@id`
assertion extends to all five new edges (article→company, article→question,
article→problem, question→article, essay→article). Every new page type is
added by hand to all four registries — `routes[]` (`prerender.ts:586`), the
sitemap array, `src/content/index.ts` globs, `scripts/load-content.ts` dirs —
plus a `*Meta()` builder.

**Why this is a first-class decision, not a footnote.** These pages exist to
win exact-phrase search; the structured data *is* the product surface for
crawlers. Interview → `FAQPage` is the highest-leverage piece: a question page
is a textbook FAQ rich-result candidate, which the prototype ignored entirely.

**In plain terms.** A question page like "How do you prevent double payments?"
with its follow-up Q&As is exactly the kind of page Google shows as an
expandable FAQ box right in the search results. The `FAQPage` tag is what makes
that box appear — it's free visibility we'd throw away by leaving it off.

**Why extend the @id assertion.** The existing build-time assertion is what
guarantees structured data never ships dangling. New inter-page edges without
that guard would silently ship broken `@id`s; extending it keeps the same
safety posture the repo already relies on.

**Alternatives considered.** (a) Minimal `<meta>` only, no JSON-LD — rejected;
forfeits the rich-result upside that justifies the pages. (b) Auto-discover
routes/sitemap entries instead of hand-maintaining the arrays — rejected; the
repo deliberately keeps these explicit and greppable (the same reason the
content globs and validator dirs are hand-listed).

**Trade-off.** Every new page type touches four hand-maintained registries plus
a Meta builder plus the assertion — more places to keep in sync per type. We
accept the explicit-over-magic cost because it's the repo's established posture
and it makes drift a compile/grep-visible error rather than a silent gap.

### D7 — Launch-data findings

**Decision.** Ship on repo truth: Stripe at 2 breakdowns (the docdb card
renders only when the article publishes), Figma as the thin company archetype,
the workbench at 14 classes.

**Why.** The prototype's "3 Stripe / 15 classes" came from the editorial
ledger, which runs ahead of the published repo. We ship what's published; the
ledger's rounds upgrade the surfaces automatically once they land (P0).

**Alternatives considered.** Render the unpublished docdb card / 15th class now
(the bundle JSONs exist). Rejected: a bundle JSON existing ≠ published;
rendering ahead of publication ships content that 404s or misrepresents the
library.

**Trade-off.** The flagship Stripe page is a 2-wall page until docdb publishes
— less dramatic than the prototype's 3-wall showcase. Accepted because it's
above the Figma floor and, crucially, upgrades to 3 walls with **zero deploy**
the day the round lands. The 15th class appears as a starter page the day its
registry entry and articles land.

---

## Additions

### A — Hero artifact + prototype runtime: separate track

**Decision.** `hero-artifact.jsx` stays outside this program's blast radius.
Landing deltas remain exactly: nav, CTA → /problems, trust-band wordmarks →
built company pages — nothing else. **OWNER-PENDING: whether/when the landing
gains the hero** (blocks nothing).

**Why.** The hero is repo-net-new *UI*, not a navigation delta; bundling it
into the IA migration would mix a content/visual decision into a routing/SEO
change. And the prototype's runtime is not product code: `support.js` is a
generated dc-runtime micro-framework (in-browser Babel, React-from-CDN, editor
bridge) that is entirely thrown away; only `hero-artifact.jsx` is
~transfer-ready (swap its `React` global for an ESM import, `window.X =` for
`export default`). Keeping the hero on its own track prevents anyone treating
prototype scaffolding as a spec to port.

**Alternatives considered.** Fold the hero into the landing deltas of this
plan — rejected; it's a separate owner call with no dependency on the IA work.

**Trade-off.** None for the migration; it defers a landing-visual decision to
its own moment.

### B — Nav standardization + glossary

**Decision.** One nav template across all page types (search + avatar slot
everywhere, including interview pages); vestigial `catalog-search` id renamed
`problems-search`. Glossary pinned:

| Term | Meaning | Where |
|---|---|---|
| `cruxTag` | registry slug / join key | code + article JSON |
| "problem class" | display noun | public UI |
| `urlSlug` | page address | registry field (D1) |

No other new fields anywhere.

**Why.** The interview specimen shipped a *different* nav (no search, no
avatar) — template drift that would harden into inconsistency if not pinned
now. The glossary fixes the three-way vocabulary (data `cruxTag` vs public
"problem class" vs `urlSlug` address) so the spec and code can't quietly
diverge on what a "problem" is.

**Trade-off.** Trivial; a one-time standardization pass.

### C — Build order (settled, dependency-correct)

**Decision.**
1. Registries + `urlSlug` + derivations + **validators** (validators land
   before their content, inside this step and again inside 4 and 5)
2. **Atomic:** /catalog→/problems rename + redirects + `@id` migration +
   assertion update
3. Problem pages — starter state for all 14
4. Interview pages (`docs/spec-interview-pages.md` folded in, per D5)
5. Company pages + full-state essay for `ambiguous-failure-under-retry`
   (+ /companies index if OWNER rules v1)
6. Newsletter page

**Why this order.** Dependency-correct: derivations must exist before pages
consume them (1 before all); the rename must establish `/problems` before class
pages live under it (2 before 3); interview pages fold in before company pages
so the `questionsByArticle` reverse index and the company "asked about their
systems" strip share one build (4 before 5); newsletter is the leaf that
depends on the class pages existing (6 last). Validators land *before* their
content so the build gate exists when files arrive — the discipline the
figures/lists rounds used.

**Alternatives considered.** (a) Two parallel plans (interview separate from
the nav migration) — rejected; they edit the same eight files (nav, routes
table, indexers, `@id` assertion) and would collide. (b) Land the rename as a
drip migration across commits — rejected; the build assertion breaks mid-flight
unless `@id`s and anchors move together, so step 2 must be atomic.

**Trade-off.** One long sequenced plan rather than shippable parallel tracks;
coherence and no file-collisions bought at the cost of a longer critical path.

---

## OWNER-PENDING register

| # | Item | Blocks | Status |
|---|------|--------|--------|
| 1 | 14 urlSlug values (D1) + company-slug edge cases (D4, e.g. AWS) | — | **CLOSED 2026-08-16** — stamped in cruxtags.json + validator; `aws` override recorded in D4. #6/#9/#11 stamped as owner-vetoable defaults. |
| 2 | /companies index v1 vs v1.1 (D4) | step 5 scope only | **CLOSED 2026-08-16** — ship **v1**; roster derived from `articlesByCompany`, registry decorates only. Company registry ruled **OPTIONAL** (derived-only pages valid; Stripe/Figma carry entries by Phase 5). |
| 3 | Hero artifact on the landing (A) | nothing | separate track (parked) |

---

## Reconciliation log

- **v1.0 (2026-08-13)** — decision ledger consolidated to settled positions.
- **2026-08-14** — `spec-interview-pages.md` received and reconciled against
  repo truth. Verdict: consistent; incorporated by reference as the D5 step-4
  sub-spec (preserved at `docs/spec-interview-pages.md`). Three carry-forwards
  recorded in D5, plus one minor validator note (require `artifactCta` teaser).
- **v1.1 (2026-08-14)** — added rationale, alternatives-considered, and
  trade-off to every invariant and decision, plus "The design discussion,
  distilled" section capturing the ten review findings that shaped the
  decisions. Added a plain-language "In plain terms" worked example to each
  invariant and abstract decision (P0, D1–D6). No settled decision changed.
- **2026-08-16** — phase-by-phase implementation plan written against this doc:
  `docs/nav-ia-implementation-plan.md` (6 phases per Addition C, exact file
  touchpoints / validators / derivations / SEO per phase; no code).
- **2026-08-16** — owner review of the plan: **APPROVED**, Phases 2–6 cleared.
  Closures folded here and into the plan (v1.1): OWNER-PENDING #2 → v1 + registry
  optional; urlSlug vetoes #6/#9/#11 confirmed; `#5` slug verified
  (`outgrowing-one-cluster`, correct — non-database class members). Plan-side
  amendments: Phase-5b essay↔membership **drift seam** (derived "Also in this
  class" strip + build warning) and essay **provenance fields** (`edition`,
  `firstSentAt`) feeding Phase 6's editions list; Phase-4 question chip
  disambiguated **structurally** (not brand-gold).
- **2026-08-16** — OWNER-PENDING #1 CLOSED. All 14 `urlSlug` values ruled and
  stamped into `content/cruxtags.json`; `cruxtag-urlslug` validator added
  (present + kebab + unique; the 16th check). #5 flipped to
  `outgrowing-one-cluster` after verifying `google-colossus` is a storage, not
  database, member. D4 gained the company-slug enumeration (only `aws` needs an
  override; Google-Cloud merge not-applicable today). Publish-queue note: repo
  has `retry-amplified-overload`=1 and `observer-shares-fate`=3 vs the ledger's
  2 and 4 — confirming editorial rounds 34–37 are delivered-but-unpublished (a
  four-round queue). Derive-or-die makes each publish a free multi-page upgrade.
