# Architecture Context

behindscale is a static website built from hand-authored content. One
repository holds four areas with different jobs: `content/` (the
hand-authored source of truth), `scripts/` (build-time tooling),
`src/` (the website), and `public/artifacts/` + `public/figures/`
(compiled output). The website does no runtime fetching of content;
everything it renders is in the served HTML or the bundle at build
time. See System Boundaries for the rules between the areas.

The build-time Claude pipeline this file was first written around is
**deferred and was never built**; its design lives in
`context/pipeline-architecture-deferred.md`.

## Stack

| Layer            | Technology                                   | Role                                                          |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Website          | Vite + React + TypeScript                    | Static site, prerendered per route, hydrated in the browser   |
| Styling          | Tailwind CSS + CSS custom properties         | Tokens defined in `src/index.css`, specified in ui-context.md |
| Routing          | React Router (`BrowserRouter` / `StaticRouter`) | One route tree (`src/AppRoutes.tsx`) for client and prerender |
| Prerender        | `react-dom/server` + `scripts/prerender.ts`  | One HTML file per route at build time                         |
| Artifact bundler | esbuild (`scripts/compile-artifacts.ts`)     | Each artifact `.jsx` to a standalone ESM bundle with its own React |
| Artifact runtime | Sandboxed iframes                            | Each artifact rendered in isolation                           |
| Build tooling    | Node + `tsx` scripts in `scripts/`           | Validation, compile, prerender, sitemap, feed, output checks  |
| Content store    | Flat files in the repo (JSON, JSX, SVG)      | Source of truth for what the site renders                     |
| Fonts            | `@fontsource` packages                       | Self-hosted, bundled by Vite                                  |
| Analytics        | `@vercel/analytics`                          | Client-only pageviews and artifact events                     |
| Tests            | Vitest, Playwright                           | Unit and check suites; e2e against a production build         |
| Hosting          | Vercel                                       | Deploys `main`; preview deploy per PR                         |
| CI               | GitHub Actions (`.github/workflows/ci.yml`)  | Validate, Vitest, Playwright on every push and PR             |

Versions are in `package.json`. **Build chain** (`npm run build`, in
order): `validate-content.ts` (schema + the checks in
`scripts/checks/`) → `compile-artifacts.ts` → `copy-figures.ts` →
`tsc -b` → `vite build` → `vite build --ssr src/ssr-entry.tsx` →
`prerender.ts` → `generate-sitemap.ts` → `generate-feed.ts` →
`check-share-images.ts`. A validation error stops the build before
anything is emitted.

## Rendering

behindscale renders to **per-route static HTML at build time**. The
build emits one HTML file per known route (the landing page,
`/problems`, every `/problems/<urlSlug>`, every article, `/patterns`,
every pattern, `/sources`, the 404) with content, head tags,
OpenGraph + Twitter card tags, canonical tags and JSON-LD baked into
the served HTML. Crawlers, link-preview unfurlers, screen readers and
any non-JavaScript reader receive the full page on first byte.

**Mechanism.** `vite build` emits the client bundle and
`dist/index.html`; the SSR build of `src/ssr-entry.tsx` emits
`dist-ssr/`, which also re-exports the content from `src/content`
(`import.meta.glob` resolves only under Vite, not `tsx`).
`scripts/prerender.ts` uses `dist/index.html` as the template,
renders each route with `renderToString` + `StaticRouter`, splices in
the per-route head tags and body, and writes one file per route. Head
tags and JSON-LD are string interpolation; no head-management library.
Its route table mirrors `src/AppRoutes.tsx`: the static routes plus
one entry per article, per pattern, and per cruxTag with at least one
article (a class without a `urlSlug` is skipped with a warning, never
emitted as a dead route). In the browser the same tree hydrates
(`hydrateRoot` + `BrowserRouter`, `src/main.tsx`).

**Defensive properties of the prerender script (locked):**

1. Every template replacement (`safeReplace`) asserts the needle
   exists and the output changed, and throws otherwise: a drifted
   template must never ship empty pages.
2. JSON-LD escapes `<` to `\u003c` after `JSON.stringify`, so content
   containing `</script>` can't close the tag (still valid JSON).
3. The attribute-context escape covers `&`, `<`, `>`, `"`, `'`.
4. Every JSON-LD `@id` an article references (cruxTag `about`,
   pattern `mentions`) must resolve to an emitted `DefinedTerm`, or
   the build fails.

**Hydration model.** The prerendered `/problems` is the full,
unfiltered, grouped list. The company filter (`?source=<slug>`) and
search (`?q=`) are read in a `useEffect` after mount, so the hydrated
DOM matches the server DOM; one `dist/problems.html` serves every
query string. The same holds for every client-only value (a stored
wall record, a frame height from a size message): it applies after
mount, never on first render. `CatalogRedirect` rewrites legacy
`/?source=` arrivals to `/problems?source=`.

**Company canonicalization.** The company filter and every "SEEN AT"
row key off `source.company`, never `source.name`, derived from
realized articles: "Amazon Builders' Library" / "Amazon (AWS)" is one
chip.

**Landing hero.** The hero embeds the Priority-Aware Load Shedding
pattern artifact (`HERO_IFRAME_PATH`, `src/pages/Landing.tsx`): one
bundle, two mounts. It uses a raw sandboxed iframe, not
`ArtifactEmbed`, sized from the artifact's `artifact:size` message,
inside its own ErrorBoundary. Old `/artifacts/_hero` paths 301 to it
(`vercel.json`). A `_`-prefixed artifact source is still the
convention for a site artifact no content host owns
(`orphan-artifacts` exempts it).

**JSON-LD.** Built per page type in `scripts/prerender.ts`
(`landingMeta`, `problemsMeta`, `problemMeta`, `articleMeta`,
`patternsIndexMeta`, `patternMeta`, `sourcesMeta`). Rules that hold:

- Article pages carry a `TechArticle` and a `BreadcrumbList` (home →
  Problems → the class → the article). The `TechArticle` describes
  behindscale's dissection, not the source post: `author`,
  `publisher` and `mainEntityOfPage` are behindscale; `isBasedOn`
  (an `Article` with `url`, `datePublished` = `publishedAt`, and
  `publisher` = `source.name` / `source.url`) and `citation` attribute
  the original. **`isBasedOn` deliberately omits `name`**: our title
  is editorial and may differ from the source's, and asserting the
  source published under our title would be misattribution.
- `datePublished` = `addedAt`; `dateModified` = `updatedAt ?? addedAt`
  (the same fallback the sitemap uses). `abstract` = `crux`.
- `image` is the first figure's SVG URL when the article has figures,
  else the default share image.
- `about` points at the cruxTag term `/problems#term-<cruxTag>`;
  `mentions` at each pattern term `/patterns#term-<slug>`. `/problems`
  and `/patterns` emit the matching `DefinedTermSet`s.

**Deploy.** Vercel serves the per-route files directly. `vercel.json`
pins `cleanUrls: true` and `trailingSlash: false` (`/articles/foo`
serves `dist/articles/foo.html`; `/articles/foo/` 308s) and holds the
permanent redirects (`/catalog` → `/problems`, old `_hero` paths,
renamed patterns). Unknown paths get the prerendered `dist/404.html`
with a 404 status.

**Sitemap + robots** (`scripts/generate-sitemap.ts`): every
prerendered route except `/404`. Article `lastmod` = `updatedAt ??
addedAt`; pattern `lastmod` = the newest of those among its articles;
`/problems` and `/sources` carry none, since a fabricated `lastmod`
would lie to crawlers.

**Share image.** Every page's `og:image` / `twitter:image` is the
absolute `https://www.behindscale.com/og-default.png?v=<hash>`
(committed in `public/`, drawn by `scripts/make-og-image.ts`, hashed
by `scripts/share-image.ts` so caches refetch on change), with
`twitter:card` = `summary_large_image`. `check-share-images.ts` fails
the build if any page in `dist/` names a missing share image.

**Standalone artifact pages.** Each bundle's `index.html` shell
(`compile-artifacts.ts`) is also the shareable "Open in full" page at
`/artifacts/<slug>`, with its own head ("<name> · behindscale", the
teaser, a canonical, the share tags) and a bar back to the site: the
wordmark home and "Read the full breakdown" to the owning article,
pattern or problem page (`scripts/artifact-pages.ts`; no owner or
several means no link). The bar ships `hidden` and shows only when
`window.self === window.top`, never inside an embed. The script `src`
is slug-absolute (`/artifacts/<slug>/index.js`) because `cleanUrls`
redirects `.../index.html` to `/artifacts/<slug>`, where `./index.js`
would resolve to `/artifacts/index.js`.

**Feed** (`scripts/generate-feed.ts` → `dist/rss.xml`, Atom): the
article breakdowns plus, as separate entries, the walls that carry a
comparison. `<updated>` is the last real change to the page's source
files in git (`scripts/content-dates.ts` skips formatting-only commits
and `.git-blame-ignore-revs`). The build never dates from a shallow
clone: it deepens it first (from the repo Vercel's `VERCEL_GIT_*`
variables name, else `origin`) or fails. A build-time fetch from our
own public repo; the site fetches nothing at runtime.

**Page titles.** No long dashes in titles, meta descriptions or the
feed. A colon splits a title; " · behindscale" ends every title but
the homepage's; pattern pages read "<name> · patterns · behindscale";
`og:title` / `twitter:title` repeat `<title>`. Checked by
`tests/e2e/share-tags.spec.ts`, whose `KNOWN_CONTENT_DASHES` lists the
content descriptions still carrying one (it may only shrink).

**Legacy `#/...` URLs.** An inline `<script>` at the top of
`index.html`'s `<head>` `location.replace`s a `#/` hash to the
canonical path before React mounts.

## Article Reading Arc

**Section order on every article page** (`src/pages/ArticleDetail.tsx`):

```
header (title + source attribution) → pattern chips (wayfinding)
→ summary → THE CRUX (+ cruxTag chip) → artifact teaser
→ Problem (+ stats) → Solution (+ stats) → [ARTIFACT EMBED, #artifact]
→ Tradeoffs (+ stats) → Patterns in this article (with notes)
→ Also solving this
```

The arc is **understand-problem → understand-solution → interact →
read tradeoffs with hands-on intuition**. Tradeoffs land harder after
the reader has toggled a failure mode themselves; the full patterns
section stays late as the zoom-out beat. The top chips serve the
is-this-worth-my-time scan; the bottom section carries the
per-article notes.

**THE CRUX callout** renders `article.crux` right after the summary,
because the crux is the is-this-my-problem scan and belongs before
the reader commits to Problem. Its cruxTag chip links to the class
page `/problems/<urlSlug>` (falling back to `/problems#term-<cruxTag>`
if no urlSlug resolves). An article artifact's context-block PROBLEM
line compresses the same crux, so the reading arc and the
artifact-first arc stay in sync.

**Width discontinuity is by design.** Prose renders at 720px; the
artifact breakout at 960px. Recorded so the judgment isn't re-debated
when someone proposes containing the artifact at 720px. Mobile is
single-column at both widths.

**Artifact teaser card** (only when `artifact.teaser` is present): a
dark card on the artifact tokens with an `INTERACTIVE` label, the
teaser, and a link to `#artifact`. **Specificity principle**: no
generic fallback copy; a vague teaser is worse than none.

**Stat callouts** (only when `stats` is present) render after the
section named by `stat.placement`. **Figures** render where a
`{{figure:<slug>}}` marker sits in Problem or Solution. **Also solving
this** lists the other articles sharing the cruxTag and is omitted
when there are none.

**Instrumentation.** `@vercel/analytics` is mounted client-only in
`src/main.tsx`, never during prerender.

- `artifact_viewed` fires once when the embed is half in view
  (`IntersectionObserver` in `ArtifactEmbed`). Payload `{ slug }`.
- `artifact_interacted` fires once on the first pointerdown inside
  the iframe. **Cross-origin by design**: the sandboxed frame has an
  opaque origin, so the parent can't read `contentDocument`. The entry
  stub `compile-artifacts.ts` wraps around every bundle posts
  `{ type: 'artifact:interacted', slug }` to `window.parent` with
  target origin `'*'` (nothing can be pinned at compile time), and
  `ArtifactEmbed` accepts it only when `event.source ===
  iframeRef.current?.contentWindow`. **Source comparison, not origin
  comparison**: a sandboxed frame's `event.origin` is `"null"`.

The funnel is pageview → `artifact_viewed` → `artifact_interacted`.

## Problem Pages and Walls

`/problems` groups every article by cruxTag (count descending, then
alphabetical; `src/lib/catalogGroups.ts`). Each class with articles
gets a page at `/problems/<urlSlug>` (`src/pages/ProblemDetail.tsx`),
where `urlSlug` comes from the cruxTag registry and
`cruxTagByUrlSlug` in `src/content/index.ts` maps it back.

**One template, progressive authoring.** Every class renders through
the same page. Unauthored, it is fully derived: the registry
definition as "The wall", a "Same wall, N systems" table, the members'
patterns as chips, a card per member. An optional essay at
`content/problems/<cruxTag>.json` (`ProblemEssay`,
`src/types/problemEssay.ts`, the authority on its fields) replaces
those placeholders block by block. Each block renders only when
present, and the shell hard-codes none of a wall's mechanics. Keyed by
the frozen cruxTag, so a urlSlug rename never orphans it; the
`problem-essay` check requires filename = cruxTag, one essay per
class, and every article, pattern, question and anchor it names to
resolve. Pattern chips and cards stay derived even when authored (the
essay adds intro, order and teasers). `extraSections` is validated
but not yet rendered.

**Inline diagrams.** The comparison's SVGs live at
`content/problems/<cruxTag>/<name>.svg` and are inlined into the page
(not `<img>`-loaded like figures) so they share the page's diagram
classes and tokens; the YOU row's filled SVG carries `{{slot}}`
placeholders the host fills. Because this markup enters the page DOM,
the `problem-essay` check runs the `figure-svg-safe` allowlist over
every referenced file before it can ship.

**Walls and the wall registry.** A wall is a class with a playable
mission. Its data lives in the essay; its one piece of code lives in
`src/walls/<name>.ts`, registered in `src/walls/index.ts`
(`wallBySlug`, keyed by cruxTag). A `WallModule` exports
`youMapping(decisions, held)`, returning strings keyed by
`comparison.matrixRows[].id` (the YOU cells) and by the YOU diagram's
`{{slot}}` names, plus `attackCount` (the length of `held`). The
`problem-essay` check stops content and code drifting: every matrix
row id and slot must be a `youMapping` key, the interview needs one
follow-up per attack, and a comparison with no wall module warns.

**The two artifacts.** `tryIt.artifactSlug` (cause the failure) and
`mission.artifactSlug` (build it) each name their own artifact in the
flat namespace (`content/artifacts/<artifactSlug>.jsx`; a mission may
import a sibling `.js` rules module). Both mount through
`ArtifactEmbed` in `bare` mode (wrapper ids `artifact` and `artB`)
with a `<noscript>` fallback (the teaser; for the mission, its static
outline). On `/problems` a class with a mission gets a Playable badge,
its teaser and an estimate (the `minutes` of stations flagged
`estimate`, summed and rounded up to 5; `src/lib/wallEstimate.ts`).

**Host protocol (v1)**, `src/pages/problem/useWallHost.ts`. Every
message is `{ v: 1, wall: <cruxTag>, type, ... }`; `ArtifactEmbed`
passes only its own frame's messages and the hook drops any other `v`
or `wall`. Mission → host:

- `ready` → the host replies `init` `{ commit, decisions, survived,
  held }` (the saved design, only if it survived): the only host →
  mission message.
- `state` `{ decisions, held, survived, bill }`: when survived, fill
  the YOU cells, slots and interview ticks from `youMapping()` and
  save the design; not survived after a fill empties them.
- `checkpoint` `{ kind: caused | survived | held }`: write-once flags.
- `touched`: first deck interaction (reveals the "↑ your decisions"
  jump).
- `reset`: clear the saved design; keep the commit and checkpoints.
- `commit` `{ text }`: the reader's sentence, shown under the YOU row.
- `size` `{ h }`: content height, clamped to 320–20000px.
- `anchor` `{ id }`: scroll the page to `#id`, opening a `<details>`;
  `anchor` `{ frame }`: scroll to a region of the frame, ignored
  while the frame is its own scroller.

Try-it → host: `size` only. At 700px and wider the mission frame is a
bounded scrollport, `min(content, 100dvh - 56px)`; narrower, it is
content-height and the page scrolls.

**Persistence.** One record per wall in
`localStorage['bs:wall:<cruxTag>']`, `{ v: 1, commit, checkpoints,
saved }`, every access in try/catch. Nothing leaves the browser.

## System Boundaries

> **Pipeline status: deferred, never built.** The planned build-time
> pipeline (`pipeline/`: RSS discovery, fetch and extract, Claude
> analysis and artifact generation, SQLite state, `npm run study`)
> does not exist. There is no `pipeline/` directory, no SQLite, no
> Claude API call and no `pipeline/prompts/`. The full design is in
> `context/pipeline-architecture-deferred.md`; revisit when manual
> cadence shows scaling friction.

**How content is made today.** By hand. The owner drafts dissections
with Claude in chat; Claude Code commits them, builds and verifies; a
design agent supplies SVG drawings; task briefs arrive under
`handoff/`.

- `content/` (+ `keywords/`) — the hand-authored source of truth;
  everything the site renders (Storage Model).
- `scripts/` — build-time tooling run by `npm run build`
  (`make-og-image.ts` runs by hand). Reads `content/` from disk and the
  SSR bundle in `dist-ssr/`; writes `public/artifacts/`,
  `public/figures/` and `dist/`. Import rules: invariant 3.
- `src/` — the website. Reads content only through
  `src/content/index.ts`, renders the reading shell, embeds artifacts.
- `public/artifacts/`, `public/figures/` — build output, gitignored.
- `tests/` — Vitest (`tests/unit/`, co-located `__tests__/`) and
  Playwright (`tests/e2e/`). CI (`.github/workflows/ci.yml`) runs
  validate, Vitest and Playwright on every push and PR; deploys are
  Vercel's.
- `docs/` — design and editorial specs. `handoff/` — task briefs.

## Storage Model

**Flat files in git are the only store.** There is no database.

- `content/articles/<slug>.json` — one `Article` per file.
- `content/patterns/<slug>.json` — one `PatternDefinition` per file.
- `content/cruxtags.json` — the cruxTag registry.
- `content/problems/<cruxTag>.json` — optional `ProblemEssay` per
  class; `content/problems/<cruxTag>/*.svg` — its inline diagrams.
- `content/artifacts/<host-slug>.jsx` — artifact sources, one flat
  namespace across articles, patterns and problem pages.
- `content/figures/<host-slug>/<figure-slug>.svg` — figure SVGs for
  articles, patterns and problem essays.
- `content/feeds.json` — the official-blog allowlist (`Source[]`),
  rendered on `/sources`.
- `keywords/{articles,patterns,walls}.json` — the search-terms
  overlay, merged at build time into `Article.keywords`,
  `PatternDefinition.aliases` and `CruxTagEntry.keywords` by
  `src/content/index.ts` (`keywords/README.md`).

**Derived at build time, never stored.** The aggregated pattern
library (per-pattern frequency, member articles, companies,
co-occurrences, problem classes) is computed in memory from
`article.patterns[]` by `src/content/index.ts` (`patternStats`,
`patternDetail`). There is no `content/patterns/index.json`; the name
stays reserved and both loaders exclude it (the glob negation in
`src/content/index.ts`, `isPatternDefinitionFile` in
`scripts/load-content.ts`). Problem-class grouping is
`src/lib/catalogGroups.ts`.

**Build output (gitignored):** `public/artifacts/<slug>/` (`index.html`
+ `index.js`), `public/figures/`, `dist/`, `dist-ssr/`.

**Per-browser state:** the wall record in `localStorage` (Problem
Pages and Walls). Nothing else.

Rationale: committed files keep the site fully static and its history
auditable in git. Large artifact UI is never inlined into the main
site bundle; each bundle loads on demand in its iframe.

## Content Contract

The content contract is the set of JSON shapes in `content/` that the
site renders. The TypeScript types in `src/types/` are authoritative;
`src/types/predicates.ts` checks every file at load
(`scripts/load-content.ts`), and the checks in `scripts/checks/`
(registered in `scripts/validate-content.ts`) enforce the cross-file
rules. This section records the rules the types can't express.

A check error fails the build. `CheckError.severity: 'warning'`
surfaces in the validator output without failing it; it is used where
authorial phrasing or hygiene is a judgment call (`crux-summary-length`,
`stats-value-in-prose` misses, the `figure-count-ceiling` soft band,
`orphan-artifacts`, and `problem-essay`'s missing-wall-module case).

### Source

Every article carries a `source` block (`Source`, all fields required
strings): the visible attribution and the data-level face of
invariant 7.

- `name` — the blog's canonical name ("Netflix Tech Blog"), stable
  across its articles.
- `slug` — a stable normalized identifier for filtering and grouping.
- `company` — the company that runs the blog; the canonical company
  identity on every browse surface.
- `url` — the blog's homepage (the post itself is `article.url`).
- `feed` — the blog's feed URL, a back-reference into
  `content/feeds.json`.

Each `content/feeds.json` entry defines these fields once, and an
article's `source` is meant to be copied from it verbatim: articles
inherit source data, they don't invent it. The `source-matches-feed`
check fails the build when an article's `source.slug` isn't in the
allowlist or any field differs from its entry.

### Article

Every `content/articles/<slug>.json` conforms to `Article`
(`src/types/article.ts`):

- `slug` — lowercase kebab-case and equal to the filename, by
  convention (unchecked); the route, the key for pattern back-links,
  and the artifact path.
- `title` — editorial display title (may differ from the source's).
- `url` — the original post on the source blog.
- `publishedAt` — the source post's date (YYYY-MM-DD).
- `addedAt` — when the article first reached behindscale production
  (YYYY-MM-DD).
- `updatedAt?` — the last *material* post-publish revision (a rewrite
  to source, a correction, a pattern reattribution); set only then.
  JSON-LD `dateModified` and sitemap `lastmod` fall back to `addedAt`.
- `source`; `summary` (card text and page lead); `crux`, `cruxTag`,
  `cruxSummary` (Bottleneck Taxonomy); `problem`, `solution` (Prose
  contract); `tradeoffs` (string array).
- `tags` — free-form topical terms, search data only, not rendered.
  **Distinct from `patterns[]`**, the canonical library-tracked
  abstractions with their own pages. Do not collapse the two.
- `patterns` — `PatternReference[]` (Patterns below).
- `keywords?` — search terms, delivered through
  `keywords/articles.json`, never hand-edited into the article.
- `relatedArticles?` — article slugs; schema-checked, not rendered
  ("Also solving this" derives from cruxTag). `generatedAt?` —
  pipeline-era; not rendered.
- `artifact` — required: `{ path: string; teaser?: string }`, or
  `null` for a summary-only article. **A missing artifact is encoded
  as data (`null`), never inferred from a filesystem 404**, and the
  union makes `{ path, hasArtifact: false }` unrepresentable. `path`
  must be `/artifacts/<slug>/index.html` (`artifact-path-matches-slug`),
  its source must exist (`artifact-bundle-exists`), and no two hosts
  may claim one slug (`artifact-slug-unique`). `teaser`, when present,
  is a non-empty line naming what the reader can *do*.
- `stats?` — `{ value, label, placement: 'problem' | 'solution' |
  'tradeoffs' }[]`. `stats-value-in-prose`: **at most 5** (error), and
  every `value` must already appear in the article's own prose
  (**warning**: a fuzzy miss usually means different phrasing, and
  the reviewer judges better than the matcher). A lift, not a source
  of new claims. Matching strips `+ % , < > ~ ≈`, whitespace and case;
  a `→` composite matches whole or by each half.
- `figures?` — Figures below.

**Prose contract** (`src/components/Prose.tsx`), shared by
`Article.problem` / `solution`, `PatternDefinition.definition`, and
problem-essay prose: paragraphs split on blank lines; a chunk whose
lines are all `- ` or `1. ` items renders as a list
(`list-block-well-formed` hard-errors on malformed shapes); a chunk
that is exactly `{{figure:<slug>}}` renders a figure. Inline:
`**bold**` (`bold-markers-balanced`), `[text](/internal/path)` as a
router link (internal only; `/patterns/<slug>` targets are checked by
`inline-link-targets`), `[text](#anchor)` as a same-page link. No
other markdown.

**Figures** (`Figure`: `slug`, `eyebrow`, `caption`, `ariaLabel`;
`docs/figures-design.md`) live at
`content/figures/<host-slug>/<slug>.svg`, mirrored to `/figures/` by
`copy-figures.ts`. Each is placed by exactly one marker, on its own
line, in the host's prose fields only (problem/solution, a pattern's
definition, an essay's intro and wall prose). They render as `<img>`
in a `<figure>`, never inline, so the browser's `<img>` sandbox is
their security perimeter and `figure-svg-safe` is hygiene on top.
Warn above 3 per host, error above 5. Rules live in the `figure-*`,
`orphan-figure-markers`, `unused-figure-defs` and
`marker-placement-legal` checks; `svg-no-c2pa` covers every SVG in
`content/`.

### Patterns

Patterns are a **first-class entity**: articles and patterns are two
equally first-class navigation axes.

**1. Pattern references on an article.** `patterns[]` of `{ slug,
note }`. The slug is the join key and must match a definition
(`orphan-pattern-slugs`); every article needs at least two
(`minimum-pattern-coverage`); no maximum is enforced. `note` is one or
two sentences on how *this* article embodies the pattern, so the
pattern page shows differentiated examples rather than repeating the
definition.

**2. Pattern definitions** (`content/patterns/<slug>.json`,
`PatternDefinition` in `src/types/pattern.ts`):

- `slug`, `name`; `definition` (Prose contract: what it is, how it
  works, when to use it); `whenItApplies`, `tradeoffs` (string arrays).
- `category` — optional in the type, **required** by `pattern-category`.
- `oneLineDefinition?` — the detail-page lede and meta description.
- `aliases?` — lowercase search terms bridging industry vocabulary to
  the house name; extended by `keywords/patterns.json`.
- `figures?` (markers in `definition`); `artifact?` (the
  `Article.artifact` contract; source at
  `content/artifacts/<pattern-slug>.jsx`); `mechanism?` (`{ caption?,
  blurb?, idea?, whatToTry? }`, the copy around the artifact).

Definitions are authored by the owner (or by Claude with owner
review), never generated from a single article: the synthesis across
articles is where the learning compounds. `/patterns/:slug` adds
derived sections (member breakdowns, co-occurring patterns, problem
classes) from `patternDetail` in `src/content/index.ts`.

**3. Aggregated pattern library.** Derived in memory, never stored
(Storage Model). The `PatternLibrary` types in `src/types/` describe a
stored form nothing writes or reads.

#### Canonical pattern categories

The set is `PATTERN_CATEGORIES` in `src/lib/patternCategories.ts`
(id, label, gloss, listing-dot and chip classes). `/patterns` groups by
it, `PatternChip.tsx` takes its colours from it, and `pattern-category`
fails the build on a missing or unknown category. Colours come from the
`--cat-*` ramp in `src/index.css`. **Adding a category is deliberate:**
one new entry, with a ramp colour and the mapping in
`src/lib/__tests__/patternCategories.test.ts`.
Since the check reads `PATTERN_CATEGORIES`, no pattern can ship a
category the site can't place; a definition that fits none triggers
that addition, never a silent new slug.

### Bottleneck Taxonomy (crux + cruxTag)

behindscale has **two taxonomy axes across articles**: patterns name
*solutions*, cruxTags name *problems*. Two companies converging on the
same solution is one signal; two companies hitting the same reusable
*bottleneck* is a distinct, equally load-bearing one. Editorial
framing: `docs/behindscale-taste.md` §3.5.

**Three fields, all required on every Article:**

- `crux` — two to four sentences of near-source prose naming the
  bottleneck: never the topic, never the solution. The THE CRUX
  callout; compressed into the PROBLEM line of the article artifact's
  context block.
- `cruxTag` — the lowercase-kebab-case slug of the bottleneck *class*
  (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- `cruxSummary` — one hand-authored line (~10–16 words) compressing
  the crux for browse surfaces (`/problems` cards, the landing
  preview, search results). Same source-faithful bar as `crux`:
  compresses it, never restates the title or the solution.

**Three design decisions that shape the axis:**

1. **Reuse across articles is the point, so uniqueness is
   deliberately NOT enforced.** A tag shared by two companies is the
   taxonomy demonstrating its thesis.
2. **The registry is minimal browse metadata, not a definition
   file.** `content/cruxtags.json` (`src/types/cruxtag.ts`) maps each
   cruxTag to `label` (the exact display form; never humanize the
   slug), `definition` (one company-neutral sentence naming the
   class), `urlSlug` (the page address; the cruxTag itself stays the
   frozen join key and anchor id, never displayed), and `keywords?`
   (search-only, from `keywords/walls.json`). A class's long-form
   content lives in its problem essay.
3. **The grouping is load-bearing navigation.** A mis-assigned cruxTag
   mis-files an article on the main browse surface, which raises the
   bar on tag hygiene.

**Validator (locked):**

- Missing or empty `crux` or `cruxSummary`, or a `cruxTag` that is
  missing or fails the kebab-case pattern: schema **error**
  (`checkArticle`).
- `cruxSummary` above 20 words: **warning** (`crux-summary-length`;
  the card assumes one line).
- Every cruxTag an article uses has a registry entry: **error**
  (`cruxtag-registry-coverage`; an unlabeled group would render a raw
  slug and break the `DefinedTermSet`). Unused entries are allowed.
- Every registry entry has a kebab-case `urlSlug`, unique across the
  registry: **error** (`cruxtag-urlslug`).
- There is NO uniqueness check on cruxTag (decision 1).

## Proposed Pattern Queue

A pipeline mechanism, deferred with it: the analyze stage would strip
references to undefined patterns into a human-review queue and hold
articles left below two grounded patterns. The design is in
`context/pipeline-architecture-deferred.md`.

In manual authoring the rule it protected still holds: **the validator
enforces shape integrity; authoring decisions stay with the author.**
An article that can't reference two defined patterns doesn't ship
until the missing definition is authored, or it doesn't ship at all.

## Auth and Access Model

- No authentication. The site is fully public and read-only.
- No server-side state and no runtime write path. The only per-user
  state is the per-browser wall record in `localStorage`; nothing
  leaves the browser apart from Vercel Analytics events.
- Write access is implicit: whoever can push to the repo publishes.
  Vercel deploys `main`.
- The problem page's subscribe card renders only when
  `newsletterSignupUrl` in `src/config/site.ts` is set.

## Invariants

Numbers are stable because code and other context files cite them;
4 and 5 are retired, not reused.

1. **Static by construction.** Per-route content is in the served HTML
   at build time (Rendering). Content reaches `src/` only through
   `src/content/index.ts`'s eager `import.meta.glob`, so it is
   bundled, never fetched. Runtime network activity is limited to
   progressive enhancements: artifact iframes and their bundles, the
   `ArtifactEmbed` HEAD probe, and `@vercel/analytics` events. Fonts
   are self-hosted. The no-fetch property and the no-runtime-
   computation property are both required: content first, network
   only for enhancements. Enforced by construction and review; no
   automated check.
2. **Artifact fault isolation and containment.** Each artifact renders
   in its own sandboxed iframe, and a malformed or failing artifact
   never breaks the build, the page around it, or any other artifact.
   - **Compile time:** a per-artifact esbuild failure logs, removes
     its partial output and is skipped; the build proceeds. (A host
     that *declares* an artifact with no source is a content error and
     fails validation: `artifact-bundle-exists`.)
   - **Runtime:** `ArtifactEmbed` shows one muted error frame for both
     modes, and the page around it reads normally. Load failure:
     `iframe.onerror`, or a HEAD probe failing twice 1.5s apart (for
     protocol artifacts, any message from the frame within 8s
     overrides it). Render exception: the ErrorBoundary the entry stub
     wraps around every bundle. The landing hero has no probe (a load
     failure leaves a dark empty frame); its own ErrorBoundary covers
     the wrapper.

   The `sandbox` attribute is exactly `allow-scripts` wherever an
   artifact mounts: JS and nothing else. Same-origin, forms, top-level
   navigation, popups, pointer lock, storage, plugins and downloads
   are denied by absence. Artifacts cannot read parent state, navigate
   the parent, or persist data.

   **Principle: never loosen sandbox, widen postMessage instead.** A
   new capability is a `postMessage` request the parent decides on,
   never a sandbox flag. The sandbox is the floor; postMessage is the
   door. The parent always gates on `event.source ===
   iframe.contentWindow`, never on origin. Handled today:
   `artifact:interacted` (every bundle), `artifact:size` (the landing
   hero), the wall protocol v1 (problem pages). Missions persist
   through the host: the principle at work.

   **Standalone-visitor contract.** Artifact URLs are shared and opened
   without their page. Article artifacts ship (1) a collapsible
   context block (THE PROBLEM / THE MOVE / TRY), expanded by default,
   whose PROBLEM line compresses the `crux` and whose MOVE/TRY lines
   describe what *this* artifact does, claiming nothing the article
   doesn't; (2) a footer backlink to the article (`target="_blank"`,
   since the same bundle renders in the embed). See
   `docs/behindscale-taste.md` §6. Pattern and problem artifacts carry
   neither; their host page supplies the context. Every standalone
   page also gets the build-injected bar back to its owner.
3. **The boundary.** `src/` is the site; `scripts/` is build-time
   tooling; `content/` (with `keywords/`) is the hand-authored source
   of truth; `public/artifacts/` and `public/figures/` are compiled
   output.
   - `src/` never imports from `scripts/` and never reads files at
     runtime.
   - `scripts/` may import from `src/` only framework-free modules:
     `src/types` (the types and the schema predicates), pure helpers
     in `src/lib` (e.g. `proseText`, `proseList`, `catalogGroups`,
     `patternCategories`), and `src/walls`. Never React components,
     pages, or `src/content` (which depends on Vite's glob; scripts
     read content from disk or from the SSR bundle).
   - Networked or long-running work (the git-history fetch) happens
     only in `scripts/`, at build time.

   No automated check enforces the import rule; review does.
4. *Retired.* Pipeline idempotency. Kept in
   `context/pipeline-architecture-deferred.md`.
5. *Retired.* Long-running work and external API calls only in the
   pipeline. Superseded by invariant 3's build-time rule; the
   pipeline form is in the deferred doc.
6. **Schema conformance.** `content/` JSON conforms to the types in
   `src/types/`. Enforced at build: `scripts/load-content.ts` runs the
   predicates in `src/types/predicates.ts` on every file; a
   nonconforming file is reported and skipped from the check set, and
   any error fails `npm run validate`, which gates `npm run build` and
   CI. The site trusts the schema but still degrades rather than
   crashing on a bad lookup (skip + flag): unknown slugs render
   not-found states, an unregistered cruxTag renders its slug as the
   label, a class without a `urlSlug` links to
   `/problems#term-<cruxTag>` and gets no page.
7. **Official engineering blogs only.** Every article originates from
   the official engineering blog of the company that built the system
   it describes. Personal blogs, Substacks, third-party summaries,
   conference recaps and aggregators are never published, even when
   they cover the same material. `content/feeds.json` is the allowlist
   of approved blogs, rendered on `/sources`. An article's `source` must
   equal its allowlist entry (`source-matches-feed`); whether the post
   itself (`url`) belongs to that blog is editorial
   (`docs/behindscale-taste.md` §2), and no check ties the two.
8. **Bidirectional pattern integrity + minimum coverage.** Articles
   and patterns are joined by canonical pattern slugs. Two rules, both
   build failures:
   - **Orphan references.** Every `patterns[].slug` on an article has
     a matching file in `content/patterns/` (`orphan-pattern-slugs`).
   - **Minimum coverage.** Every article references **at least 2
     patterns** (`minimum-pattern-coverage`).

   Patterns with zero articles are permitted (a pattern can be seeded
   before its first article) and still get a page; nothing flags
   them. Pattern slugs are lowercase kebab-case, one file per slug, by
   convention: no check enforces the format, uniqueness, or
   slug-equals-filename.

   *Rationale for the minimum-2 rule:* behindscale's mission is to
   surface transferable patterns across companies. A single-pattern
   article is a case study, fine reading on its own, but it doesn't
   compound, and the library's value is the cross-article synthesis.
   The minimum forces either deeper analysis (most engineering
   articles embody several patterns once you look) or honest
   exclusion.
