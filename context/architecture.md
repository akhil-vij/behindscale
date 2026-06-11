# Architecture Context

behindscale is two cooperating sub-systems in one repository: a build-time
**pipeline** and a static **website**. They are separate system boundaries
with different responsibilities and different invariants. Keep them
decoupled — the website never imports pipeline code, and the pipeline never
imports website runtime code. They communicate only through generated files
committed to the repo (the "content contract").

## Stack

| Layer            | Technology                          | Role                                                        |
| ---------------- | ----------------------------------- | ----------------------------------------------------------- |
| Website build    | Vite + React + TypeScript           | Static site that renders generated summaries and artifacts  |
| Styling          | Tailwind CSS + CSS custom properties| Editorial reading shell; tokens defined in ui-context.md    |
| Routing          | React Router (`HashRouter`)         | Hash-based client-side routing; zero-config across static hosts |
| Artifact bundler | esbuild                             | Compiles each artifact `.jsx` to a standalone ESM bundle    |
| Artifact runtime | Sandboxed iframes                   | Each artifact rendered in isolation as a self-contained bundle |
| Pipeline         | Node.js + TypeScript                | RSS discovery, fetch/extract, Claude analysis & generation  |
| AI               | Anthropic SDK (Claude Sonnet)       | Article analysis + artifact generation                      |
| Pipeline storage | SQLite (better-sqlite3)             | Tracks processed articles, status, dedup                    |
| Content store    | Flat files (JSON + JSX/HTML) in repo| Source of truth for what the site renders                   |
| Hosting / CI     | Vercel                              | Auto-deploy on push to `main`; preview deploys per PR       |

## System Boundaries

> **Pipeline status: deferred from active implementation as of
> 2026-06-04.** behindscale is currently in manual editorial
> authoring mode (see `progress-tracker.md` → Current Operating
> Mode). The conceptual shape of the pipeline — its boundaries,
> stages, idempotency contract, and relationship to the content
> contract — is retained below as the architectural shape the
> website is designed against. The full design-as-built (four
> stages, SQLite schema, Claude integration, draft handoff,
> twelve open questions) is preserved at
> `context/pipeline-architecture-deferred.md`. Revisit when manual
> cadence shows scaling friction or at the week-8 reassessment.

- `pipeline/` — Owns article discovery, fetching, Claude API calls, and
  artifact generation. Produces content into `content/` and compiled
  artifact bundles into `public/artifacts/`. May do long-running work and
  network/API calls. Never rendered to users.
- `pipeline/run.ts` (the orchestrator) — The single entrypoint that fulfills
  the "run one command daily" goal. It chains the stages in order
  (discover → fetch → analyze → generate → publish), is safe to re-run
  (idempotent, per invariant 4), processes the day's 2–3 selected articles,
  and exits with a clear per-article success/failure summary. Exposed as the
  `study` npm script (e.g. `npm run study`). Individual stages remain
  independently runnable for debugging (e.g. `npm run study:discover`), but
  `run.ts` is the normal daily interface. The optional scheduler
  (cron/launchd/GitHub Actions) does nothing more than invoke this command —
  scheduling is decoupled from orchestration.
- `content/` — The content contract between pipeline and website. Holds
  per-article summary JSON and the aggregated pattern library JSON. The
  website reads this; the pipeline writes it. Treated as generated data.
- `public/artifacts/` — Compiled, self-contained artifact bundles (one HTML
  bundle per article) that the website loads into iframes.
- `src/` — The website. Reads `content/`, renders the reading shell, and
  embeds artifacts via iframes. Pure presentation; no API calls at runtime.
- `.github/workflows/` — CI/CD. Builds and deploys the site; optionally runs
  the pipeline on a schedule.

## Storage Model

- **SQLite (pipeline only)**: operational metadata — which articles have
  been seen/processed, their status (pending → processing → done → failed),
  source feed, and timestamps. Enables dedup and idempotent re-runs.
- **Flat JSON files (`content/`)**: the durable, version-controlled record
  of all published content. This is what the site renders and what gets
  committed to git. Two subfolders:
  - `content/articles/{slug}.json` — one file per article (summary + source
    + pattern references).
  - `content/patterns/{slug}.json` — one file per pattern definition
    (authored, durable).
  - `content/patterns/index.json` — the aggregated pattern library,
    *derived* from the two folders above every pipeline run.
- **Compiled artifact bundles (`public/artifacts/`)**: large generated UI
  bundles, one per article, loaded on demand by the website.

Rationale: metadata that drives pipeline control flow lives in SQLite; the
published content lives as committed files so the site is fully static and
the history is auditable in git. Large generated UI is never inlined into
the main site bundle.

## Content Contract

The content contract is the set of JSON shapes the pipeline writes and the
website reads. Full TypeScript types live in `src/types/` and are the
single source of truth on both sides (the type-only cross-boundary import
permitted by invariant 3). Three documented entities: **Source**,
**Article**, and **Patterns** (references, definitions, and the
aggregated library).

### Source

Every per-article summary JSON in `content/articles/` must include a
`source` block that fully identifies its origin. This is what the website
renders as visible attribution and what enforces invariant #7
(official engineering blogs only) at the data level.

- `source.name` — the canonical, human-readable name of the engineering
  blog (e.g. "Uber Engineering", "Stripe Engineering", "Netflix Tech Blog").
  Stable across articles from the same blog so cards group correctly.
- `source.slug` — a stable, normalized identifier (e.g. `uber-engineering`)
  used for filtering, color/logo lookup, and grouping.
- `source.company` — the company that runs the blog (e.g. "Uber"). Often
  matches the brand the reader recognizes.
- `source.url` — the homepage of the official engineering blog (not the
  article URL — that's `article.url`). Used for "View all from this blog"
  links and as a credibility cue.
- `source.feed` — the RSS feed the article was discovered through. Useful
  for debugging and as a back-reference into `content/feeds.json`.

Every entry in `content/feeds.json` (the allowlist from invariant #7)
defines these fields once. The pipeline copies them onto each article it
publishes — articles do not invent or override source data, they inherit it
from the allowlist. This guarantees: if it isn't in the allowlist, it can't
appear with a `source` block, and articles without a valid `source` block
fail schema validation and are not published.

### Article

Every per-article summary JSON in `content/articles/` conforms to the
`Article` shape. Fields:

- `slug` — required string. Stable, lowercase-kebab-case identifier; used
  for routing (`/articles/:slug`), file naming, SQLite identity (invariant
  4), and pattern back-links.
- `title` — required string. The article's display title.
- `url` — required string. Canonical URL of the original article on the
  source engineering blog. Distinct from `source.url`, which is the blog's
  homepage.
- `publishedAt` — required ISO 8601 date string. When the original post
  was published on the source blog.
- `addedAt` — required ISO 8601 date string. When this article first
  appeared on behindscale's production deploy (distinct from
  `publishedAt`, which is the source post's date). Used for sitemap
  `lastmod`, JSON-LD `datePublished` and `dateModified`, and any future
  recently-added surface. Leave room for an `updatedAt` field on the day
  an article is materially revised post-publish; until then, JSON-LD
  `dateModified` mirrors `addedAt`. Added as a schema chore ahead of
  Unit 9 (the SSG / SEO foundation); backfilled on the five Phase-5
  and 5f articles from their prod-verify dates.
- `source` — required `Source` block, as documented above.
- `summary` — required string. Short summary surfaced on article cards
  and used as the page lead on the article page.
- `problem` — required string. What the team was solving — the
  motivating problem the original post describes. Plain
  paragraph-separated text (paragraphs split on blank lines); markdown
  rendering is deferred until the first real Claude output lands
  (Unit 7+), at which point we adopt a renderer (likely `react-markdown`)
  and these fields gain lists/code/links. Until then, treat as plain
  prose.
- `solution` — required string. How they solved it — the architectural
  approach the post takes. Same paragraph-separated-plain-text contract
  as `problem`.
- `tradeoffs` — required string array. The costs, constraints, and
  limitations the solution introduces.
- `tags` — required string array. Free-form topical labels (e.g.
  `payments`, `retries`, `load-shedding`). **Distinct from `patterns[]`**:
  tags are loose topical wayfinding; patterns are the canonical,
  library-tracked abstractions with their own detail pages. Do not collapse
  the two — ui-context.md treats them as visually distinct components.
- `patterns` — required `PatternReference[]`. Documented in the Patterns
  section below. 2–6 entries is the expected range; the type does not
  enforce that, since semantic constraints are validated at the pipeline
  analyze stage and at build-time, not by the type system.
- `relatedArticles` — optional string array of article slugs. Powers
  "see also" links between articles. Plain slugs only; annotated
  relationships live on pattern references, not on related-article links.
- `generatedAt` — optional ISO 8601 timestamp. When the pipeline analyzed
  this article (distinct from `publishedAt`, which is the original post's
  date). Useful for "studied on X" UI affordances and for debugging
  re-runs.
- `artifact` — required. Either `{ path: string }` — the relative path the
  website loads into the iframe, e.g. `/artifacts/{slug}/index.html` — or
  `null` when this article has no interactive artifact (summary-only
  articles). **Missing artifacts are encoded as data (`null`), never
  inferred from a filesystem 404.** This makes the iframe loader's
  "skip + flag on bad entry" path (invariant 6) deterministic, and it
  leaves room for summary-only articles without a special case.
  Discriminated union shape (`{ path } | null`) is used in preference to
  `{ path, hasArtifact }` so the impossible state
  `{ path: "/x", hasArtifact: false }` is unrepresentable.

### Patterns

Patterns are a **first-class entity**, not a derived afterthought. behindscale
exposes two equally first-class navigation axes (articles and patterns), so
the content contract treats both with equal rigor.

There are two distinct data shapes for patterns:

**1. Pattern references on an article** (in `content/articles/{slug}.json`).
Each article lists 2–6 canonical pattern slugs it embodies, plus a short
per-article note describing how *this* article applies the pattern. The slugs
are the join key — they must match an entry in the pattern library exactly.

- `patterns[].slug` — canonical pattern identifier (e.g. `atomic-phases`).
- `patterns[].note` — 1–2 sentence note on how this article specifically
  embodies the pattern. Lets the pattern detail page surface differentiated
  examples instead of repeating the same definition.

**2. Pattern definitions** (in `content/patterns/{slug}.json`, one file per
pattern). These are the authored, durable definitions surfaced on each
pattern's detail page.

- `slug` — canonical identifier.
- `name` — human-readable pattern name (e.g. "Atomic Phases").
- `definition` — a hand-authored or hand-reviewed multi-paragraph
  description: what the pattern is, how it works, when to use it. Plain
  paragraph-separated text (same rendering contract as `Article.problem`
  / `Article.solution`); markdown rendering deferred to Unit 7+.
- `whenItApplies` — short bullet list of situations where this pattern is
  the right tool.
- `tradeoffs` — short bullet list of the costs and constraints the pattern
  introduces (e.g. "requires an ACID-compliant store").
- `category` — optional flat grouping tag drawn from the **canonical
  category set** documented below. Flat only; no deep taxonomy.

#### Canonical pattern categories

The set is intentionally small and additive. Each category gets a
dedicated color from the `--cat-*` ramp in `src/index.css`, wired into
`CATEGORY_CLASSES` in `src/components/PatternChip.tsx`. A pattern may
omit `category` entirely — that's the uncategorized neutral chip
variant.

| Slug            | Color                |
| --------------- | -------------------- |
| `resilience`    | `--cat-blue`         |
| `consistency`   | `--cat-purple`       |
| `throughput`    | `--cat-green`        |
| `observability` | `--cat-cyan`         |

The remaining ramp tokens (`--cat-orange`, `--cat-red`, `--cat-amber`)
are reserved headroom — unassigned until a future pattern needs one.

**Adding a new category is a deliberate, two-step change:**

1. Update this table (and the rationale paragraph, if the new category
   needs one) in a `docs:` commit. New category gets a color from the
   reserved ramp.
2. Then a `feat:` commit wires the slug into `CATEGORY_CLASSES` in
   `PatternChip.tsx` and (when pattern-library category filtering
   exists) wherever the filter lists categories.

The docs-first ordering prevents pattern definitions from being
authored with a category slug the website doesn't know how to color.
Patterns whose definitions don't fit any current category should
either be authored without a category (uncategorized chip) or trigger
the two-step addition above — never silently use a new slug.

**3. Aggregated pattern library** (in `content/patterns/index.json`).
This is *derived data*, regenerated from scratch every pipeline run by
walking `content/articles/` and matching pattern slugs to pattern
definitions. Hand-editing this file is never allowed.

- For each pattern: its definition, frequency count, the list of articles
  embodying it (with source attribution), and the set of source companies
  it has been seen in.

**Bidirectional integrity is enforced at build time.** The website build
validates that:
- Every `patterns[].slug` referenced by an article has a matching pattern
  definition file (no orphan references on articles).
- Every pattern definition with zero matching articles is flagged but does
  not fail the build (a pattern can exist before its first article — useful
  for seeding the library with known patterns).
- Pattern slugs are unique and normalized (lowercase, kebab-case).

Pattern definitions are authored by the owner (or by Claude with owner
review), never auto-generated from a single article. The synthesis across
articles is where the learning compounds, and that synthesis requires
deliberate curation. The pipeline analysis stage may *propose* new pattern
slugs when it sees something recurring across articles, but those proposals
land in `progress-tracker.md` as open items, not as auto-merged
definitions.

## Proposed Pattern Queue

The pipeline's analyze stage (Unit 7+) may identify candidate patterns
in an article that aren't yet defined in `content/patterns/`. Pattern
definitions are authored, not auto-generated (see Architecture
Decisions in `progress-tracker.md`), but the analyze stage shouldn't
silently drop emerging patterns either — the synthesis across articles
is where the library's value compounds. The Proposed Pattern Queue is
the mechanism that surfaces candidates for human curation without
compromising the authored-definitions rule.

**Mechanism.** When the analyze stage emits an article's candidate
`patterns[]` list, it splits each reference by whether the slug has a
matching definition in `content/patterns/`:

- *Grounded references* (slug has a definition) stay on the article
  and are written into the article's published JSON.
- *Proposed references* (slug has no definition) are stripped from the
  article's published JSON and appended to
  `pipeline/proposed-patterns.json` — a human-review queue listing the
  candidate slug, the source article, and the analyze stage's
  rationale.

The validator (Unit 4) only ever sees articles with fully grounded
references; this preserves invariant 8 at the data level without
requiring the analyze stage to be perfect.

**Three publish states.** Stripping proposed references can drop an
article below invariant 8's minimum-2 rule. The analyze stage routes
each article into one of three states:

- *Published* — ≥2 grounded references after stripping. The article's
  JSON is written to `content/articles/` and the validator passes.
  Proposed slugs (if any) still log to the queue for later authoring.
- *Blocked* — fewer than 2 grounded references after stripping. The
  article's JSON is **not** written to `content/articles/` (which
  would fail the validator). Instead, the full analyzed article and
  its proposed slugs land in `pipeline/blocked-articles.json`,
  awaiting human action: author the missing definitions to unblock,
  or reject.
- *Rejected* — manually removed from `blocked-articles.json` when the
  owner decides the article isn't worth pursuing. No persistent state
  required — the absence from both queues is the rejection.

The principle: **the validator enforces shape integrity; the analyze
stage makes authoring decisions.** Splitting the concerns this way
lets the validator stay simple and content-focused, and lets the
analyze stage stay editorial without poisoning the content contract.

**Storage.** Both `pipeline/proposed-patterns.json` and
`pipeline/blocked-articles.json` are pipeline operational state, not
website-readable content. They live under `pipeline/` and never enter
`content/`. (Compare with `content/feeds.json`, which both pipeline
and website read — moved from `pipeline/feeds.json` in Unit 6 to
resolve its boundary cleanly. The queue files have no such tension:
only the pipeline reads them.)

## Auth and Access Model

- No authentication. The site is fully public and read-only.
- There is no per-user state and no mutation surface on the website.
- Write access is implicit: whoever can push to the repo (the owner, or CI)
  can publish content. There is no runtime write path.

## Invariants

1. The website performs no network calls or dynamic data fetching at request
   time. It renders only pre-generated files from `content/` and
   `public/artifacts/`. (Static-by-construction.)
2. **Artifact fault isolation and containment.** Each interactive
   artifact renders in its own sandboxed iframe. A single malformed or
   failing artifact must never break the site build or affect any
   other artifact (fault isolation). This holds at **compile time**
   (per-artifact esbuild failures log to stderr and skip; the missing
   bundle does not fail the build) and at **runtime** (iframe load
   errors and inside-iframe render exceptions both surface as a single
   muted error state in the artifact's slot — the rest of the page
   reads normally; the home and pattern routes are unaffected).

   The iframe `sandbox` attribute is exactly `allow-scripts` — JS
   execution and nothing else. Same-origin, form submission, top-level
   navigation, popups, pointer lock, storage access (cookies,
   localStorage, sessionStorage), plugin embeds, and downloads are all
   denied by the absence of the corresponding `allow-*` flags.
   Artifacts cannot read parent state, navigate the parent, or persist
   data.

   **Principle: never loosen sandbox, widen postMessage instead.**
   Future "this artifact wants to do X" needs are granted through a
   `postMessage` protocol between artifact and parent (artifact emits
   a request, parent decides whether to honor it) — never by adding
   sandbox flags. The sandbox is the floor; postMessage is the door.
3. The pipeline and the website never import each other's **runtime code**.
   They communicate only through the generated files in `content/` and
   `public/artifacts/` (the content contract). Exception: shared schema
   type definitions live in `src/types/` and may be imported by both sides
   as *type-only* imports (`import type { ... }`). Types have no runtime
   existence after compilation, so this does not couple the systems at
   runtime; it only ensures both sides agree on the shape of the content
   contract. Any non-type-only import across the boundary is a violation.
4. The pipeline is idempotent: running it repeatedly (same day, same inputs)
   never produces duplicate articles or corrupts existing content. Article
   identity is a stable slug tracked in SQLite.
5. Long-running work and external API calls happen only in the pipeline,
   never in website code.
6. `content/` JSON conforms to the documented summary and pattern-library
   schemas. The website may assume the schema and should fail gracefully
   (skip + flag) on a nonconforming entry rather than crashing.
7. **Official engineering blogs only.** Every article in the library must
   originate from the official engineering blog of the company that built
   the system being described. The pipeline maintains an explicit source
   allowlist (`content/feeds.json`) of approved official feeds; any article
   whose canonical URL does not match an allowlisted source is rejected at
   discovery, regardless of how it was discovered (RSS, manual URL, etc.).
   Personal blogs, Substacks, third-party summaries, conference recaps, and
   aggregators are never published, even when they cover the same material.
8. **Bidirectional pattern integrity + minimum coverage.** Articles and
   patterns are joined by canonical pattern slugs. Two rules govern the
   relationship; both fail the build when violated:
   - **Orphan references.** Every `patterns[].slug` referenced by an
     article must have a matching pattern definition file in
     `content/patterns/`.
   - **Minimum coverage.** Every article must reference **at least 2
     patterns**. Articles below the threshold do not belong in the
     library.

   Pattern slugs are unique and normalized (lowercase, kebab-case).
   Patterns with zero matching articles are permitted (a pattern can be
   seeded before its first article) and surfaced as such in the pattern
   library, but never silently dropped.

   *Rationale for the minimum-2 rule:* behindscale's mission is to
   surface transferable patterns across companies. An article that
   embodies only one pattern is a single-pattern case study — fine
   reading on its own, but it doesn't compound, and the library's value
   is the cross-article synthesis. The minimum forces either deeper
   analysis (most engineering articles really do embody multiple
   patterns once you look) or honest exclusion (the article doesn't fit
   the library's purpose). Enforced by the build-time validator
   (Unit 4); produced by the analyze stage's Proposed Pattern Queue
   mechanism (see section above).