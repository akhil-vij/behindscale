# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Article #18 (AWS shuffle sharding) LANDED
  (2026-07-14), fourth recurrence-driven singleton fill
  in a row. Only 2 audit-flagged singletons remain
  (gray-failure/Slack, retry-amplified/AWS).**
  Fable-authored dissection of Colm MacCárthaigh's
  Builders' Library piece "Workload Isolation Using
  Shuffle Sharding" (Dec 2019) — the canonical source
  from the pattern's originators, making blast radius
  a number you choose via combinatorics: 8 workers, 28
  combinations of 2, scope of impact 1/28th (7x better
  than fixed sharding, same machines); Route 53 runs
  2,048 virtual name servers with four per domain and
  730 billion possible shuffle shards, guaranteeing no
  two domains share more than two servers. The pattern
  quietly exports part of its guarantee to callers
  (fault-tolerant retries hide the half-of-a-worker
  degradation), which is where it cross-links three
  ways to `retry-amplified-overload` (the remaining
  AWS singleton) and to the Meta/Slack queue idempotency
  thread. Eighth two-company class fill:
  `blast-radius-scales-with-cluster-size` (Discord only
  after rounds 4+5) becomes EIGHTH two-company class.
  AWS becomes a two-article company (matches Uber/Slack
  precedent — no new precedent flag). No feeds.json
  change (Amazon Builders' Library already the source).
  Shipped by the Claude Code agent as `feat: publish`
  (`<pending>`) + this docs refresh (`<pending>`).
  Selection rationale: fourth fill-a-singleton in a
  row (Slack #15 buffer-degrades, Airbnb #16
  single-cluster, Roblox #17 observer-shares-fate,
  AWS #18 blast-radius). The instance shows the
  taxonomy's frontier for this class — cells so cheap
  they're VIRTUAL and OVERLAPPING, exponential
  isolation from a fully shared fleet. Match with
  Discord (fan-out coupling one node to 40% of ops):
  same class, two geometries of cell — physical when
  state pins work to nodes (Discord); virtual when any
  worker can serve any request (Route 53, queues,
  stateless tiers). Tradeoff #6 draws that boundary
  honestly and names it staff-level judgment.
  **Owner decision now more decisive:** landing preview
  now derives EIGHT recurring rows — the show-all vs
  cap-and-signal decision was already required at
  seven; at eight it is more so. Kept at eight for now
  (still consistent with the "show all recurring
  bottlenecks" feedback). Both options remain named as
  acceptable actions in the Landing.tsx doc comment.
  Contents: article JSON with `addedAt: 2026-07-14`
  and cruxSummary populated at authoring; one new
  pattern `shuffle-sharding` (category `resilience`);
  artifact accent `#FF9900` AWS orange (checked
  against the resilience-chip orange `#EA580C` which
  is page chrome not artifact, and semantic amber
  `#eab308` — distinct in situ).
  No cruxtags.json change
  (blast-radius-scales-with-cluster-size entry already
  seeded 2026-07-08).
  relatedArticles: AWS → Discord forward link in
  article JSON; Discord → AWS backlink applied in the
  same commit.
  Recurrences created:
  - `blast-radius-scales-with-cluster-size` →
    2-company (Discord + AWS). EIGHTH two-company
    class. Discord's blast came from bulk operations
    fanning out across one large cluster; AWS's is
    designed away with a choose function. Same class,
    two geometries.
  - `fault-isolation` → 8-company (Discord, Netflix,
    Uber, Skipper, Cadence, Slack cellular, Airbnb
    monitoring, Roblox, AWS shuffle — 9 occurrences
    now, this article stating the arithmetic
    explicitly: no sharding = 100% blast radius, four
    fixed shards = 25%, shuffle shards = 1/28th from
    the same eight workers).
  - `shuffle-sharding` (new pattern, first article,
    category `resilience`). Definition captures the
    combinatorial guarantee AND the assignment-aware
    routing requirement AND the client-retry
    dependency.
  Library state after landing: **18 articles across 13
  companies (AWS second article); 26 pattern
  definitions; 18 article artifacts + 1 site-level
  hero.** cruxTag taxonomy: 10 tags with 8 two-company
  and 2 one-company (Slack gray-failure, AWS
  retry-amplified). Landing preview auto-updates to 8
  rows (verified in dist/index.html).
  Verifier: `npm run validate` 6 checks / 0 errors /
  11 warnings (unchanged from Roblox — all three
  Shuffle stat values ("1/28th", "730 billion", "100%")
  appear verbatim in prose so no new fuzzy misses);
  `npm test` 100/100; `npm run build` 49 routes / 48
  sitemap URLs; cross-page `@id` assertion passes on
  new content.

- **Article #17 (Roblox 73-hour Consul outage) LANDED
  (2026-07-13), third recurrence-driven singleton fill
  in a row. Only 3 audit-flagged singletons remain
  (blast-radius/Discord, gray-failure/Slack,
  retry-amplified/AWS).** Fable-authored dissection of
  Roblox's 2022 "Return to Service" post-mortem — a
  73-hour full-platform outage where two deep,
  primarily unrelated pathologies inside Consul (Go-
  channel contention in the new streaming feature under
  simultaneously high read+write load, and a BoltDB
  freelist that turned 16kB Raft appends into 7.8MB
  writes) hid inside the one Consul cluster that all of
  Roblox depended on for service discovery, health
  checks, scheduling, and secrets — while the telemetry
  that would have exposed the pathologies depended on
  that same cluster. Sixth two-company class fill:
  `observer-shares-fate-with-observed` (Airbnb only
  after rounds 4+5) becomes SEVENTH two-company class.
  Roblox = NEW company, the 13th; Roblox Blog is the
  13th source.
  Shipped by the Claude Code agent as `feat: publish`
  (`<pending>`) + this docs refresh (`<pending>`).
  Selection rationale: third fill-a-singleton in a row
  (Slack #15, Airbnb #16, Roblox #17). The post's
  crux was chosen against its own cause ranking:
  root CAUSE = streaming + BoltDB internals; CRUX =
  what made it 73 hours (verbatim from post: "diagnosis
  challenges were largely responsible for the extended
  downtime"; "critical monitoring systems... relied on
  affected systems, such as Consul... severely hampered
  the triage process"). observer-shares-fate matched
  the registry definition with the monitoring case
  leading. Considered and rejected
  `blast-radius-scales-with-cluster-size` (rhyme, not
  match: that tag is node-count blast radius within a
  cluster; this is one cluster underpinning
  everything, covered via `fault-isolation` at the
  pattern layer).
  **Owner decision now REQUIRED (was surfaced-only
  last round):** landing preview now derives SEVEN
  recurring rows — decisively past the "revisit at 6+"
  threshold the Landing.tsx doc comment named. Kept at
  seven for now (still consistent with the "show all
  recurring bottlenecks" feedback), but the show-all
  vs cap-and-signal call is no longer deferrable on
  the next design pass. Both options remain named as
  acceptable actions in the doc comment.
  Contents: article JSON with `addedAt: 2026-07-13`
  and cruxSummary populated at authoring; one new
  pattern `throttled-readmission` (category
  `resilience` — recovery-as-its-own-regime, DNS-
  steered ~10% ratchets against cold caches); artifact
  accent `#00A2FF` classic Roblox blue (flagged against
  GitHub `#58A6FF` periwinkle and Slack `#36C5F0`
  cyan-teal — blues getting crowded, distinguishable
  but a swap candidate at in-situ review).
  feeds.json ADDITION: Roblox Blog entered (13th
  source; first-party corporate blog, Engineering
  section, authored by Roblox VPE + HashiCorp).
  No cruxtags.json change
  (observer-shares-fate-with-observed entry already
  seeded 2026-07-08).
  **Pattern check (DECISIONS item 3) resolved:** the
  Airbnb monitoring article's
  `circular-dependency-avoidance` pattern is the
  telemetry-independence pattern — Roblox is the
  second instance (author flagged as check-required
  because they couldn't see the live pattern list from
  the handoff view). Added to Roblox's patterns[] with
  the pattern's "map and sever" framing spanning both
  articles.
  relatedArticles: Roblox → Airbnb monitoring forward
  link in article JSON; airbnb-monitoring backlink
  applied in the same commit (the article had no
  prior relatedArticles field — this is its first).
  Recurrences created:
  - `observer-shares-fate-with-observed` → 2-company
    (Airbnb monitoring + Roblox). SEVENTH two-company
    class. Same conclusion reached by both companies
    across a 400x difference in outage duration —
    Airbnb from a smaller blast radius after their
    monitoring redesign; Roblox from 73 hours in the
    dark.
  - `fault-isolation` → 7-company (Discord, Netflix,
    Uber, Skipper, Cadence, Slack cellular, Airbnb
    monitoring, Roblox — the audit's most-recurring
    known pattern already; this is its seventh
    company).
  - `circular-dependency-avoidance` → 2-company
    (Airbnb monitoring + Roblox). Second instance of
    a pattern whose first article authored it.
  - `throttled-readmission` (new pattern, first
    article, category `resilience`). Recovery as its
    own operating regime; ratchet admission against
    cold caches.
  Library state after landing: **17 articles across 13
  companies; 25 pattern definitions; 17 article
  artifacts + 1 site-level hero.** cruxTag taxonomy:
  10 tags with 7 two-company (Stripe+Shopify,
  Uber+Netflix, Skipper+Cadence, Figma+Notion,
  Meta+Slack, GitHub+Airbnb, Airbnb+Roblox) and 3
  one-company (Discord blast-radius, Slack
  gray-failure, AWS retry-amplified). Landing preview
  auto-updates to 7 rows (verified in dist/index.html).
  Verifier: `npm run validate` 6 checks / 0 errors /
  11 warnings (unchanged from the Airbnb round — the
  three Roblox stat values all appear verbatim in
  prose so no new fuzzy misses added); `npm test`
  100/100; `npm run build` 47 routes / 46 sitemap
  URLs; cross-page `@id` assertion passes on new
  content.

- **Article #16 (Airbnb main-database partition) LANDED
  (2026-07-13), second recurrence-driven singleton fill.
  Multi-company classes now OUTNUMBER singletons 6:4 —
  the audit's stated threshold for revisiting held
  learning tracks.** Fable-authored dissection of
  Airbnb's 2015 "How We Partitioned Airbnb's Main
  Database in Two Weeks" — the RDS Read Replica
  Promotion move that split the message inbox off the
  monolith's original database with zero migration
  code, seven and a half minutes of scoped downtime,
  and a mid-project discovery that snapshots
  destabilized the site in proportion to main-DB load.
  Shipped by the Claude Code agent as `feat: publish`
  (`<pending>`) + this docs refresh (`<pending>`).
  Selection rationale: fill the `single-cluster-scaling-
  ceiling` singleton (GitHub only after rounds 4+5) —
  sixth two-company class, and the moment the
  multi/single ratio crosses 6:4. Match, not rhyme:
  GitHub↔Airbnb are the two ends of the same wall —
  a decade of virtual-before-physical schema discipline
  vs two weeks + 7.5 minutes downtime.
  **Precedent flag for owner:** Airbnb becomes the
  first THREE-article company (skipper, monitoring,
  this). Prior precedent tops out at two (Uber, Slack).
  Rationale accepted: selection is recurrence-driven
  and this was the strongest verifiable first-party
  source for the single-cluster singleton; company
  concentration is a consequence, not a goal. If a
  company cap is desired, log it as a selection
  constraint going forward.
  **Owner decision surfaced:** landing preview now
  derives SIX recurring rows (was five) — crossing the
  documented "revisit at 6+" threshold in the
  Landing.tsx doc comment. Kept at six for now (prior
  feedback: "show all recurring bottlenecks; don't
  soften the header"). Owner should decide show-six vs
  cap-and-signal on next design pass — both are named
  as acceptable actions in the doc comment.
  **Multi/singleton ratio milestone:** the audit
  originally held learning tracks (thematic-collection
  and per-crux deep-dives) "until multi-company
  outnumber singletons." That condition is now met
  (6 multi-company vs 4 singleton classes), though
  depth-per-class (average 2 articles) may still argue
  for waiting. Owner's call, not urgent.
  Contents: article JSON with `addedAt: 2026-07-13` and
  cruxSummary populated at authoring; one new pattern
  `replica-promotion-split` (category `consistency`);
  artifact accent `#FF5A5F` Airbnb brand coral
  (proximate to semantic `#ef4444` red but distinct in
  hue; used only for chrome, never verdict color;
  logged in DECISIONS as a swap-to-`#FFB400` fallback
  if the proximity reads too close in situ). No
  feeds.json change (Airbnb already a two-article
  company). No cruxtags.json change
  (single-cluster-scaling-ceiling entry already seeded
  2026-07-08). relatedArticles: Airbnb → GitHub
  forward; GitHub → Airbnb backfilled.
  Recurrences created:
  - `single-cluster-scaling-ceiling` → 2-company
    (GitHub + Airbnb). SIXTH two-company class; the
    class that crosses multi over single.
  - `logical-physical-migration-split` → 3-company
    (Figma + GitHub + Airbnb). Figma rehearsed
    semantics behind views + flags; GitHub enforced
    virtual schema domains for years; Airbnb
    compressed the same principle into a two-week
    preflight with grant revocation as the
    enforcement lever.
  - `replica-promotion-split` (new pattern, first
    article, category `consistency`). Definition
    captures the front-loaded-risk shape: promotion is
    irreversible, so rehearsal + verification stop
    being diligence and become the design.
  Library state after landing: **16 articles across 12
  companies; 24 pattern definitions; 16 article
  artifacts + 1 site-level hero.** cruxTag taxonomy:
  10 tags with 6 two-company (Stripe+Shopify,
  Uber+Netflix, Skipper+Cadence, Figma+Notion,
  Meta+Slack, GitHub+Airbnb) and 4 one-company.
  Landing preview auto-updates to 6 rows (verified in
  dist/index.html).
  Verifier: `npm run validate` 6 checks / 0 errors /
  11 warnings (was 8; +3 new fuzzy misses on Airbnb
  `1/3` vs prose "one third", `7.5 minutes` vs "seven
  and a half minutes", `-33%` vs "33%" — same cosmetic
  class as residuals, will fold into the
  cosmetic-warnings chore); `npm test` 100/100;
  `npm run build` 45 routes / 44 sitemap URLs;
  cross-page `@id` assertion passes on new content.

- **Article #15 (Slack job queue) LANDED (2026-07-13),
  first post-nav-phase publication + first
  recurrence-driven fill of an audit-flagged singleton.**
  Fable-authored dissection of Slack's 2017 "Scaling
  Slack's Job Queue" — the Kafka-in-front-of-Redis
  redesign after a Redis-memory-limit outage where the
  full queue could not dequeue because dequeuing itself
  required free memory (and stayed locked after the
  underlying database contention was fixed). Shipped by
  the Claude Code agent as a single `feat: publish`
  commit (`aad88fd`) plus this docs refresh
  (`<pending>`) — the standard publish shape.
  Selection rationale (new): first article chosen
  explicitly to CONVERT AN AUDIT-FLAGGED SINGLETON
  cruxTag to two-company. `buffer-degrades-under-backlog`
  (Meta only after rounds 4+5) becomes the fifth
  two-company class — the first singleton-fill via
  recurrence-driven sourcing, exactly the move the
  post-audit roadmap targets. Match, not rhyme: FOQS's
  MVCC-history-list scan cost DEGRADES under backlog;
  Slack's memory-drain SEIZES. Same class, different
  terminal points.
  Contents: article JSON with cruxSummary populated at
  authoring (first article authored under the
  2026-07-08 content contract — the validator's
  crux-summary-length + cruxtag-registry-coverage
  checks both pass on first run); one new pattern
  `durable-front-buffer` (category throughput,
  first-use-of-throughput after the ramp expansion);
  artifact accent `#36C5F0` Slack cyan (distinct from
  slack-cellular's `#ECB22E` gold + all 14 existing
  accents). No feeds.json change (Slack now two-article
  company; precedent: Uber, Airbnb). No cruxtags.json
  change (buffer-degrades-under-backlog entry already
  seeded 2026-07-08). Bidirectional relatedArticles
  thread: Slack↔Meta FOQS.
  Recurrences created:
  - `buffer-degrades-under-backlog` → 2-company
    (Meta + Slack). Fifth two-company class.
  - `queue-with-guaranteed-delivery` → 3-company
    (Discord + Meta + Slack). Honest caveat: Kafkagate
    leader-only ack is a documented small loss window at
    the front door; the guarantee lives in the durable
    tier + JQRelay's offset-advance-on-success + error
    re-enqueue.
  - `durable-front-buffer` (new pattern, first article,
    category throughput). Definition captured in
    `content/patterns/durable-front-buffer.json`.
  Library state after landing: **15 articles across 12
  companies; 23 pattern definitions; 15 article
  artifacts + 1 site-level hero.** cruxTag taxonomy:
  10 tags with 5 two-company (Stripe+Shopify,
  Uber+Netflix, Skipper+Cadence, Figma+Notion,
  Meta+Slack). Landing preview auto-updates to 5 rows
  (verified in dist/index.html); inside the
  revisit-at-6+ threshold the Landing.tsx doc comment
  documented.
  Verifier: `npm run validate` 6 checks / 0 errors /
  8 warnings (was 7; +1 new fuzzy miss on Slack
  `O(queue length)` stat vs prose "proportional to
  queue length" — same class as the residuals, will
  fold into the cosmetic-warnings chore); `npm test`
  100/100; `npm run build` 43 routes / 42 sitemap URLs;
  cross-page `@id` assertion passes.

- **Landing + navigation + SEO/crawler foundations phase
  LANDED (2026-07-09, eight-commit sequence).** Fable-
  authored implementation handoff (spec + updated docs +
  design + hero artifact + cruxSummary backfill for 14
  articles + cruxTags registry) shipped by the Claude Code
  agent as eight commits. The largest single UI change in
  the project's history: `/` flipped from article feed to
  conversion landing page (hero + trust band + top-3
  problem-class preview + one CTA, no filters); the
  browsable feed moved to `/catalog` organized primarily
  by problem-class (cruxTag), secondary company filter,
  client-side search with cruxTag matches surfaced as their
  own result cluster. `/patterns` untouched.
  Content-contract additions: required `cruxSummary`
  field on every Article (one-line ~10-16 word crux
  compression, backfilled surgically on all 14 live
  articles preserving round 4+5 landings); new
  `content/cruxtags.json` registry (10 entries: label +
  one-sentence class definition per cruxTag). Two new
  validator checks: `crux-summary-length` (error on
  missing/empty + warning above ~20 words) and
  `cruxtag-registry-coverage` (error on any used cruxTag
  missing a registry entry). Chip category ramp expanded
  from 4 mapped categories to 5 (adds `performance` →
  cat-orange) -- decision (1) preserved the live five-
  category taxonomy against the spec's incomplete
  three-category assumption.
  SEO landings: tier-1 robots.txt named `Allow` blocks for
  11 AI + search crawlers (Googlebot, Bingbot,
  Google-Extended, GPTBot, ChatGPT-User, OAI-SearchBot,
  ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot,
  CCBot); tier-2 crawlable substance -- both new pages
  serve full semantic HTML on first byte with the top-3
  preview + catalog groups + article/pattern
  cross-references in the served DOM; tier-3 machine-
  readable taxonomy -- article pages upgraded from Article
  to `TechArticle` with `isBasedOn` + `about`
  (`/catalog#term-<cruxTag>` @id) + `mentions` (per-
  pattern `/patterns#term-<slug>` @id) + `keywords` +
  BreadcrumbList; /catalog emits a `CollectionPage` +
  cruxTag `DefinedTermSet`; /patterns emits a pattern
  `DefinedTermSet`. Every group header on /catalog and
  every pattern card on /patterns carries
  `id="term-<slug>"` so JSON-LD `@id` references land on
  real in-page anchors -- decision (4) refinement locked
  and verified. Cross-page `@id` contract assertion in
  scripts/prerender.ts refuses to ship structured data
  with dangling references (32 referenced / 42 emitted /
  0 dangling in the live library).
  Site-level artifact class introduced:
  `content/artifacts/_hero.jsx` compiles to
  `/artifacts/_hero/index.html` alongside the article
  artifacts; sandboxed identically; exempt from the
  standalone-visitor context-block + article-backlink
  contract per taste-doc §6 named exemption. Landing
  page's HeroErrorBoundary wraps the iframe subtree so
  hero failures never break the sibling trust band /
  preview / CTA subtrees.
  Old `src/pages/ArticleIndex.tsx` and
  `src/components/SourceFilterChip.tsx` deleted after the
  verify-then-delete guardrail confirmed Catalog is a
  genuine superset (source filter → canonical company
  filter, `Amazon (AWS)` collapses to one chip). Legacy
  `/?source=<slug>` URLs handled by a client-side
  `CatalogRedirect` shim on `/`.
  Commits, all on `main`:
  `96f4281` chore: content contract + registry + validators
  + chip ramp;
  `9cdcb27` docs: architecture + project-overview +
  design-spec + taste-doc merges;
  `8d9411d` feat: /catalog scaffold + / role flip + hero
  artifact + navbar;
  `746efd5` feat: catalog page + grouping + JSON-LD
  CollectionPage + DefinedTermSet;
  `51b9f92` feat: landing page + hero seam frame + trust
  band + preview + CTA + JSON-LD;
  `5c4e741` feat: SEO tier 3 (TechArticle + BreadcrumbList
  + pattern DefinedTermSet + @id assertion);
  `5e0c2f6` feat: SEO tier 1 (robots.txt named allows) +
  article-page cruxTag chip + Also solving this siblings;
  this docs commit (`docs: refresh progress-tracker after
  landing + nav + SEO phase`).
  Verifier state after phase: `npm run validate` 6 checks
  0 errors 7 warnings (same 7 residual value-in-prose
  fuzzy-miss warnings that predate the phase); `npm test`
  100 passed (was 80; +20 across the new content contract
  + grouping module tests); `npm run build` 40 routes
  prerendered, 39 URLs in sitemap. Not yet pushed; awaits
  owner approval + post-deploy verification queue below.

- **Phase 6 resumed: Units 9 + 10 closed; quality sprint
  complete (stripe + uber + airbnb + skipper reworks +
  discord enrichment); article cadence unblocked.** Unit 9 (SSG + SEO foundation) landed and
  prod-verified 2026-06-11; one iframe regression from
  `cleanUrls` was caught + fixed within the hour (`fix:` commit
  `a6a31af`). Unit 10 (article reading arc + instrumentation)
  landed in three commits over 2026-06-11/12 and was manually
  prod-verified by the owner: section order is live, analytics
  pipe is firing into the Vercel dashboard. **Unit 11 / quality
  sprint pt 1 (stripe rework) landed 2026-06-12** in three
  commits: rewrite to source after audit found personal-blog
  material in the seed dissection (invariant 7); pattern
  references corrected; artifact rebuilt; `updatedAt` schema
  field added. **Unit 11 / quality sprint pt 2 (uber rework)
  landed 2026-06-12** in four commits: a validator chore (the
  stats-value-in-prose check now handles composite values via
  `→` split and emits warnings rather than errors on
  fuzzy misses, restoring the docs-commit intent that was
  shipped as a hard error by mistake); an article rewrite
  (corrected dead source URL, wrong publishedAt, three
  fabricated example figures, an understated scale, and an
  inverted tradeoff); a pattern merge (pid-controlled-adaptive-
  thresholds + byos-platform-design retired into a single
  feedback-controlled-load-management pattern with 308
  redirects from the retired URLs); and this docs commit. The
  PidSim and CinnamonView artifact panels were also patched to
  fix three internal-consistency issues caught alongside the
  fidelity audit. **Unit 11 / quality sprint pt 3 (airbnb
  rework) landed 2026-06-13** in two commits: the article was
  the cleanest of the five (one publishedAt micro-fix, one
  manufactured-count fix in a pattern note); the substantive
  work was the artifact upgrade, replacing the static Problem
  tab with a FailureSim 2x4 matrix (two architectures x four
  failures) where the fourth-failure case shows the Dead Man's
  Switch as the answer to the residual self-failure case --
  the artifact's signature interaction now demonstrates the
  article's thesis rather than the article asserting it.
  **Unit 11 / quality sprint pt 4 (skipper rework) landed
  2026-06-13** in two commits: the deepest of the five reworks. Fidelity fixes
  (wrong publishedAt 2024 -> 2026; "MySQL or DynamoDB"
  corrected to "MySQL or Airbnb's internal Unified Data Store
  (UDS)"; a fabricated idempotency-key-derivation mechanism
  removed from tradeoffs; a happy-path overclaim corrected to
  the source's actual batched-checkpoint + delayed-timeout-
  task design). Enrichment: the dissection had omitted
  compensation (`@Compensate`, reverse-order undo), signals
  (`@SignalMethod`), the delayed-task safety net, and the
  direct-state-vs-event-sourcing trade -- all now covered;
  tradeoffs went 5 -> 6. Artifact: the static "Replay &
  Checkpoints" code-reveal tab -- the library's weakest
  interaction by the craft standard -- replaced with a
  ReplaySim crash-and-replay simulator on the
  ListingPublicationWorkflow example; checkpointed actions
  return SKIPPED on replay, waitUntil hibernates until the
  @SignalMethod fires, and the terminal banner names the
  exactly-once outcome explicitly. **Unit 11 / quality sprint
  pt 5 (discord enrichment) landed 2026-06-13** in two
  commits, closing the five-article sprint for real. Unlike
  the other four parts, this was an enrichment, not a
  rewrite: the audit found Discord the library's reference
  standard (prose verified, all five pattern notes general,
  the artifact already four genuine interactive views).
  Light article changes (one precision fix in problem ¶3 to
  disambiguate Celery-queue vs Redis-cache for cross-
  referencing readers; an `updatedAt`; the canonical Unit 10
  stats values landed at last; a `relatedArticles` cross-link
  to Airbnb monitoring -- the second cross-company thread
  after Stripe<->Uber), plus a new EvolutionDiff artifact
  view promoted to the default tab: a six-row component
  ledger (sharding, queue, bulk indexing, cluster topology,
  upgrades, largest-guild ceiling) with a lens toggle between
  2017 and 2025, the sharding row marked PRESERVED in green
  as the load-bearing decision that made the rewrite
  possible. The Skipper docs commit's premature "sprint
  complete" framing is corrected here; the sprint was always
  five articles, and this is the actual closer. **Article
  #6 (Netflix prioritized load shedding) published
  2026-06-18**, the first new article since the sprint
  closed -- chosen on recurrence-driven sourcing grounds.
  The 2024 canonical Netflix post extends two existing
  patterns (priority-aware-load-shedding,
  feedback-controlled-load-management) the library had so
  far seen only in Uber's storage-layer stack; the Netflix
  service-layer instance turns both into two-company
  patterns, the move that makes the library demonstrate its
  thesis rather than assert it. Library state: **6
  articles, 15 pattern definitions (unchanged), 6
  artifacts.** Three bidirectional `relatedArticles`
  threads now seeded: Stripe<->Uber, Discord<->Airbnb, and
  the new Uber<->Netflix link added in the same commit.
  The measurement foundation from Unit 10 is intact through
  the new article. The reassessment window from 2026-06-04
  still applies.

- **Rounds 4 + 5 LANDED (2026-07-09, two commits): articles
  #13 Notion and #14 Meta FOQS.** Both authored in chat with
  Fable then shipped by the Claude Code agent as
  `feat: publish notion-sharding-postgres` (`b73c5dc`) and
  `feat: publish meta-foqs-priority-queue` (`fc8be10`). Each
  bundle: article JSON + 1 new pattern JSON + artifact JSX +
  feeds.json entry + one relatedArticles backlink update on
  the neighbor article. Library state after landing:
  **14 articles across 14 companies; 22 pattern definitions
  (two new: `shard-key-colocation`, `checkpoint-bounded-
  scans`); 14 artifacts.** cruxTag taxonomy: 10 tags with 4
  two-company (Stripe↔Shopify `ambiguous-failure-under-retry`,
  Uber↔Netflix `priority-blind-load-shedding`,
  Skipper↔Cadence `partial-completion-under-crashes`, and now
  Figma↔Notion `single-table-scaling-ceiling`).
  Pattern recurrences created this round:
  application-layer-sharding → 3-company (Discord + Figma +
  Notion; third company rejecting Citus/Vitess for control);
  shard-key-colocation → 2-company day one (Figma + Notion —
  the second-source hold from the Proposed Pattern Queue
  paid off; Figma's patterns[] backfilled in Notion's own
  commit); queue-with-guaranteed-delivery → 2-company
  (Discord + Meta); circuit-breaker → 2-company (Shopify +
  Meta). New cruxTag `buffer-degrades-under-backlog` (Meta
  only) deliberately not a delivery/loss tag — delay-not-loss
  is FOQS's mission; the crux is a buffer's own MySQL
  substrate slowing exactly as it fills. Two new relatedArticles
  bidirectional threads: Figma↔Notion, Discord↔Meta FOQS
  (both were one-way in the article JSONs and paired with
  the backlink edit on the neighbor). Both commits: build
  clean, tests 80/80, validator 0 errors + 7 warnings (three
  new fuzzy misses stacked onto the existing residual four —
  Notion `~3 days` / `5 minutes` and Meta `~1 trillion` —
  same class, still cosmetic-not-blocking). Not yet pushed;
  awaiting owner call.

- **Editorial batch LANDED (2026-07-06 → 07, nine commits,
  the largest content batch in the project's history).**
  Authored in chat sessions with Fable across three review
  bundles (round 1: library upgrade + Shopify + Figma;
  round 2: GitHub + Uber Cadence; round 3: Slack + AWS
  Builders' Library), then implemented and shipped by the
  Claude Code agent in nine commits: a docs commit landing
  the amended canonical docs + the new `docs/behindscale-
  taste.md`; a chore commit landing the crux/cruxTag schema
  + THE CRUX callout + backfill of the six existing article
  JSONs; six `feat: publish <slug>` commits landing the new
  articles + patterns + artifacts + feeds entries; one
  `feat:` commit landing the six updated artifact sources
  (Stripe/Netflix/Skipper/Airbnb enhanced; Uber/Discord
  full rebuilds). All 9 commits build clean end-to-end,
  validator 0 errors, 4 fuzzy-miss warnings (word-vs-digit
  / unit-suffix, warning-not-error semantics as intended
  since the Uber-sprint chore); 12/12 artifact bundles ok
  with the standalone-visitor contract confirmed on every
  compiled bundle. Library doubled: 6 → 12 articles across
  12 companies; 15 → 20 pattern definitions (five new:
  circuit-breaker, logical-physical-migration-split,
  compile-time-boundary-enforcement, generic-mitigation,
  retry-budget); 6 → 12 artifacts. New taxonomy axis
  (crux + cruxTag) live at 9 tags with 3 already
  two-company (ambiguous-failure-under-retry: Stripe +
  Shopify; priority-blind-load-shedding: Uber + Netflix;
  partial-completion-under-crashes: Skipper + Cadence —
  the first same-crux/opposite-solution pair). Pattern
  recurrences created this batch: idempotency-keys
  3-company (Stripe + Shopify + AWS), fault-isolation
  6-company (+Shopify, +GitHub, +Slack),
  logical-physical-migration-split 2-company (Figma +
  GitHub), cell-architecture 2-company (Discord + Slack),
  retry-with-backoff-and-jitter 2-company (Stripe + AWS),
  application-layer-sharding 2-company (Discord + Figma),
  durable-workflows + embedded-vs-centralized-orchestration
  both two-company both-poles (Skipper + Cadence). Pushed
  `52efa99..178a591`; Vercel auto-deployed. Owner
  post-deploy verification pending.

## Current Operating Mode

Manual editorial authoring. Akhil reads engineering blogs, drafts
dissections in conversation with Claude (chat partner), and hands
files to the Claude Code agent for commit and prod verification.
Sustained cadence target: 3 articles per week (treated as a floor,
exceed when bandwidth allows). Reassess at week 8 (counting from
2026-06-04) with data on actual cadence and quality consistency.

## Current Goal

- Push the eight-commit landing/navigation + SEO phase
  (`ac7415d..HEAD` or similar range from origin's last
  point) to origin/main and verify prod. Owner post-deploy
  verification queue:
  * `/` renders the hero artifact live inside the dark-in-
    light seam frame; the trust band shows 12 canonical
    company wordmarks (Amazon (AWS) as one); the top-3
    problem-class preview shows the four two-company
    groups' top 3 by count-desc + alpha tie-break;
    `Browse all 14 breakdowns` CTA present with count
    derived from library size.
  * `/catalog` renders all 10 problem-class groups in
    count-desc order (four 2-company classes lead:
    ambiguous-failure-under-retry, partial-completion-
    under-crashes, priority-blind-load-shedding, single-
    table-scaling-ceiling); each group header shows
    label + N SYSTEMS + definition + `SEEN AT` companies;
    every group carries `id="term-<slug>"`. Company
    filter shows 12 canonical chips; `?source=notion-blog`
    narrows to Notion articles with no hydration shift.
    Search field with `id="catalog-search"` narrows
    articles + surfaces cruxTag matches as a top cluster.
  * Article-page cruxTag chip (below THE CRUX callout)
    navigates to `/catalog#term-<slug>` and scrolls the
    catalog to the correct group; "Also solving this"
    section renders on multi-company articles only
    (Stripe/Shopify pair, Uber/Netflix pair, Skipper/
    Cadence pair, Figma/Notion pair, Uber/Airbnb
    (Cadence+Skipper), and skipped on single-company
    articles).
  * Structured-data validation in Google's Rich Results
    Test on one article URL, /catalog, /patterns, and /:
    - Article page: TechArticle parses with isBasedOn +
      about + mentions + keywords + BreadcrumbList (4
      levels).
    - /catalog: CollectionPage + cruxTag DefinedTermSet
      (10 terms).
    - /patterns: pattern DefinedTermSet (22 terms).
    - /: WebSite + SearchAction + Organization.
  * Apex-vs-www robots.txt canonicalization check via
    `curl -I` on both hosts. If they don't 301 to a
    single canonical, add a Vercel redirect in a small
    follow-up commit.
  * Deliberately break the hero artifact source (or
    simulate a 404 on `/artifacts/_hero/index.html`) and
    confirm the landing page still renders. This is the
    one destructive verification the local safety harness
    reasonably declined to automate; owner runs it.
  * The residual cosmetic warnings chore (seven fuzzy
    misses across GitHub, Skipper, Slack, AWS, Notion×2,
    Meta) still queued; taxonomy is now at 10 tags with
    4 two-company, one shy of the ~5-6 soft threshold
    for `/bottlenecks` deep-dive pages -- deferred as
    before.

## Completed

- Context files authored: project-overview, architecture (Content Contract
  enumerates Source, Article, and Patterns shapes in full), ui-context,
  code-standards, ai-workflow-rules, CLAUDE.md.
- Key design decisions locked (see Architecture Decisions below).
- **Unit 1 — Project scaffolding.** Vite + React 18 + TypeScript (strict)
  initialized. Tailwind v3 configured with the full ui-context.md token set
  exposed as CSS custom properties in `src/index.css` and surfaced through
  `tailwind.config.js` `theme.extend` (colors, fontFamily, borderRadius).
  No hardcoded hex outside `src/index.css` (the token source).
  `npm run dev` boots cleanly on `http://localhost:5173/`; `npm run build`
  passes (`tsc -b && vite build`). Minimal `App.tsx` renders the
  "behindscale" wordmark using `bg-bg-base`, `text-text-primary`, and
  `font-sans` — token wiring verified end-to-end. Webfonts (Inter /
  JetBrains Mono) deferred to Unit 3 (will use `@fontsource` for
  self-hosting per invariant 1); current `--font-sans` / `--font-mono`
  are system fallback stacks. Tailwind v3 locked in for the project.
- **Unit 2 — Shared schema types.** The content contract is now typed in
  `src/types/`:
  - `source.ts` — `Source` (name, slug, company, url, feed), matching the
    Content Contract in architecture.md.
  - `pattern.ts` — `PatternReference` (on-article: slug, note) and
    `PatternDefinition` (slug, name, definition, whenItApplies, tradeoffs,
    optional category).
  - `article.ts` — `Article` (slug, title, url, publishedAt, source,
    summary, problem, solution, tradeoffs, tags, patterns, optional
    relatedArticles, optional generatedAt, required artifact as
    `{ path: string } | null`). Source and PatternReference imported as
    type-only.
  - `pattern-library.ts` — `PatternLibraryArticleRef`,
    `PatternLibraryEntry` (definition, frequency, articles, companies),
    and `PatternLibrary` ({ generatedAt, entries }).
  - `index.ts` — type-only barrel export.

  All files are type-only: zero runtime logic. Tests under
  `src/types/__tests__/` use hand-written type-guard predicates in
  `validators.ts` (test-only; never exported from the barrel, never
  imported outside tests) — no Zod. Each shape has a positive sample +
  multiple malformed samples that the predicate rejects, including the
  `artifact: null` summary-only case and rejection of missing-artifact
  entirely. **34 tests, 4 files, all passing**; `npm run build` still
  passes (5.99 kB CSS, 142.70 kB JS — types add zero runtime weight).
  Vitest 2.1 added to devDependencies; `npm test` runs the suite. Tests
  live colocated under `src/types/__tests__/` — pattern to repeat for
  future types.
- **Article #6 — Netflix prioritized load shedding
  (2026-06-18). First new article since the quality sprint
  closed; first deliberately recurrence-driven publication.**
  Four commits in order: `content: add netflix to
  feeds.json` (atomic source-list addition ahead of the
  article that needs it -- same discipline as the schema
  chores that landed before the units consuming them);
  `content: article #6 -- netflix prioritized load shedding`
  (article + artifact + reciprocal Uber relatedArticles
  cross-link in one coherent commit); `fix: netflix tech
  blog URLs -- medium.com hosting` (the Netflix Technology
  Blog has migrated from netflixtechblog.com to Medium
  publication hosting; the prior two commits shipped the
  pre-migration URLs in good faith since the legacy
  domain still resolves via redirect; this fix lands the
  canonical medium.com forms across feeds.json, the
  article's url + source.url + source.feed, and the two
  predecessor URLs in the problem prose -- the 2018 post
  uses Medium's older subdomain-style URL while the 2020
  and 2024 posts use the publication-style URL); this
  docs commit.
  - Why this article, why now. The recurrence-driven
    framing was the editorial intent locked in during the
    Uber sprint's pattern merge: pattern definitions were
    deliberately authored at a generality the next
    embodiment could land cleanly against (the merged
    feedback-controlled-load-management entry's tradeoffs
    and whenItApplies sections used cross-embodiment
    framing rather than Cinnamon-specific language for
    exactly this reason). Picking Netflix as article #6 was
    the operational application of that intent: the 2024
    canonical Netflix post extends two patterns that the
    library had so far seen only in Uber's storage-layer
    stack, applying the same shed-by-priority and
    measure-the-system-you-have shapes at the service
    layer of a different company's stack. The first time a
    reader clicks the `priority-aware-load-shedding` chip
    and sees Uber and Netflix side by side, the library's
    central premise (cross-company pattern recurrence) is
    demonstrated rather than asserted.
  - Sources. The canonical 2024 post (enhancing-netflix-
    reliability-with-service-level-prioritized-load-
    shedding) is the publishedAt anchor (2024-06-25, the
    source's own date). Two predecessor posts are named in
    prose with their URLs per the prior-post convention
    locked during the Uber rework: the 2020 gateway-level
    prioritized-shedding post (which contributes the
    ChAP-experimentation-for-taxonomy-drift framing folded
    into tradeoffs[1]) and the 2018 adaptive-concurrency-
    limits post (the gradient-formula substrate the 2024
    work layers on top of, named verbatim in solution ¶3).
    All three posts read in full this session;
    netflixtechblog.com is invariant 7-compliant (Netflix's
    official engineering blog, not Medium-as-platform).
  - Pattern recurrence achieved.
    `priority-aware-load-shedding` was Uber-only before
    (Cinnamon t0-t5 at the storage layer); Netflix's
    four-bucket framework (CRITICAL/DEGRADED/BEST_EFFORT/
    BULK after Linux tc-prio) plus the PlayAPI two-partition
    limiter (user-initiated guaranteed full throughput;
    pre-fetch only excess capacity) is the service-layer
    instance. Two companies, two stack layers, one
    shed-lowest-value-first principle.
    `feedback-controlled-load-management` was Uber-only
    (Cinnamon's PID loop over queue/latency signals);
    Netflix's adaptive concurrency limits (gradient-based,
    TCP-Vegas-derived: `newLimit = currentLimit × gradient
    + queueSize` where `gradient = RTTnoload / RTTactual`)
    is the second instance. Same measure-the-system-you-
    have, two implementations. The pattern definition --
    deliberately authored general during the Uber merge --
    didn't need a single edit; this commit is the
    generality bar's first real test, and it passes.
    `fault-isolation` was already a two-article pattern
    (Airbnb monitoring, Discord search); the Netflix
    article's partitioned-limiter-vs-separate-clusters
    framing makes it three-article-across-three-companies
    -- the strongest recurrence evidence in the library
    after this commit.
  - Reciprocal cross-links. Netflix article references
    `[uber-intelligent-load-management, stripe-idempotency]`
    at write time. The Uber article was updated in the
    same commit to reference
    `[netflix-prioritized-load-shedding, stripe-idempotency]`
    (was just `[stripe-idempotency]`). The load-management
    `relatedArticles` thread is now bidirectional;
    Stripe<->Uber and Discord<->Airbnb threads
    (established during the quality sprint) carry forward
    unchanged. Three two-way pairings, ready for the
    eventual `relatedArticles` UI surface.
  - Artifact. Three views in a single sectioned artifact:
    InjectionView (default landing tab, the signature
    interaction -- inject latency or failure into pre-fetch
    traffic, toggle baseline vs prioritized, watch the
    outcome diverge); CurvesView (the 2020 cubic
    shedding-curve rendered from three published anchor
    points with the cubic interpolation labeled in-artifact
    as such -- the shape is the load-bearing claim, not the
    intermediate values); LimitView (the 2018 adaptive-
    limits sim running the real gradient formula with
    illustrative capacity values, demonstrating the
    probe-and-back-off saw-tooth and re-convergence).
    Bundle smoke-checked for the Unit 10 emitter wiring
    (artifact:interacted, slug literal,
    window.parent.postMessage); intact.
  - Verification: validator 4 checks, 0 errors, 1 warning
    (the pre-existing Skipper `10,000 per second`
    fuzzy-miss, carried forward; all three new Netflix
    stats pass cleanly via monolithic substring match --
    `12x`, `>99.4%` after `<>%` strip matching `99.4`,
    `6x`); vitest 72/72 (no test changes); `npm run
    compile-artifacts` 6/6 ok (was 5; +1 Netflix);
    `npm run build` end-to-end clean, 24 routes
    prerendered (was 23: +1 article page), 23 URLs in
    sitemap. Spot-checked
    `dist/articles/netflix-prioritized-load-shedding.html`:
    new title, datePublished=2026-06-13 (addedAt),
    dateModified=2026-06-13 (no updatedAt set; mirrors
    addedAt per the default fallback),
    isBasedOn.datePublished=2024-06-25 (the canonical
    Netflix post's source date). Pattern-detail spot-
    checks (the recurrence visible on the page, which is
    the strategic point of this publication):
    priority-aware-load-shedding now lists Uber and
    Netflix; feedback-controlled-load-management same;
    fault-isolation now lists Airbnb, Discord, Netflix.
- **Unit 11 / quality sprint pt 5 — Discord enrichment
  (2026-06-13). Closes the five-article quality sprint.**
  Two commits: `content: discord evolution enrichment +
  diff artifact view` (article touches + EvolutionDiff
  splice in one coherent content commit); this docs commit.
  - Source-verification motivation, inverted. Where pts 1-4
    were source-verification reworks that found fidelity
    errors, this one found the Discord dissection the
    audit's reference standard: prose verified against both
    the 2025 source post and the 2017 predecessor post
    (`https://discord.com/blog/how-discord-indexes-billions-
    of-messages`), all five pattern notes general and
    accurate, the artifact already four genuinely
    interactive views (the 2017 architecture diagram, the
    Four Cracks selector, the 2025 redesign, the BFG
    step-through). This commit is therefore additive
    enrichment, not a rewrite. The Skipper docs commit
    (19c2ed6) had prematurely framed the sprint as
    "complete" after pt 4; the sprint was always five
    articles, and Discord pt 5 is the actual closer. The
    correction lands in this commit alongside the content.
  - Article changes are light and additive: `updatedAt`
    2026-06-12 (first material revision via the schema
    field added in the Stripe sprint chore); one precision
    fix in problem ¶3, sentence 1 ("Redis-backed indexing
    queue" -> "indexing queue ... once the Redis the
    pipeline depended on hit CPU saturation") to
    disambiguate the 2025 failure mode (Redis-as-
    dependency, which is what the source describes) from
    the 2017 queue (Celery, with Redis as the shard-
    mapping cache) for readers cross-referencing the older
    source; `relatedArticles: ["airbnb-monitoring-reliably-
    at-scale"]` -- the fault-isolation pattern note on this
    article already names the Airbnb parallel explicitly,
    and the cross-link makes that navigable, seeding the
    library's second cross-company thread (after the
    Stripe<->Uber overload-protection link); a teaser
    matching the new view ("Toggle each component between
    2017 and 2025 -- see what was replaced, and the one
    decision that wasn't"); and three stats values (40%,
    trillions, 500ms -> <100ms) -- the canonical Unit 10
    backfill values that had been pending since the
    earlier round. Closing the Unit 10 stats-backfill
    follow-up entirely.
  - Artifact upgrade rationale. The existing artifact was
    already the strongest in the library by the post-
    Airbnb interaction-as-thesis-demonstration standard --
    four interactive views, real state, no static
    code-reveal toggles. EvolutionDiff isn't a replacement
    for any of them; it's a new view that captures the
    article's throughline (per-component evolution from
    2017 to 2025) which the other four can't surface
    individually. Made the default landing tab so a
    cold reader meets the article's narrative arc as the
    artifact's signature interaction.
  - EvolutionDiff structure. Six rows spanning the load-
    bearing components: sharding strategy (PRESERVED in
    green, the load-bearing constant), indexing queue
    (Celery+Redis -> PubSub), bulk indexing (cluster fanout
    -> Rust+tokio routing layer), cluster topology (two
    large -> ~40 small grouped in cells), upgrades &
    restarts (manual -> ECK operator), and the largest-
    guild ceiling (single-shard -> BFG cell). A lens toggle
    flips all six rows between 2017 and 2025 framing.
    Opening any row reveals side-by-side 2017/2025 panels
    plus "Why 2017 was right" and "Why it survived" or "The
    limit it reached" paragraphs -- the bulk-indexing row
    surfaces the ~40% failure math (`1 - (99/100)^50`) and
    the upgrades row surfaces log4shell as the forcing
    moment. The closing throughline callout states the
    staff-level lesson explicitly: an architecture ages
    component by component; reaching a design's boundary
    is not the same as having chosen wrong; the choices
    which preserve your freedom to change are the ones
    worth getting right early.
  - Pattern definitions reviewed: application-layer-
    sharding, cell-architecture, queue-with-guaranteed-
    delivery, batched-routing-by-destination,
    fault-isolation all pass the post-Uber generality bar
    unchanged. Their per-article notes were already
    rewritten for depth in the original 5f publication and
    remain accurate against the rewritten EvolutionDiff
    structure.
  - Verification: validator 4 checks, 0 errors, 1 warning
    (the pre-existing Skipper `10,000 per second`
    fuzzy-miss, carried forward; all three new Discord
    stats pass cleanly -- "40%" and "trillions" via
    monolithic substring match, "500ms -> <100ms" via the
    composite-aware split-on-arrow path that finds the
    halves "500ms" and "100ms" independently in the
    solution prose, exactly the case the Uber-sprint chore
    was designed for); vitest 72/72 (no test changes);
    `npm run compile-artifacts` 5/5 ok (no stray sixth
    bundle); `npm run build` end-to-end clean, 23 routes
    prerendered, sitemap 22 URLs. Spot-checked
    `dist/articles/discord-trillions-message-search.html`:
    title unchanged, datePublished=2026-06-09 (addedAt
    unchanged), dateModified=2026-06-12 (updatedAt),
    isBasedOn.datePublished=2025-04-24 (unchanged -- the
    source-post date wasn't an audit finding). New
    teaser, three stat callouts (40%, trillions, the
    composite), and the corrected "the Redis the pipeline
    depended on" phrasing all render; the stale "Redis-
    backed indexing queue" phrasing is absent.
  - Sprint closeout (for real this time): with this
    commit, every article in the library is verified
    against its first-party source, and every artifact has
    at least one interactive surface that lets the reader
    trigger the article's claim rather than read it
    asserted. The Unit 10 editorial-backfill follow-up is
    closed in full -- every article has its teaser, every
    article that warranted stats has them, the composite-
    stat validator handles the shapes the sprint
    surfaced. The library's editorial bar is uniform
    across all five articles, and two cross-company
    threads are seeded for the eventual `relatedArticles`
    UI surface (Stripe<->Uber on overload protection;
    Discord<->Airbnb on fault isolation).
- **Unit 11 / quality sprint pt 4 — Skipper rework
  (2026-06-13).** (The original docs commit for this part
  framed it as the sprint closer; that was premature. Pt 5
  Discord is the actual closer, per the entry above and
  per the original sprint scope of five articles.) Two
  commits: `content: skipper rework -- rewrite + crash-
  and-replay artifact` (article rewrite + ReplaySim splice in
  one commit since the artifact's interaction model and the
  prose's enrichment are the same coherent change); this
  docs commit.
  - Source-verification motivation. The original 5b
    dissection (2026-06-02) was authored before the fidelity
    discipline locked in and carried the most concentrated
    set of issues of any article in the sweep: a wrong
    `publishedAt` (2024-08-15 belonged to neither the
    article nor any earlier post; the source's byline reads
    "Apr, 2026", corrected to 2026-04-01 -- the day-precision
    floor since Medium does not expose a day on this post);
    "MySQL or DynamoDB" as a routine state backend (the
    source uses MySQL or Airbnb's internal Unified Data
    Store (UDS); DynamoDB appears only in the
    10,000-workflows/sec peak throughput figure); a
    fabricated idempotency-key-derivation mechanism in the
    at-least-once tradeoff (the source says actions must be
    idempotent and stops there, never specifying a key
    derivation); and a happy-path overclaim that Skipper
    "only activates the persistence layer on crashes, waits,
    or errors" (the source is explicit that the happy path
    does batched checkpoint writes plus a delayed timeout
    task -- "just a few database writes" -- which is the
    actual durability guarantee on the happy path).
  - Enrichment rationale. The original dissection had the
    largest richness gap of the five. Four first-class
    mechanisms the source treats as central were absent or
    glossed: compensation (`@Compensate` annotation,
    reverse-order undo, "eventual consistency without
    distributed transactions") -- a primary section of the
    post, now its own paragraph in solution and reflected in
    new tags (`compensation`, `saga`); signals
    (`@SignalMethod` pushing data into running workflows,
    updating `@StateField` that `waitUntil` evaluates) --
    the wake mechanism, now explained; the
    delayed-timeout-task safety net -- now the core of the
    happy-path explanation rather than a missed detail;
    state-fields-vs-event-sourcing -- the source explicitly
    contrasts direct state persistence with event-sourced
    replay (leanness, no long-history replay -- but at the
    cost of auditability), now both in solution and as
    `tradeoffs[5]`. Tradeoffs expanded 5 -> 6, each now
    naming a specific source-supported cost (determinism's
    mental-model tax, at-least-once without the fabricated
    mechanism, workflow-evolution tooling gap, replay-aware
    observability, the embedded ceiling, the auditability
    cost of direct state). Production numbers (over a year,
    15+ use cases across insurance/payments/media/infra/
    incentives/wallet, 10,000 workflows/sec peak on
    DynamoDB) moved from summary-only to solution prose
    where they ground the two stat callouts.
  - Artifact upgrade rationale. The "Replay & Checkpoints"
    tab was the only tab in the library whose interaction
    was a code-reveal toggle (the publishListing Kotlin
    block showed up or hid; nothing else changed). By the
    artifact-as-thesis-demonstration standard locked in the
    Airbnb sprint, that was the library's weakest tab. The
    article's central thesis -- replay-based durability
    where a crash mid-workflow rewinds to the workflow
    method's top and checkpointed actions return their
    saved results instead of re-executing -- had no
    interactive demonstration. ReplaySim is sourced from
    the post's `ListingPublicationWorkflow` example: five
    steps spanning the post's three durability concepts
    (action checkpointing, waitUntil hibernation,
    deterministic branching). Two state panels separate
    DURABLE STATE (checkpoints + `@StateField`, survive
    crash) from IN-MEMORY (cursor + status, lost on crash).
    Controls let the reader step forward, crash at any
    point, send the `@SignalMethod` to wake a hibernating
    workflow, and reset. The pedagogically load-bearing
    moments: a checkpointed action returns SKIPPED on
    replay instead of re-executing; waitUntil with no
    signal releases the thread to hibernation; the terminal
    banner after a crash explicitly states each action ran
    exactly once on the happy path. The footer states the
    at-least-once caveat (a crash after action execution
    but before checkpoint write replays the action -- which
    is why actions must be idempotent) so the simulator
    doesn't recapitulate the article's original overclaim.
  - Pattern definitions reviewed: `durable-workflows`,
    `embedded-vs-centralized-orchestration`,
    `hibernation-vs-polling`, `atomic-phases` all pass the
    post-Uber generality bar unchanged. Their per-article
    notes were rewritten in this article to match the new
    prose's depth (e.g., `atomic-phases` now names
    "resume-from-last-committed-point, with the workflow
    method as the sequence and the checkpoint as the phase
    boundary").
  - Verification: validator 4 checks, 0 errors, 1 warning
    (the "10,000 per second" stat fuzzy-misses because the
    prose has "10,000 workflows per second" -- the word
    "workflows" between "10,000" and "per second" splits
    the substring; no `→` arrow so the composite split
    doesn't apply either; the Uber-sprint chore made this
    a warning rather than an error, surfacing it without
    failing the build, which is the docs-commit intent the
    chore restored); vitest 72/72 (no test changes);
    `npm run compile-artifacts` 5/5 ok (no stray sixth
    bundle); `npm run build` end-to-end clean, 23 routes
    prerendered, sitemap 22 URLs. Spot-checked
    `dist/articles/skipper-workflow-engine.html`: title
    unchanged, datePublished=2026-06-02 (addedAt),
    dateModified=2026-06-12 (updatedAt),
    isBasedOn.datePublished=2026-04-01 (corrected from
    2024-08-15). New teaser "Step the workflow, crash it
    anywhere..." in the rendered HTML body. Both stat
    callouts present. The corrected "MySQL or Airbnb's
    internal Unified Data Store (UDS)" phrase in the HTML;
    the stale "MySQL or DynamoDB" phrase absent.
  - Sprint closeout: with this rework, every article in the
    library has been verified against its first-party
    source, and every artifact has at least one interactive
    surface that lets the reader trigger the article's
    claim rather than read it asserted. The library's
    quality bar is now uniform across all five articles.
- **Unit 11 / quality sprint pt 3 — Airbnb rework
  (2026-06-13).** Two commits: `content: airbnb rework --
  micro-fixes + failure-injection artifact` (the article was
  the cleanest of the five so the content delta is small;
  the work concentrated in the artifact); this docs commit.
  - Source-verification motivation. The Phase 5 dissection
    (Unit 5d, 2026-06-02) of the medium.com/airbnb-
    engineering post "Monitoring Reliably at Scale" came
    back the cleanest of the five-article quality audit:
    architecture (dedicated K8s + custom Envoy L7 + Dead
    Man's Switch), components (Prometheus -> SNS ->
    CloudWatch chain), and the 1,000+ services figure all
    verified against the source. Two fixes lifted to a
    content commit: publishedAt corrected from 2026-05-12 to
    2026-05-05 per the source's `article:published_time`
    meta tag, and a manufactured "four overlapping circular
    dependencies" count in the
    circular-dependency-avoidance pattern note replaced
    with "had overlapping circular dependencies" (the
    source never enumerates).
  - Artifact upgrade rationale. The craft review found that
    the original artifact's Problem tab was the only static
    panel (Compute, Network, and Dead Man's Switch already
    had interactive surfaces); it rendered a hard-coded
    circular-dependency chain card that asserted the failure
    mode without letting the reader trigger it. The article's
    thesis ("never let your safety mechanism depend on the
    thing it's protecting") therefore had no interactive
    demonstration. The new FailureSim is a 2x4 matrix --
    two architectures (shared everything; isolated) crossed
    with four failure injections (none, K8s, Istio, the
    observability stack itself). Before-architecture cells
    always render NO ONE IS PAGED. After-architecture cells
    render ON-CALL PAGED for the first three failures
    (dedicated clusters / Envoy L7 catch the K8s and Istio
    failures). The fourth After cell -- observability stack
    itself failing -- is the pedagogically load-bearing case:
    the metrics pipeline goes dark, but CloudWatch sees the
    heartbeat silence and the page still fires. The Dead Man's
    Switch isn't an afterthought tab any more, it's the
    answer the matrix's last cell forces. Compute, Network,
    and DMS tabs unchanged; the sections array's first label
    updated from "The Problem" to "Break the Stack" to
    match the new tab's interaction. The Fable-authored
    standalone component file was spliced in as an internal
    function and the staging .jsx removed from
    content/artifacts/ so compile-artifacts doesn't build it
    as a stray sixth bundle.
  - Pattern definitions reviewed: fault-isolation,
    dead-mans-switch, and circular-dependency-avoidance all
    passed the post-Uber pattern-naming generality bar
    without changes -- none of them name implementations or
    company jargon. The pattern note for
    circular-dependency-avoidance was updated as above; the
    definition file is untouched.
  - Verification: validator 4 checks, 0 errors; vitest 72/72
    (no test changes); `npm run compile-artifacts` 5/5 ok
    (no stray sixth bundle); `npm run build` end-to-end
    clean, 23 routes prerendered, sitemap 22 URLs.
    Spot-checked `dist/articles/airbnb-monitoring-reliably-
    at-scale.html`: title unchanged, datePublished=2026-06-
    02 (addedAt), dateModified=2026-06-12 (updatedAt),
    isBasedOn.datePublished=2026-05-05 (corrected). Teaser
    "Break each layer..." in the rendered HTML body (Unit
    10's ArtifactTeaser card); stat "1,000+" present;
    pattern note reads "had overlapping circular
    dependencies", the stale "four overlapping" string is
    absent.
- **Unit 11 / quality sprint pt 2 — Uber rework
  (2026-06-12).** Four commits in order: `chore: stats-value-
  in-prose -- composite-aware, warning not error` (the
  validator gains `→`-split composite matching, the
  normalize char set extends to `<`, `>`, `~`, `≈`, and the
  fuzzy-miss is severity: 'warning' rather than a hard error;
  CheckError.severity is the framework contract that makes the
  warning vs. error distinction first-class -- the
  no-content-changes-needed semantics fix the Unit 10 docs
  commit always intended; +5 tests, render output gains a
  warnings track that doesn't flip the exit code);
  `content: uber rework -- fidelity fixes + artifact patches`
  (article rewritten against the actual source post; new
  feedback-controlled-load-management pattern definition added
  alongside the article so the validator stays green at every
  bisect point in this sprint; three artifact patches landed
  in the same commit since they're the same content-coherent
  change); `content: pattern merge -- retire pid-controlled
  and byos into feedback-controlled` (pure retirements + the
  vercel.json 308 redirects from the retired URLs; pre-deletion
  grep confirmed zero referencing articles after the prior
  commit pulled Uber's references); this docs commit.
  - Source-verification motivation. The Phase 5 dissection of
    this article (Unit 5e, 2026-06-02) predated the
    fidelity-against-source discipline that locked in with the
    Stripe rework. Post-Stripe audit pass found: the source URL
    in the article returns 404 (the post lives at
    /blog/from-static-rate-limiting-to-intelligent-load-
    management/); the publishedAt date was 2024-11-21,
    belonging to Uber's separate Cinnamon post, not this
    article (corrected to 2026-04-20); the summary said
    "Docstore and Helix" where the source says Schemaless;
    problem ¶1 understated scale ("millions" → "tens of
    millions", "partitions" → "clusters", "tens of petabytes"
    of storage added); two fabricated PID-control examples
    (a "(cross 15ms → shed 50%)" rule and a "10ms P90"
    target, neither in the source — the source uses a fixed
    wait "like 5 milliseconds" as the CoDel example); a
    tradeoff that inverted the source's actual claim (the
    original article claimed per-workload PID calibration as
    an ongoing tuning effort, but Cinnamon's stated goal is
    no per-service tuning; the honest cost is the calibration
    that paid out once, centrally, at the platform level,
    with the companion PID post's earlier-iterations stability
    issues as evidence). PID-term material from Uber's
    companion Cinnamon and PID-controller posts is now
    attributed in prose by name rather than asserted as if it
    came from this article -- same discipline the Stripe
    rework locked in.
  - Pattern merge rationale. Cinnamon's PID controller and
    its BYOS pluggable-signal architecture are inseparable in
    practice: the controller is what BYOS unifies, and BYOS is
    the architecture that gives the controller more than one
    input. Two separate library entries fractured the actual
    concept and named two specific implementation choices
    ("PID", "BYOS"). Pattern names need to survive without
    naming an implementation or company jargon; the merged
    feedback-controlled-load-management entry keeps both as
    Uber's instantiations in the article's pattern note. The
    retired patterns had zero referencing articles after the
    Uber rework (pre-deletion grep confirmed), so the deletion
    is clean and the merged pattern carries the conceptual
    weight forward. Old URLs 308-redirect via vercel.json --
    the Unit 9 SEO foundation indexed both retired slugs and
    permanent redirects transfer that signal to the merged
    pattern rather than wasting it on a 404.
  - Artifact patches (three internal-consistency fixes in the
    same content commit as the article, since the artifact
    contradicting its own captions is the same class of issue
    as the article contradicting its source). PidSim was
    rewritten end-to-end: the original ran one PID system and
    derived its "static threshold" line from that same
    system's latency (asserting rather than demonstrating the
    comparison); replaced with two independent loops under
    identical traffic, each with retry feedback (the actual
    thundering-herd mechanism), so the static loop visibly
    flaps while the PID loop converges. CinnamonView's
    walkthrough had three contradictions between captions and
    rendered state -- the header limit was hardcoded to 80
    across steps, step 4's "PID tightens further" caption
    contradicted the fixed value (fixed with a per-step
    limits[] array, with step 5 carrying a labelled
    "65 → 100 (reopening)" string since recovery is a
    curve); step 4's recovery state snapped all bars to full
    pass while its caption said remaining t4s shed (fixed
    with shed-25-t4 logic matching the caption); step 2's
    description called out 80 as a specific limit value (the
    illustrative-values disclosure now appended to the
    description). The Unit 10 `artifact_interacted` emitter
    survives the rewrite (smoke-checked the new bundle for
    the slug literal + window.parent.postMessage).
  - Validator chore detail. The composite `→` matching
    sanity-checks against all three known composites at
    once: Uber's `3.1s → 1.0s` (halves: 3.1s, 1.0s, both in
    the rewritten solution prose); Discord's `500ms →
    <100ms` (halves: 500ms, 100ms after `<` strip, both in
    the prose "from 500ms to under 100ms"); Skipper's
    `minutes → days` (halves: minutes, days, both in the
    prose "span minutes to days"). The Discord and Skipper
    composites stay unlanded (pending editorial revision and
    teaser-vs-artifact verification from the earlier Unit 10
    backfill flag), but the validator no longer holds them
    back. CheckError.severity is the framework contract that
    makes warning vs. error first-class: schema errors and
    the max-3 rule stay hard errors (structural, not
    phrasing-sensitive); the value-in-prose miss is now a
    warning since normalization is intentionally best-effort
    and a human reviewer judges fuzzy misses better than the
    substring matcher.
  - Verification: validator 4 checks, 0 errors; vitest 72/72
    (was 67; +5 in stats-value-in-prose covering severity,
    each composite shape, and a composite-fail-still-warns
    case); `npm run compile-artifacts` 5/5 ok;
    `npm run build` end-to-end clean -- 23 routes
    prerendered, sitemap 22 URLs (was 24; -2 retired
    patterns; the merged pattern was already in the count
    from the content commit). Spot-checked
    `dist/articles/uber-intelligent-load-management.html`:
    new title, datePublished=2026-06-02 (addedAt
    unchanged), dateModified=2026-06-12 (updatedAt),
    isBasedOn.datePublished=2026-04-20 (corrected). Sitemap
    confirmed clean of the retired pattern slugs.
- **Unit 11 / quality sprint pt 1 — Stripe rework
  (2026-06-12).** Three commits in order: `chore: add optional
  updatedAt to Article schema` (the schema field; JSON-LD
  `dateModified` and sitemap `lastmod` both source
  `updatedAt ?? addedAt`; predicate + 2 tests; architecture.md
  Content Contract and Rendering sections updated);
  `content: stripe rework -- rewrite to source, new pattern,
  rebuilt artifact` (full article rewrite sourced exclusively
  from stripe.com/blog/idempotency; new
  `retry-with-backoff-and-jitter` pattern definition;
  full-replacement artifact rebuilt around the source post's
  failure taxonomy + idempotency-key resolution; atomic-phases
  rehomed onto skipper-workflow-engine where checkpointed
  Actions are a true embodiment); this docs commit (decision
  log + tracker update).
  - The audit motivation: the original stripe-idempotency
    dissection (Unit 3f, the project's seed article) was
    written before the fidelity discipline locked in; the
    post-Unit-9 quality audit found that the article's
    atomic-phases framing, recovery-point state machine, and
    Rocket Rides walkthrough all came from Brandur Leach's
    *personal blog* series on the same subject, not from the
    cited official post — invariant 7 (official engineering
    blogs only) exclusion. The seed article predated the
    fidelity discipline. Rewritten exclusively from the
    post's actual material: HTTP idempotent-verb semantics
    (PUT/DELETE, RFC 7231), idempotency keys and how they
    resolve each of three network-failure modes,
    exponential backoff with jitter. Two metadata bugs
    surfaced in the same pass and fixed inline: `publishedAt`
    was 2017-08-29, the post says February 22, 2017
    (corrected to `2017-02-22`); and this is the first
    material post-publish revision, which triggers the
    `updatedAt` field added in the same sprint.
  - The new `retry-with-backoff-and-jitter` pattern
    definition synthesizes across multiple embodiments
    (Ethernet CSMA/CD, TCP retransmission, AWS SDK retry
    policies, gRPC + Envoy) with Stripe's official client
    library called out as one instance among many. Category
    `resilience`. Pairs with `idempotency-keys` (now the
    stripe article's other pattern reference) — together
    they cover both sides of safe retry: what makes the
    retry safe (keys) and what makes the retry polite
    (backoff + jitter).
  - The artifact (`content/artifacts/stripe-idempotency.jsx`)
    is a full replacement: three failure scenarios
    (connection fails, mid-operation crash, response lost)
    crossed with a no-key / `Idempotency-Key` toggle.
    Step through any scenario with either mode and watch the
    server's key table, the event log, and the resulting
    verdict update together. The mid-operation case surfaces
    on screen the post's "behavior here is heavily
    implementation-dependent" caveat — the artifact shows
    the ACID-rollback path because that's the path the
    source post describes; the deeper recovery-point work
    has no qualifying first-party source and was removed
    with it. esbuild-verified, 21.8 kB source / 154 kB
    bundled. The Unit 10 `artifact_interacted` emitter is
    intact in the new bundle (smoke-checked: bundle contains
    `artifact:interacted`, slug literal, and
    `window.parent.postMessage`).
  - Atomic-phases rehomed to
    `skipper-workflow-engine.json`: Skipper's checkpointed
    Actions are an embedded-library instance of the
    pattern (each action's result is durably committed after
    execution; on replay, completed actions return their
    checkpoints instantly). Skipper now references 4
    patterns (was 3), well above the minimum-2 rule and
    more truthful to the post's content.
  - `relatedArticles: ["uber-intelligent-load-management"]`
    is the field's first real use. The pairing is on the
    overload-protection-as-shared-concern axis: Stripe is
    the client-side politeness half (backoff + jitter);
    Uber's load shedder is the server-side complement.
    The website has no `relatedArticles` UI surface yet —
    the field validates and ships, the missing "see also"
    section moves to In Progress as a small standalone
    follow-up.
  - Verification: validator 4 checks 0 errors; vitest 67/67
    (was 65; +2 for `updatedAt` accept/reject);
    `npm run compile-artifacts` 5/5 ok; `npm run build`
    end-to-end clean — 24 routes prerendered (was 23; +1
    for the new pattern page). Spot-checked
    `dist/articles/stripe-idempotency.html`: new title,
    `datePublished = 2026-05-29` (addedAt unchanged),
    `dateModified = 2026-06-12` (updatedAt first use),
    `isBasedOn.datePublished = 2017-02-22` (corrected).
    Sitemap `lastmod` for the article is the updatedAt
    date; the atomic-phases pattern page's `lastmod`
    cleanly migrated from stripe's old addedAt to
    skipper's. Production smoke pending the Vercel deploy
    after push.
- **Unit 10 — Article reading arc + instrumentation
  (2026-06-11/12).** Three commits in order: `chore: add
  artifact.teaser + stats[] to Article schema; new validator
  check` (`7f5958c` — content-contract change adding two optional
  fields and the project's fourth validator check,
  `stats-value-in-prose`, enforcing the editorial constraint that
  pull-stat values are a lift from the article's own prose, not a
  source of new claims; normalization is best-effort substring
  match with `+`/`%`/`,`/whitespace stripped and lowercased);
  `docs: Unit 10 architecture lock` (`b22c9e5` — new top-level
  Article Reading Arc section in `architecture.md`, five new
  Architecture Decisions entries in `progress-tracker.md`
  covering placement-rationale + width-discontinuity-by-design,
  stats-as-lift editorial discipline, the postMessage telemetry
  protocol with explicit cross-reference to invariant 2's "never
  loosen sandbox, widen postMessage" decision and the
  source-vs-origin subtlety, the two-column-layout rejection, and
  the analytics-as-progressive-enhancement framing that
  pre-defends invariant 1's Unit-9 wording); `feat: unit 10 --
  article reading arc + instrumentation` (`d60f147` — five
  deliverables in one shot).
  - Implementation: 10 files changed, +433/-18. `src/pages/
    ArticleDetail.tsx` reordered: header → top pattern chips
    (wayfinding) → SourceAttribution → summary → ArtifactTeaser
    (conditional) → Problem + stats[problem] → Solution +
    stats[solution] → ARTIFACT EMBED with `id="artifact"` →
    Tradeoffs + stats[tradeoffs] → Patterns (full, with notes).
    New `ArtifactTeaser` + `StatsRow` components, both pure
    functions of article JSON (no hydration surface). `ArtifactEmbed`
    gains two `useEffect`-gated analytics hooks: IntersectionObserver
    fires `artifact_viewed` once at threshold=0.5; a `message`
    listener fires `artifact_interacted` filtered by
    `event.source === iframeRef.current?.contentWindow` (source
    comparison, not origin — sandboxed frames have
    `event.origin === "null"`). `scripts/compile-artifacts.ts`
    gains a capture-phase window-level pointerdown listener in
    the entryStub that posts `{ type: 'artifact:interacted', slug
    }` to `window.parent` with target origin `'*'`; the
    closure-flag "once" semantic survives a race condition where
    stray browser-internal pointer events could consume a
    `{once:true}` listener before any real interaction.
    `src/main.tsx` mounts `<Analytics />` at the client entry
    only — never inside `AppRoutes` — so SSR never invokes the
    tracker; invariant 1's Unit-9 wording is untouched (analytics
    is a progressive enhancement, not content).
    `scripts/prerender.ts` gains a `truncateForMeta()` helper that
    cuts meta descriptions at the last word boundary ≤160 chars
    with ellipsis (the meta nit from Unit 9's verification ride-
    along); applied to both `articleMeta` (full summaries
    previously shipped >300 chars) and `patternMeta` (previously
    hard-cut at 220 chars mid-word). `@vercel/analytics` ^2.0.1
    added as a runtime dependency.
  - Smoke test: 5/5 tests (was 2/2). Existing four-route walk
    fixed to target the bottom-section "Atomic Phases" chip via
    `.last()` after Unit 10 added the wayfinding chip at the top.
    New `Unit 10: article section order` test reads h2 + iframe
    bounding-box Y positions and asserts Solution.y < iframe.y <
    Tradeoffs.y — a future refactor that re-buries the artifact
    breaks loudly. New paired Unit-10 tests for the analytics
    protocol: a pipe test that invokes the cross-origin
    `window.parent.postMessage` from inside the sandboxed iframe
    via `frame.evaluate` and asserts the parent listener captures
    the canonical payload, and a build-time check that walks
    `public/artifacts/` and asserts every compiled bundle
    contains the `'artifact:interacted'` literal, the slug
    literal, and `window.parent.postMessage`. The pair covers
    what the brief's original click-iframe-assert-message test
    was meant to catch (Playwright cannot deliver synthetic
    pointer events into opaque-origin sandboxed iframes —
    multiple synthesis strategies were attempted during
    implementation and all failed at the cross-realm boundary
    the sandbox enforces; the limitation is documented inline in
    the test file).
  - Verification: validator 4 checks 0 errors; vitest 65/65;
    Playwright local 5/5 in ~2.3 min; build clean (23 routes
    prerendered with the new section order baked in on every
    article page); owner manually confirmed Unit 10 on prod
    (section order live, analytics pipe firing into the Vercel
    dashboard, `artifact_interacted` events recorded).
  - Known follow-ups (intended, not bugs): a `content:` commit
    with Fable's editorial backfill of `artifact.teaser` strings
    and `stats[]` values for the five existing articles
    (specificity principle — until that lands, the teaser card
    renders on zero articles, which is the documented intended
    initial state); the `public/og-default.png` carry-over from
    Unit 9.
  - Architectural side benefit: the `artifact_interacted` event
    is the first instantiation of the Unit 5b "never loosen
    sandbox, widen postMessage instead" decision in production.
    The brief's original `iframe.contentDocument` plan would have
    silently failed (contentDocument is unreadable under
    `sandbox="allow-scripts"` without `allow-same-origin`); the
    scope review surfaced this BEFORE the feat commit and the
    paired tests would have caught it after.
- **Unit 9 — SSG + SEO foundation (supersedes HashRouter,
  2026-06-11).** Per-route static HTML at build time via a custom
  prerender script over first-party primitives
  (`react-dom/server`'s `renderToString` + `react-router-dom`'s
  `StaticRouter` + Node `fs`). 23 routes prerendered (home,
  patterns index, 5 articles, 15 patterns, 404), each ships with
  real content + `<title>` + `<meta name="description">` +
  canonical link + OpenGraph (type, site_name, title, description,
  url, image) + twitter:card + (for articles) full `Article`
  JSON-LD structured data baked into the served HTML.
  - Three commits in order: `chore: add addedAt to Article schema
    + backfill five articles` (atomic content-contract change so
    the SEO unit consumed a field that already existed); `docs:
    Unit 9 architecture lock` (locked the SSG decision, the
    HashRouter supersede, and the vite-react-ssg loser's paragraph
    in Architecture Decisions); `feat: unit 9 -- SSG + SEO
    foundation` (the implementation in one shot).
  - Implementation: 11 files changed, +507/-19. `scripts/
    prerender.ts` (~250 lines, the meat) reads `dist/index.html`
    as the template, loads the SSR bundle's `render` function,
    walks the route table, renders each route via `renderToString`
    + `StaticRouter`, splices per-route head tags + JSON-LD,
    writes one HTML file per route. `scripts/generate-sitemap.ts`
    emits `dist/sitemap.xml` (22 URLs, /404 excluded) and
    `dist/robots.txt`. `src/AppRoutes.tsx` is the router-agnostic
    route tree; `src/main.tsx` switches to `hydrateRoot` +
    `BrowserRouter`; `src/ssr-entry.tsx` wraps in `StaticRouter`
    and re-exports content arrays for the prerender script (Vite
    resolves `import.meta.glob` at SSR build time; the SSR bundle
    is the single source of truth for routing). `src/components/
    NotFound.tsx` renders both `/404` (prerendered) and the
    runtime `*` catchall. `index.html` gains a 5-line inline
    hash-redirect shim before `main.tsx` so any visitor arriving
    at `#/...` gets `location.replace`d to the canonical path
    before React mounts. `vercel.json` pins `cleanUrls: true` and
    `trailingSlash: false`.
  - Three defensive properties locked in
    `architecture.md` Rendering section: (1) every prerender
    string replacement asserts the needle exists AND output
    differs from input after, throws loudly on either failure;
    (2) JSON-LD inline injection escapes `<` to `<` to
    prevent `</script>` breakout; (3) attribute escapes cover
    `&`, `<`, `>`, `"`, `'`. Hydration model: `ArticleIndex`
    reads `useSearchParams` from a `useEffect` so first paint
    matches the server-rendered unfiltered list; the filter
    resolves immediately after mount, dodging mismatch on
    `?source=foo` arrivals.
  - JSON-LD field map deliberately omits `name` inside
    `isBasedOn` — behindscale's title is editorial and may
    diverge from the source post's title, and asserting the
    source published under our title would be misattribution.
    URL + publisher is sufficient identification.
  - Invariant 1 reworded in `architecture.md` to make the
    no-runtime-computation property explicit (the original
    wording met the letter and missed the spirit, which is what
    made the SEO miss possible). The artifact iframe HEAD probe
    is named as the one runtime network activity — a
    progressive enhancement, not a content dependency, so the
    new wording doesn't overclaim.
  - `vite-react-ssg` evaluated and rejected during the
    investigation phase (single-maintainer pre-1.0 beta on a
    load-bearing path; the custom-prerender alternative is a
    stronger dependency position). Full loser's paragraph
    preserved in Architecture Decisions for revisit triggers.
  - Bug caught in local smoke: hash-redirect shim originally
    concatenated `location.pathname + h.slice(1)`, which on `/`
    produced a protocol-relative `//articles/...` URL. Fixed to
    `h.slice(1) + location.search` (slice already starts with
    `/`, plus preserve existing query string).
  - Verification: `npm run validate` 3 checks, 0 errors;
    `npm run compile-artifacts` ok for all 5 artifacts; `npm
    run build` end-to-end clean — 23 routes prerendered, 22 URLs
    in sitemap.xml, robots.txt emitted, all defensive assertions
    passed; `npm test` 51/51; local `npm run test:e2e` 2/2 (the
    existing four-route walk + the new hash-redirect journey);
    **production smoke `npm run test:e2e:prod` against
    https://www.behindscale.com green after the Vercel
    auto-deploy of `5a08db9` landed** — 2/2, 3.8 s + 2.2 s
    tests, 10.8 s end-to-end. Curl-verified at the byte level:
    `/articles/stripe-idempotency` returns real `<title>`, real
    `og:title` / `og:description`, full Article JSON-LD with
    corrected `isBasedOn`; `/sitemap.xml` and `/robots.txt`
    serve 200; unknown paths return HTTP 404 (not soft-200).
  - Known follow-up (out of scope for this commit): a
    `public/og-default.png` (1200×630, dark token palette +
    wordmark). The `og:image` meta tag currently points at
    `https://www.behindscale.com/og-default.png`; until the
    file lands, unfurlers will 404 on fetch and gracefully
    omit the image while still rendering title + description.
- **5f — Discord: How Discord Indexes Trillions of Messages (first
  Phase 6 publication).** Discord Engineering's 2025 retrospective
  on the 2017→2025 message-search architecture evolution. The 2017
  application-layer-sharding decision survives; every other
  component is replaced (Redis-as-buffer → PubSub with guaranteed
  delivery; two big clusters → ~40 small ones grouped into cells;
  cross-destination bulk indexing → destination-batched routing;
  outlier guilds approaching Lucene's 2B MAX_DOC → multi-shard BFG
  cell with dual-index-then-cutover migration). Added 4 new
  patterns + a cross-reference to the existing `fault-isolation`
  pattern:
  - `application-layer-sharding` (throughput) — moving the
    where-data-lives decision into application code rather than
    the storage system's internal sharding. Likely to recur
    broadly.
  - `cell-architecture` (resilience) — independent self-contained
    units as the architectural primitive; each cell is the unit of
    capacity, isolation, and operational reasoning.
  - `queue-with-guaranteed-delivery` (resilience) — persistent
    queues vs. buffers-pretending-to-be-queues; the principle:
    if your queue's failure mode under pressure is data loss, you
    don't have a queue.
  - `batched-routing-by-destination` (throughput) — group items by
    downstream destination before issuing each bulk operation;
    keeps each bulk operation's fault domain narrow.
  Artifact at `content/artifacts/discord-trillions-message-search.jsx`
  is a four-tab walkthrough (2017 → The Four Cracks → 2025 Cells →
  BFG) with Discord-brand indigo (#5865F2) accent; 160 kB compiled
  bundle; self-contained on `useState`.
  - **content/feeds.json backfill** to invariant-7 parity. Adds
    Airbnb Engineering, Discord Engineering, and Uber Engineering
    alongside the existing Stripe Engineering entry. Source blocks
    copied verbatim from the corresponding articles. The
    pipeline-side `source-matches-allowlist` validator check
    (deferred Unit 7 deliverable) would have caught the gap;
    backfilling here avoids carrying the inconsistency forward.
  - Library state after 5f: **5 articles, 15 pattern definitions,
    5 working artifacts.** The `fault-isolation` pattern gains its
    first two-article cross-reference (Airbnb monitoring +
    Discord), exercising the multi-article "Seen in" path on the
    pattern detail page in production for the first time. The
    Discord Engineering source chip is the fourth source filter on
    `/`.
  - Bundle: CSS 43.55 kB / JS 271.52 kB (+34 kB JS over 5e for the
    bundled new content + feeds.json).
  - Verification: `npm run validate` clean (3 checks, 0 errors);
    `npm run compile-artifacts` ok for all 5 artifacts; `npm run
    build` end-to-end clean; `npm test` 49/49; local
    `npm run test:e2e` 1/1 in 2.2 s; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com
    green after the Vercel auto-deploy of `fd99a80` landed** —
    1/1, 2.2 s test, 4.0 s end-to-end.
- **Unit 5e — Uber Intelligent Load Management artifact (closes
  Phase 5).** Last of the four chat-conversation artifact backfills.
  Added `content/articles/uber-intelligent-load-management.json`
  plus three new pattern definitions:
  `priority-aware-load-shedding` (resilience),
  `pid-controlled-adaptive-thresholds` (throughput), and
  `byos-platform-design` (throughput). Article references all
  three; coverage 3 >= 2.
  - `content/artifacts/uber-intelligent-load-management.jsx` is the
    largest artifact yet — 640 lines source, 168 kB compiled.
    Four tabs (Evolution -> CoDel -> Priority Tiers -> BYOS/PID)
    with an orange accent against the dark token palette. The PID
    tab runs a real control loop in `useEffect` with `useRef`-
    tracked state, plotting the PID-adjusted concurrency limit
    against a static-threshold comparison line so the qualitative
    difference (smooth convergence vs binary oscillation) is
    visible in motion. Self-contained: only useState / useEffect /
    useRef from react.
  - Library state after 5e: **4 articles, 11 pattern definitions
    (atomic-phases, idempotency-keys, durable-workflows,
    embedded-vs-centralized-orchestration, hibernation-vs-polling,
    fault-isolation, dead-mans-switch, circular-dependency-
    avoidance, priority-aware-load-shedding,
    pid-controlled-adaptive-thresholds, byos-platform-design),
    4 working artifacts.** All four canonical pattern categories
    have realized examples. Uber Engineering joins the realized
    sources, so the filter chip row on `/` is now All + Airbnb +
    Stripe + Uber.
  - Bundle: CSS 43.55 kB / JS 237.08 kB (+20 kB JS over 5d for the
    bundled new content JSONs).
  - The smoke test still pins to Stripe + Skipper visibility; the
    Stripe-source filter check holds because Skipper, Airbnb, and
    Uber articles all get filtered out under
    `?source=stripe-engineering`. Smoke does not exercise the PID
    simulator's internal animation — the iframe sandbox prevents
    cross-origin DOM traversal, so the simulator's correctness is
    confirmed by manual visual check on prod, not by the smoke.
  - Verification: `npm run validate` clean (3 checks, 0 errors);
    `npm run compile-artifacts` ok for all 4 artifacts; `npm run
    build` end-to-end clean; `npm test` 49/49; local
    `npm run test:e2e` 1/1 in 3.6 s; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com
    green after the Vercel auto-deploy of `b090672` landed** —
    1/1, 3.7 s test, 7.3 s end-to-end. The Unit 6 UA override
    continues to carry prod smoke through clean.
- **Unit 5d — Airbnb Monitoring Reliably at Scale artifact (second
  Airbnb article).** Added `content/articles/airbnb-monitoring-
  reliably-at-scale.json` plus three new pattern definitions:
  `fault-isolation` (resilience), `dead-mans-switch` (observability),
  and `circular-dependency-avoidance` (resilience). Article
  references all three with per-article notes; coverage 3 >= 2.
  `content/artifacts/airbnb-monitoring-reliably-at-scale.jsx` is a
  four-tab walkthrough (Problem -> Compute -> Network -> Dead Man's
  Switch) with a cyan accent against the dark token palette,
  self-contained (only `useState`). Each tab walks an options-then-
  decision shape (shared / own / dedicated-managed; Istio /
  separate Envoy / DIY; binary signal vs absence detection).
  - Library state after 5d: 3 articles, 8 pattern definitions, 3
    working artifacts. The Airbnb Engineering source now has 2
    articles (Skipper + this one), so the source filter on `/` has
    its first multi-result case beyond the single-Stripe-article
    check.
  - Bundle: CSS 43.55 kB / JS 217.37 kB (+17 kB JS over Unit 6 for
    the bundled new content JSONs).
  - The smoke test still pins to Stripe + Skipper visibility; the
    Stripe-source filter check holds with the Airbnb article in the
    list because the Airbnb article is also filtered out under
    `?source=stripe-engineering`. Expanding the smoke to assert
    Airbnb-source filter behavior belongs with a future
    "smoke-as-fixture-grid" change, not 5d.
  - Side note: fault-isolation is likely a high-frequency pattern
    across future articles (the underlying principle recurs at
    every layer: process, tenant, failure-domain, traffic,
    capability). The patternStats aggregator already handles
    arbitrary frequency -- no code change. Worth noticing as the
    first pattern the library expects to see broadly.
  - Verification: `npm run validate` clean (3 checks, 0 errors);
    `npm run compile-artifacts` ok for all 3 artifacts; `npm run
    build` end-to-end clean; `npm test` 49/49; local `npm run
    test:e2e` 1/1 in 4.5 s; **production smoke `npm run
    test:e2e:prod` against https://www.behindscale.com green after
    the Vercel auto-deploy of `c4b6530` landed** -- 1/1, 4.0 s
    test, 9.4 s end-to-end. The Unit 6 UA override carried 5d
    through without re-triggering Vercel's bot detection.
- **Unit 6 — Source filter on the article index + feeds.json
  migration + artifact-path validator check.** Three loosely
  related deliverables in one unit: resolves the longstanding
  `pipeline/feeds.json` location open question (now
  `content/feeds.json`), adds the first navigation surface beyond
  chip/article cross-linking (a single-source filter on `/`), and
  promotes the slug-equals-path artifact convention into
  enforcement.
  - `content/feeds.json` (renamed from `pipeline/feeds.json`) is
    now the single source of truth for the source allowlist.
    Architecture / ui-context / progress-tracker path references
    updated to match. The new `feeds` export from
    `src/content/index.ts` loads it via `import.meta.glob` of a
    single literal path — same loading mechanism as articles and
    patterns, no separate `resolveJsonModule` configuration, no
    cross-include path concerns from `import` of a file outside
    `src/`.
  - Source filter UI: inline chips above the article grid (not a
    sidebar — the index is the only filterable surface on the
    site; a layout split would break the single-column reading
    rhythm everywhere else). Chips derive from
    `articles[*].source` (realized-content principle: navigation
    surfaces filter by realized content, informational surfaces
    describe intended scope — Architecture Decisions), sorted
    alphabetically by display name (deterministic; prevents
    visual jitter from count-based ordering). Explicit "All" chip
    first, then one chip per realized source. Active chip filled
    (accent-primary background, white text); inactive chips
    border-only. `SourceFilterChip` is a distinct component from
    `PatternChip`: same shape vocabulary, but switched on
    intensity rather than hue — pattern chips tag, filter chips
    toggle.
  - Empty state: "No articles from <Source Name> yet." plus an
    inline "Show all articles" Link. Mirrors pattern-detail "No
    articles embody this pattern yet" wording. Out-of-allowlist
    filter (e.g. `?source=garbage`): same line with the raw slug,
    no broken-chip rendering for the unknown source — invariant 6
    (skip + flag, never crash).
  - New `scripts/checks/artifact-path-matches-slug.ts`. For every
    article with `artifact !== null`, asserts
    `artifact.path === '/artifacts/' + slug + '/index.html'`.
    Validator footer now reads "3 checks". Five vitest cases under
    `__tests__/` cover happy path, drift, null-artifact silent
    pass, multi-drift in one pass, and right-folder-wrong-filename.
  - Smoke test extension: click "Stripe Engineering" chip, assert
    URL contains `?source=stripe-engineering`, assert Stripe card
    visible AND Skipper card `toHaveCount(0)` (the load-bearing
    absent-assertion — `not.toBeVisible()` passes silently if the
    chip renders but filter logic doesn't apply). Click "All",
    assert URL back to `/`, assert both cards visible. Then
    continue the original walk.
  - Prod-smoke fix: Playwright's default user-agent
    (`HeadlessChrome`) re-triggers Vercel's bot-detection security
    checkpoint, which serves a JS challenge page that doesn't
    contain the navbar/articles the smoke asserts on. Added a
    `userAgent` override in `playwright.prod.config.ts` (normal
    Desktop Chrome UA) so prod runs see the real app. Local config
    is untouched.
  - Bundle: CSS 43.55 kB / JS 200.28 kB (+2 kB JS over 5c for
    `SourceFilterChip` + feeds export + filter logic). `npm test`
    49/49 (44 prior + 5 new artifact-path cases). Local
    `npm run test:e2e` 1/1; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com
    green after the Vercel auto-deploy of `268ecac` landed** —
    1/1, 6.5 s test, 15.7 s end-to-end. The smoke now exercises
    the filter end-to-end on the live site.
- **Unit 5c — Skipper workflow engine artifact (first new article).**
  Added Airbnb Engineering's "Skipper: Building Airbnb's Embedded
  Workflow Engine" (2024-08-15) at
  `content/articles/skipper-workflow-engine.json` plus three new
  pattern definitions: `durable-workflows` (resilience),
  `embedded-vs-centralized-orchestration` (resilience), and
  `hibernation-vs-polling` (throughput). Article references all
  three with per-article notes; pattern coverage 3 ≥ 2.
  `content/artifacts/skipper-workflow-engine.jsx` is a four-tab
  walkthrough (Problem → Embedded vs Central → Replay & Checkpoints
  → Hibernation) with a green accent against the dark token palette,
  self-contained (only `useState`), inline styles in token-compatible
  hex. Compile output: 152 kB bundle at
  `public/artifacts/skipper-workflow-engine/{index.html, index.js}`.
  - Library state after 5c: 2 articles, 5 pattern definitions
    (atomic-phases, idempotency-keys, durable-workflows,
    embedded-vs-centralized-orchestration, hibernation-vs-polling),
    2 working artifacts.
  - Bundle: CSS 43.00 kB / JS 198.15 kB (+15 kB JS over 5b for the
    bundled new content JSONs).
  - The smoke test still pins to the Stripe article path; expanding
    it to walk Skipper belongs with a future "second-article-as-
    fixture" change, not in 5c.
  - First architecture decision recorded ahead of this commit:
    artifact accent colors are not bound to the category color ramp.
    Chips strictly follow the ramp (wayfinding); artifacts pick what
    suits the visualization (Skipper's green ≠ throughput category
    semantics). Prevents future artifacts from re-litigating this.
  - Verification: `npm run validate` clean (2 checks, 0 errors); `npm
    run compile-artifacts` ok for both artifacts; `npm run build`
    end-to-end clean; `npm test` 44/44; local `npm run test:e2e` 1/1
    in 3.7 s; **production smoke `npm run test:e2e:prod` against
    https://www.behindscale.com green after the Vercel auto-deploy
    of `8f0cead` landed** — 1/1, 4.8 s test, 9.0 s end-to-end.
    Skipper artifact bundle confirmed live via HEAD probe
    (`/artifacts/skipper-workflow-engine/index.html` returns 200).
    Manual visual confirmation by the owner pending separately:
    `/articles/skipper-workflow-engine` reading column + bottom
    artifact, `/patterns` showing 5 cards (was 2), and
    `/patterns/durable-workflows` showing the new article as a
    "Seen in" back-link.
- **Unit 5b — Stripe idempotency artifact (first real backfill).**
  Authored `content/artifacts/stripe-idempotency.jsx` from the existing
  chat-conversation artifact: an interactive walkthrough of Stripe's
  atomic-phases + recovery-points retry model, with a "Simulate
  Crashes" mode that walks through three crash scenarios and how the
  retry algorithm recovers from each. Updated
  `content/articles/stripe-idempotency.json`'s `artifact` field from
  `null` to `{ "path": "/artifacts/stripe-idempotency/index.html" }`.
  The compile-artifacts script produces a 155 kB bundle (React +
  ReactDOM + artifact code, minified) at `public/artifacts/
  stripe-idempotency/index.html` + `index.js`.
  - Smoke test extended with iframe-presence + attribute assertions on
    the article page: locator finds an `iframe[title*="Interactive
    visualization"]`, `src` equals the locked bundle path, `sandbox`
    equals `allow-scripts`. **Deliberately does not assert
    iframe-internal DOM.** The sandbox makes the iframe a unique
    opaque origin, and Playwright's cross-origin frameLocator
    traversal is unreliable through that boundary. Tightening the
    sandbox attribute is the more load-bearing property; iframe
    content correctness is verified by (a) bundle existence on disk
    (compile-artifacts succeeded), (b) the parent-side HEAD probe
    staying satisfied (otherwise the ErrorFrame would replace the
    iframe and the attribute assertions would fail), and (c) manual
    visual confirmation on prod.
  - Side effect: Mode B fault isolation (in-iframe render exception)
    gets natural exercise on every subsequent artifact landing — any
    bug in a real artifact surfaces as the muted error frame instead
    of breaking the page.
  - Build passes; `npm test` 44/44 (unit tests untouched); local
    smoke `npm run test:e2e` 1/1; **production smoke
    `npm run test:e2e:prod` against https://www.behindscale.com green
    after the Vercel auto-deploy of `2e633e3` landed** — 1/1, 11.2 s
    test, 21.9 s end-to-end. The Stripe atomic-phases artifact is
    live and the iframe-presence + sandbox-attribute assertions hold
    on prod. Manual visual confirmation of iframe-internal rendering
    by the owner pending separately (the test deliberately can't
    reach cross-origin iframe content).
- **Unit 5 — Sandboxed-iframe artifact embed (infrastructure).**
  Build-time + render-time fault-isolated artifact pipeline per
  architecture.md invariant 2.
  - `scripts/compile-artifacts.ts` — walks `content/artifacts/*.jsx`,
    wraps each in a per-artifact entry that mounts the default export
    inside a top-level React error boundary, runs esbuild (`format:
    esm`, `jsx: automatic`, minified), writes
    `public/artifacts/{slug}/index.js` plus an inlined HTML shell at
    `index.html`. Per-artifact compile failures stderr-log + skip +
    clean up partial output + continue (the build never fails on an
    artifact). Wipes the output dir on each run for local-dev hygiene.
    Each bundle ships its own React copy — the architecture decision
    on self-containment, not optimization.
  - `src/components/ArtifactEmbed.tsx` — renders the artifact in a
    sandboxed iframe (`sandbox="allow-scripts"`, no other flags). Two
    failure modes converge to one visible surface (a muted single-line
    error frame): a HEAD probe on the bundle URL catches load failures
    (some browsers fire `iframe.onload` even on 404); the iframe's
    own ErrorBoundary catches render exceptions inside. Includes the
    "Open in full ↗" affordance per ui-context.md.
  - Article page layout updated: reading column stays at 720 px; the
    artifact slot is a 960 px breakout *below* "Patterns in this
    article," not embedded mid-narrative. The artifact is the
    exploration destination after the read, not a textbook insertion.
    Renders only when `article.artifact !== null` — summary-only
    articles read top-to-bottom with no embed and no placeholder.
  - Build chain: `"build": "npm run validate && npm run
    compile-artifacts && tsc -b && vite build"`. esbuild added as a
    direct devDep.
  - Failure-mode probe (Mode A: compile failure): wrote a syntactically
    broken `content/artifacts/broken-probe.jsx`, ran
    `npm run compile-artifacts`, observed `skip broken-probe: Build
    failed with 1 error:` + `1 artifact skipped; build proceeds
    (invariant 2)` + exit 0 + empty `public/artifacts/` (cleanup-
    on-failure verified). Probe restored before commit. Mode B
    (runtime exception inside a compiled artifact) deferred to natural
    exercise during 5b authoring — the in-iframe ErrorBoundary catches
    any render throw and surfaces the same muted error frame.
  - Verification: `npm run build` clean end-to-end
    (CSS 43.00 kB / JS 183.02 kB — +0.7 / +1.5 kB over Unit 4 for
    ArtifactEmbed styles and component code); `npm test` 44/44;
    `npm run test:e2e` 1/1; on this commit the stripe article still
    has `artifact: null` so the embed itself renders nothing on prod —
    happy-path verification lands with Unit 5b.
- **Unit 4 — Content validator framework + orphan-pattern-slugs +
  minimum-pattern-coverage.** Multi-check framework that runs at build
  time, lives in `scripts/`, and reports all failures in one pass.
  - `scripts/validate-content.ts` — the runner. Explicit imports +
    registration array (`CHECKS`); no auto-discovery. Adding a check
    is "write a file under `scripts/checks/`, append one line to
    `CHECKS`". Exit 0 on pass, 1 on any failure.
  - `scripts/load-content.ts` — schema-validating loader. Walks
    `content/articles/` and `content/patterns/`, parses JSON, validates
    against the predicates from `src/types/predicates.ts`. Files that
    fail schema get skipped from the ContentSet and reported under the
    `[schema]` section (loader's section label, owned by
    `SCHEMA_SECTION_NAME` for grep-ability). Includes
    `isPatternDefinitionFile(name)` — explicit `index.json` exclusion
    mirroring `src/content/index.ts`'s glob negation; both must stay
    in sync.
  - `scripts/render-output.ts` — pure formatter. Format: `[section]`
    headers + section error counts, file path indented 2 sp, message
    4 sp, fix alternatives as `→`-prefixed lines (Rust/Elm compiler
    style; Unicode arrow renders fine on Vercel + modern terminals).
    Footer is `ok` or `failed (N files skipped)`.
  - `scripts/checks/orphan-pattern-slugs.ts` — every `patterns[].slug`
    on an article must have a matching definition. Reports articleSlug
    + the offending pattern slug + two-fix-alternatives output.
  - `scripts/checks/minimum-pattern-coverage.ts` — every article must
    reference ≥ 2 patterns (invariant 8). `MIN_PATTERN_COUNT = 2`
    constant with comment pointing at architecture.md.
  - `scripts/types.ts` — shared `Check`, `ContentSet`, `CheckError`.
    Checks deal in slugs (`articleSlug`/`patternSlug`); the runner
    resolves slug → path when rendering. `file?` field is the
    escape hatch for cross-cutting checks.
  - Tests at `scripts/checks/__tests__/` — 10 new vitest cases (5 per
    check) using an in-memory fixture builder (`fixtures.ts`); no
    filesystem state. Total: 44 passing (34 schema + 10 check).
  - Predicates relocated from `src/types/__tests__/validators.ts` to
    `src/types/predicates.ts` (non-barrel-exported sibling of the type
    files). Now used by both vitest schema tests and the validator
    loader. New `Result = { ok: true } | { ok: false; reason }` shape
    carries field-level reasons for the loader's `[schema]` section.
    Boolean `isXxx` wrappers kept so existing tests continue to read
    naturally.
  - Build chain updated: `"build": "npm run validate && tsc -b && vite
    build"`. Vercel inherits this — a failed validator fails the
    deploy. `tsx` (v4) added as a devDep to run the validator's
    TypeScript directly.
  - Content updated to pass on first run: authored
    `content/patterns/idempotency-keys.json` (category: `consistency`
    — same input → same outcome across retries) and added it as the
    second pattern reference on `content/articles/stripe-idempotency.json`.
    Side effect: `/` now exercises the two-chip code path on
    ArticleCard, `/patterns` shows two cards, `/articles/stripe-idempotency`
    shows two chips and two entries in "Patterns in this article".
  - Verification: `npm run validate` clean (`2 checks, 0 errors. ok.`);
    `npm test` 44/44; `npm run build` end-to-end clean
    (CSS 42.28 kB / JS 181.53 kB — +2 kB JS for the bundled second
    pattern JSON); `npm run test:e2e` 1/1 green locally.
- **Unit 3e — Pattern detail page (`/patterns/:slug`).** Closes out
  Unit 3. Reading-column layout (max-width 720px), section ordering per
  ui-context.md: pattern name (h1) → category eyebrow (if set) →
  Definition → When it applies → Tradeoffs → "Seen in". The
  `Prose` helper that lived inline in ArticleDetail was lifted to
  `src/components/Prose.tsx` and is now imported by both pages; it
  encodes the paragraph-separated-plain-text rendering contract from
  architecture.md (markdown rendering deferred to Unit 7+ as a
  one-component swap). "Seen in" reads `patternStats.articleSlugs`,
  resolves each via `articleBySlug`, and renders a back-link card per
  article reusing `SourceAttribution variant="card"` plus the article
  title (Link to `/articles/:slug`) and the per-article `note` —
  exactly the surface 3b's role-based variant naming was set up for.
  Empty `seenIn` shows a "No articles embody this pattern yet" message
  (patterns may exist before their first article per architecture.md
  invariant 8).
  - SourceAttribution card-variant Link target updated to
    `/?source=<slug>` per the locked Unit-6 URL shape — the query string
    is currently inert (no filter reads it yet) and becomes effective
    in Unit 6 with zero changes to this component. The component's
    comment now references the locked shape directly.
  - Missing-slug case: "Pattern not found" with a back link to
    `/patterns`. Invariant 6 (skip + flag, never crash).
  - Smoke test updated to assert the real PatternDetail h1
    (`Atomic Phases`) plus h2s `Definition`, `When it applies`,
    `Seen in`. Still 1/1 passing in 2.5 s (31.3 s total with build +
    preview boot).
  - Build passes (CSS 42.28 kB / JS 179.46 kB; +2.0 kB JS over 3d for
    PatternDetail + Prose extraction). `npm test` still 34 passing.
- **Unit 3d — Pattern library index + first Playwright smoke test.**
  Per the "build platforms, not point solutions" guidance, the
  aggregation lives behind a stable interface so Unit 4 can swap the
  implementation without touching consumers. `src/content/index.ts` now
  exports `patternStats: ReadonlyMap<string, PatternStatsEntry>` where
  `PatternStatsEntry = { frequency, articleSlugs, sourceSlugs }`. 3d's
  implementation walks the in-memory `articles` array at module load and
  aggregates; the function has an explicit comment marking the
  Unit 4+ swap point (replace with a read of
  `content/patterns/index.json`, the pipeline-generated aggregated
  library; the exported shape stays identical). PatternCard +
  PatternIndex never know the difference.
  - `src/components/PatternCard.tsx` — whole-card-as-`Link` (no nested
    anchors; single click target unlike ArticleCard). Renders pattern
    name, optional category eyebrow, frequency line
    (`Seen in N articles across M companies` — pluralized, handles
    zero/one), and a 2-line teaser from the first paragraph of
    `definition`.
  - `src/pages/PatternIndex.tsx` — `Patterns` h1, then a `grid-cols-1
    md:grid-cols-3` grid of PatternCards per ui-context.md. Sample data
    renders one card.
  - **Playwright smoke test** lands in this commit. `@playwright/test`
    on devDependencies; `npx playwright install chromium` is the
    one-time browser install (documented in Developer Setup above and
    will be wired into CI). `playwright.config.ts` runs the build +
    `vite preview --port 4173` and tests against the production bundle
    (not the dev server — the bundle is what users actually load).
    `tests/e2e/smoke.spec.ts` is a single test that walks all four
    routes per the testing strategy: load `/` → click article title →
    click pattern chip → click "Patterns" in the navbar. After each
    navigation, asserts both the URL is correct AND that a page-specific
    element rendered (so a silent crash to a blank page fails the test,
    not just routing). New `npm run test:e2e` script. Test passes in
    3.2 s (37 s including build + preview boot).
  - Bundle: CSS 42.28 kB / JS 177.46 kB (+1.3 kB JS over 3c — patternStats
    + PatternCard). `npm test` still 34 passing.
- **Unit 3c — Article detail page (`/articles/:slug`).** Reading-column
  layout (max-width 720px) per ui-context.md. Composition only — reuses
  `SourceAttribution variant="header"` (with external links to the source
  blog and to the original article, both `target="_blank"`) and
  `PatternChip` from 3b. Section ordering chosen for narrative flow:
  title → source header → summary paragraph → Problem → Solution →
  Tradeoffs → "Patterns in this article". Patterns surface at the bottom
  as takeaway anchors (the reader already saw chips on the index card;
  re-surfacing them at the top would be redundant). Tradeoffs render as
  an unstyled `<ul list-none>` so each item reads as a clean paragraph
  while staying semantically a list. Each pattern in the bottom section
  shows its chip plus the per-article `note` so the reader sees how
  *this* article applies the pattern.
  - Local helpers `Section` (h2 wrapper) and `Prose` (splits a
    markdown-ish string on blank lines and renders each chunk as a `<p>`)
    keep the page composable. Real markdown rendering is deferred to a
    future unit when Claude-generated content needs it; sample content is
    plain paragraphs.
  - Missing-slug case: when `articleBySlug.get(slug)` is undefined, the
    page renders a clear "Article not found" state with a link back to
    `/`. Invariant 6 (skip + flag on bad entry, never crash).
  - Indexer tightening landed in this commit: pattern glob now uses an
    array form with explicit negation
    `['/content/patterns/*.json', '!/content/patterns/index.json']` so
    Vite skips loading the future derived aggregated library at the glob
    level rather than filtering after load. Runtime filter helper
    removed. Forward-protects the indexer from the moment Unit 4+ starts
    writing `index.json`.
  - Build passes (CSS 41.92 kB / JS 176.12 kB; +1.5 kB JS over 3b);
    `npm test` still 34 passing.
- **Unit 3b — Content indexer + ArticleCard + PatternChip +
  SourceAttribution.** Foundational addition before component work:
  `src/content/index.ts` is the build-time content indexer using
  `import.meta.glob('/content/articles/*.json', { eager: true,
  import: 'default' })` (and same for patterns). Exports `articles`
  (sorted by `publishedAt` desc), `articleBySlug`, `patterns` (sorted by
  `name`), and `patternBySlug`. Type-only schema imports from
  `src/types/`. Eager glob — all content bundled at build time, invariant
  1 intact. `content/patterns/index.json` is excluded (reserved for the
  Unit 4+ derived aggregated library). The `feeds` export is deferred to
  Unit 6 (see Open Questions). Tailwind's category color tokens (`--cat-*`)
  now have parallel `-rgb` triplet variants in `index.css` so opacity
  modifiers (`bg-cat-blue/10`, `border-cat-blue/30`) compose via
  Tailwind's `<alpha-value>` syntax; canonical hex names and ui-context.md
  values are unchanged. Three reusable components:
  - **PatternChip** — `rounded-md`, `font-mono`, `text-xs`. Category lookup
    via `CATEGORY_CLASSES` literal map so Tailwind's content scanner picks
    every variant up. Uncategorized chips fall back to a neutral
    border + secondary text. Hover: `bg-bg-subtle` for all variants
    (no hue shift). Always a `Link` to `/patterns/:slug`.
  - **SourceAttribution** — `variant="card" | "header"` (role-named, not
    layout-named, so 3e back-link cards reuse `variant="card"` cleanly).
    Card variant: compact uppercase eyebrow, `font-mono`, `text-muted`,
    source-name internal Link (currently routes to `/`; becomes
    "filter by this blog" in Unit 6 without changing the surface). Header
    variant: larger mixed-case row with external links (source homepage +
    optional "Read original") opening in a new tab.
  - **ArticleCard** — non-anchor card pattern per pushback. Only the
    title is a `Link` to `/articles/:slug`; source name and chips are
    independent Links inside the card; no nested anchors anywhere. Chip
    overflow: first 3 chips visible, `+N` Link to the article page with
    `aria-label="N more pattern(s)"`.

  ArticleIndex (`/`) now reads from the indexer and renders one
  ArticleCard. Build passes (CSS 41.52 kB / JS 174.56 kB; the +7 kB JS
  delta covers indexer + components + JSON content; webfonts still
  lazy-chunked). `npm test` still 34 passing.
- **Unit 3a — Routing skeleton + navbar + webfonts + sample content.**
  `react-router-dom@6` wired up via `HashRouter` (zero-config across static
  hosting). Four routes registered: `/`, `/articles/:slug`, `/patterns`,
  `/patterns/:slug`. `Navbar` component (wordmark left, Articles +
  Patterns links right) lives in `src/components/Navbar.tsx`; active-link
  state is path-based so `Articles` highlights on `/` and `/articles/*`,
  `Patterns` highlights on `/patterns*`. Page components are placeholder
  stubs under `src/pages/` that render their route name and (for dynamic
  routes) the parsed slug — no content consumption yet. Inter and
  JetBrains Mono are self-hosted via `@fontsource/inter` (weights 400,
  500, 600, 700) and `@fontsource/jetbrains-mono` (weights 400, 500),
  imported in `src/main.tsx`. Sample content lands as data on disk: one
  Article (`content/articles/stripe-idempotency.json`), one
  PatternDefinition (`content/patterns/atomic-phases.json`, the single
  pattern the article references — bidirectional integrity intact even
  before the Unit 4 validator), and one feed entry
  (`content/feeds.json`, Stripe Engineering — moved from
  `pipeline/feeds.json` in Unit 6). Build passes; bundle is
  ~167 KB JS (gzip 54 KB) + 38 KB CSS (gzip 17 KB) + lazy webfont chunks.
  `npm test` still 34 passing — types are untouched.

## In Progress

- **Post-batch verification (2026-07-06 → 07 batch).** Nine
  commits shipped and Vercel auto-deployed. Owner
  verification queue:
  - THE CRUX callout renders between summary and artifact
    teaser on all 12 article routes (confirmed present in
    every prerendered HTML at build time; needs a live
    hard-refresh check across a phone viewport per the
    convention).
  - Standalone-visitor artifact contract visible in each
    of the 12 artifact bundles: THE PROBLEM / THE MOVE /
    TRY block above the controls (expanded by default,
    HIDE/SHOW toggle), footer backlink to the article
    route (`target="_blank"`).
  - Pattern-detail recurrence pages show the correct
    company counts: `idempotency-keys` at 3 companies
    (Stripe + Shopify + AWS), `fault-isolation` at 6,
    `application-layer-sharding` / `cell-architecture` /
    `logical-physical-migration-split` / `retry-with-
    backoff-and-jitter` / `durable-workflows` /
    `embedded-vs-centralized-orchestration` all at 2.
  - CruxTag reuse is verifiable by hand-jumping between
    the three two-company pairs (Stripe↔Shopify,
    Uber↔Netflix, Skipper↔Cadence) — same cruxTag string
    on both articles.
  - The old "live-site staleness" 2026-07-05 audit
    concern (article routes serving pre-sprint content
    while the home page showed post-sprint content) is
    now moot in principle: the Vercel deploy of
    `52efa99..178a591` is the current serving state.
    Kept as an item until owner confirms the fresh deploy
    is what /articles/stripe-idempotency and /patterns
    actually serve.
- **Seven residual value-in-prose warnings — cosmetic, land
  as a chore commit.** Fuzzy misses where the stat value
  and the prose phrase the same figure differently:
  GitHub `950,000 queries/s` (prose: `950,000 queries
  per second`), Skipper `10,000 per second` (prose:
  `10,000 workflows per second` — carried forward from
  the earlier sprint), Slack `5 minutes` (prose: `five
  minutes`), AWS `3` (prose: `three tools`), Notion
  `~3 days` (prose: `roughly three days`) + Notion
  `5 minutes` (prose: `five minutes`), Meta `~1 trillion`
  (prose: `close to a trillion`). None fail the validator
  — the warning-not-error semantics were designed for
  exactly this — and the fixes are one-line each:
  harmonize the stat string to the prose form in each
  affected article JSON. Lands anytime.
- Previously: Units 9 + 10 closed and prod-verified; Unit 11
  quality sprint complete across 2026-06-12 and 2026-06-13
  (pts 1 stripe, 2 uber, 3 airbnb, 4 skipper, 5 discord);
  article #6 (Netflix prioritized load shedding) published
  2026-06-18 as the first recurrence-driven pick. The
  Unit 10 editorial-backfill follow-up remains closed.
  Every article in the library is source-verified; every
  artifact has a true interactive surface. `relatedArticles`
  cross-links now form a small graph: Stripe<->Uber, Discord
  <->Airbnb, Uber<->Netflix (all bidirectional pre-batch),
  plus one-way links added in the batch (Shopify->Stripe,
  Figma->Discord, GitHub->Figma, Cadence->Skipper +
  Cadence->Uber, Slack->Discord, AWS->Stripe + AWS->Shopify).
  With the batch landed, the cross-link surface is now
  materially useful — most articles reach at least one
  neighbor in one hop. Next manual-mode publication awaits
  owner article choice from the remaining candidate list
  (Cloudflare Prometheus, Meta FOQS, DoorDash internal
  tools, LinkedIn Brooklin — the batch consumed the Slack
  and GitHub slots the list carried); the recurrence-driven
  selection criterion (weigh cross-cruxTag / cross-pattern
  recurrence a candidate would unlock alongside its
  standalone merit) is now the default framing. Three
  known follow-ups, all small + non-blocking:
  - `public/og-default.png` (1200×630, dark token palette +
    wordmark) — carries over from Unit 9. Unfurlers degrade
    gracefully without it; lands as a chore commit anytime.
  - **`relatedArticles` UI surface.** The cross-link graph
    is now populated across most articles; the website
    still doesn't render a "see also" section. Lands as a
    small standalone unit when the next authoring cadence
    touches the article page. The batch's landing raises
    the surface's usefulness threshold from a
    three-callers warrant to a graph-with-most-nodes-
    reachable warrant.
  - **`/bottlenecks` cruxTag browsable surface** (new,
    2026-07-06; still deferred as of 2026-07-09). Taxonomy
    is now 10 tags with 4 already two-company, a browsable
    page grouping
    articles by cruxTag would let a reader arrive
    problem-first (as opposed to pattern-first via
    `/patterns` or source-first via the source filter on
    `/`). Deferred until either the taxonomy has enough
    two-company recurrence to be materially interesting
    for browsing (say 5-6 two-company tags), or the
    next authoring cadence surfaces a natural moment to
    build the page.
  - **Prose markdown rendering with hyperlinks.** The Uber
    rework attributes PID-term material to Uber's companion
    Cinnamon and PID posts by name in prose. Hyperlinks
    (`/blog/cinnamon-using-century-old-tech-to-build-a-mean-load-shedder/`,
    `/blog/pid-controller-for-cinnamon/`) are the natural
    rendering; the prose renderer doesn't yet support markdown
    syntax. The Netflix article adds two more prose-URL
    callers (its 2018 and 2020 predecessor links); the
    GitHub article's problem paragraphs add several more
    (the Vitess/YouTube reference, the Rails ActiveRecord
    docs). Lands with the deferred markdown renderer
    (was originally scoped under Unit 7+, now decoupled
    from that sequence).

## Developer Setup

- One-time before running `npm run test:e2e`: `npx playwright install
  chromium` to download the browser binary. CI uses
  `npx playwright install --with-deps`.

## Next Up

1. **Owner post-deploy verification.** Hard-refresh
   `/articles/*` on prod and confirm THE CRUX callout is
   the third block on every article route (after header
   and summary, before the artifact teaser); phone-viewport
   QA of all 12 artifacts (context block expanded by
   default, HIDE/SHOW toggle works, footer backlink
   `target="_blank"` from inside the sandboxed embed);
   pattern-detail spot-checks that
   `/patterns/idempotency-keys` shows Stripe + Shopify +
   AWS and `/patterns/fault-isolation` shows six companies.
   Closes the "Live-site staleness" carry-over as a side
   effect (the fresh deploy IS the new serving state).
2. **Cosmetic warnings chore.** One-liner fixes on four
   stat entries where the stat string and the prose
   phrase the same figure with different notation (word
   vs digit / with vs without unit suffix); see In
   Progress for the exact list. Optional; the warnings
   are surfacing intentionally.
3. **Errata carried from the sprint** — resolve during
   the next time each article's prose is touched, not
   as their own commits: Airbnb "four overlapping
   circular dependencies" (source says "several"), Skipper
   "10,000 workflows per second on DynamoDB" vs MySQL/UDS
   state store framing, Discord four-vs-five count (this
   one landed as part of the batch's Discord update, so
   the errata is resolved on Discord's side —
   `updatedAt: 2026-07-05`). Airbnb and Skipper remain.
4. **Next publication.** Owner's article choice from the
   remaining candidate list (Cloudflare Prometheus,
   DoorDash internal tools, LinkedIn Brooklin — Meta FOQS
   is now consumed as article #14), or any newly-surfaced
   piece. The recurrence-driven selection criterion
   applies (weigh the cross-cruxTag or cross-pattern
   recurrence a candidate would unlock). Same commit
   shape: `feat: publish <article-slug>` bundling article
   + patterns + artifact + feeds entry if new.

## Deferred Work

- **Tier 2: prose → artifact-state deep links** (`?view=` URL
  param protocol; parent→child postMessage). Surfaced during
  Unit 10's editorial review (2026-06-11). The article page
  could deep-link from a specific prose paragraph into the
  artifact's matching state ("click here to simulate this
  failure mode"), wiring read-then-interact down to the
  sentence level. Requires a new parent→child postMessage
  protocol (today's Unit 10 protocol is child→parent only,
  for telemetry). Gated on Tier 1 (Unit 10) shipping and
  showing meaningful artifact engagement first; building the
  deep-link infrastructure before the basic funnel is measured
  inverts effort and risk.
- **Tier 3: scroll-synced sticky artifact panel** (desktop-only,
  prototype on one article first). Surfaced during Unit 10's
  editorial review (2026-06-11). The artifact pins to the
  viewport while the reader scrolls through prose; the
  artifact's state updates to match the section the reader
  is currently reading. Higher-ambition variant of Tier 2;
  most engagement uplift potential and most implementation
  complexity. Explicitly gated on Tier 1's measured funnel —
  if `artifact_viewed` and `artifact_interacted` rates from
  Unit 10 indicate readers are already reaching and engaging
  with the bottom-of-page or mid-page artifact, Tier 3's
  return shrinks. Prototype on one article (likely the
  artifact-richest one, Uber Cinnamon) before generalizing.
- **Per-article OpenGraph card images.** Generated at build
  time from the article JSON (title + source + accent color).
  Replaces the single `public/og-default.png` fallback with
  per-article unfurls. Out of scope for Unit 10 (which is
  focused on the on-page reading arc + instrumentation);
  carries over from Unit 9's same-named follow-up.
- **Unit 7 (pipeline) and Unit 8 (orchestrator) — deferred
  indefinitely as of 2026-06-04.** The full architecture was
  scoped end-to-end (four stages, SQLite schema, Claude
  integration, draft-artifact handoff, twelve open questions) and
  preserved at `context/pipeline-architecture-deferred.md`. The
  decision rests on three reasons: (1) behindscale's quality bar
  is the editorial taste developed across the four hand-authored
  chat artifacts, and manual authoring keeps that taste applied
  consistently while pipeline-assisted authoring would risk drift
  toward generic structural extraction — at 4 articles the
  problem is habit formation, not scaling; (2) the pipeline is a
  3-4 week engineering investment whose payoff is back-loaded,
  and building it now would force a publication pause during the
  period when audience-building and cadence rhythm most need
  momentum; (3) the owner is committing to a sustained 3-article-
  per-week manual cadence (floor, not ceiling) and we reassess at
  the 8-week mark (counting from 2026-06-04) with real cadence
  and quality-consistency data. Revisit triggers: scaling
  friction shows up in the manual rhythm, or the 8-week
  reassessment surfaces a decision to scale through automation.
- **Post-Unit 3e — Edge-case fixtures for the pattern detail page.**
  Hand-author small fixture pattern definitions covering: uncategorized
  (no `category`), empty `whenItApplies`, very long `definition`. Each
  exercises a code path the current single sample (`atomic-phases`)
  doesn't reach. Deliberate fixture construction, not ambient variety.
- **Optional category filter on the pattern library index.** Out of
  scope for Unit 6 (single-source filter is the focused deliverable).
  Same shape would apply at `/patterns?category=resilience` if it
  proves useful at higher pattern counts.

## Open Questions

- **Source-equality constraint with `feeds.json`** (for Unit 6 / pipeline
  analyze stage). The `source` block embedded in each
  `content/articles/{slug}.json` must equal the `source` block in the
  corresponding `feeds.json` entry exactly — the pipeline copies it
  verbatim, never re-derives. This is how invariant 7 (official engineering
  blogs only) holds at the data level: if the source isn't in the
  allowlist, it can't appear on an article. Will be enforced by the
  analyze stage (Unit 7+) and ideally verified by the same build-time
  validator that catches orphan pattern slugs (Unit 4).
- Pipeline scheduling: the orchestrator (`npm run study`) is the daily
  command and is built regardless. Only the *scheduler* that auto-invokes it
  is open — GitHub Actions cron (runs in the cloud, commits results) vs local
  launchd/cron (runs on the laptop). Decide when reaching the CI stage; the
  orchestrator is designed so this choice is just "what calls the command."

## Architecture Decisions

- **Landing + navigation + SEO/crawler foundations phase
  locked** (2026-07-09, eight-commit sequence). Five
  decisions confirmed by the owner before implementation
  began (see Fable's handoff spec + the plan file at
  `/Users/akhilvij/.claude/plans/soft-greeting-pascal.md`
  for the full deliberation transcript):
  1. **Keep five pattern categories**
     (`resilience`/`throughput`/`consistency`/`performance`/
     `observability`). The spec's "exactly three
     categories" was an artifact of the handoff bundle's
     partial 7-pattern view of the world; the live library
     has always used five, and consolidating would erase
     real taxonomy distinctions (`throughput` is volume,
     `performance` is latency; `observability` is a real
     category held by `dead-mans-switch`). Governing
     principle: taxonomy is canonical, design accommodates
     it, never the reverse. Chip ramp expanded from 4 to
     5 mapped categories with `performance` → cat-orange
     added in Commit 1.
  2. **Hero artifact contract exemption named.**
     `content/artifacts/_hero.jsx` compiles like any
     artifact (bundled by scripts/compile-artifacts) and
     sandboxes like any artifact, but is deliberately
     exempt from the standalone-visitor context-block +
     article-backlink contract because a site-level
     artifact's context lives in its landing page, not
     inside its iframe. Signal for "site-level, contract-
     exempt": the `_hero` underscore prefix on the source
     filename. Named exemption in docs/behindscale-taste.md
     §6 so a future authoring pass doesn't "fix" the hero
     by adding a context block it shouldn't have.
  3. **Vercel `/?source=` 301 skipped**; a lightweight
     client-side redirect (`src/pages/CatalogRedirect.tsx`,
     mounted above `<Landing />` on `/`) rewrites legacy
     `/?source=<slug>` arrivals to `/catalog?source=<slug>`
     via useNavigate + `replace: true`. Rationale: low-
     traffic personal-project scope; SSR renders the
     component to an empty string so no flash. The Vercel-
     config alternative was not worth the extra
     surface.
  4. **`DefinedTermSet` placement + `@id` correspondence
     with real DOM anchors.** cruxTag DefinedTermSet
     inlined once on /catalog; pattern DefinedTermSet
     inlined once on /patterns. Article pages reference
     both by `@id` (TechArticle.about →
     `/catalog#term-<cruxTag>`; TechArticle.mentions →
     `/patterns#term-<slug>`). **Binding refinement**:
     the `@id` URLs must resolve to real in-page
     anchors, not dangling fragments -- so
     `src/pages/Catalog.tsx` group header wrappers emit
     `id="term-<slug>"` and `src/components/PatternCard.tsx`
     card wrappers emit `id="term-<slug>"`. One DOM
     anchor serves three jobs: (a) the JSON-LD `@id`
     target; (b) the article-page cruxTag chip's lateral
     link (Commit 7); (c) the landing preview's row link
     (Commit 5). Cross-page `@id` contract assertion pass
     in scripts/prerender.ts (Commit 6) refuses to ship
     structured data with dangling references -- verified
     0 dangling across the current library.
  5. **Design HTML use.** `design/Catalog.html` (288-line
     clean DOM) is the direct port target for the catalog
     page; `design/Landing.html` (1.2MB DesignCoded
     export with inlined fonts) is pixel reference only,
     with `docs/design-spec.md` §3/§4/§6 as the
     implementation source of truth for the landing
     layout.
  Additional guardrails baked in during implementation:
  * **Reconciliation surgery**: article JSONs and canonical
    docs were merged, not overwritten. Only the
    `cruxSummary` line was lifted from each handoff article
    into the live article; `addedAt`, backfilled
    `patterns[]`, updated `relatedArticles`, whitespace all
    preserved -- a wholesale copy would have silently
    reverted the round 4+5 landings.
  * **Verify-then-delete on the old index**: three-check
    gate (no importers, catalog is a genuine affordance
    superset, no residual behavior worth carrying)
    confirmed before removing `src/pages/ArticleIndex.tsx`
    and `src/components/SourceFilterChip.tsx`. Catalog's
    company filter is a strict superset (`Amazon (AWS)`
    now one chip instead of two source-slug chips).

- **crux + cruxTag taxonomy adopted; standalone-visitor
  artifact contract locked** (2026-07-06 → 07 editorial
  batch). Two structural additions to the content contract,
  landed together across a nine-commit batch that also
  doubled the library from 6 → 12 articles.
  - **crux** (required 2-4 sentences of near-source prose
    naming the article's bottleneck) and **cruxTag**
    (required lowercase-kebab-case slug naming the
    bottleneck *class*) sit between `summary` and
    `problem` on every Article. Rendered as THE CRUX
    callout on the article page immediately after
    `summary`. Validator: missing `crux` is an error;
    missing / non-kebab `cruxTag` is an error; there is
    NO uniqueness rule on cruxTag (reuse across articles
    is the entire point) and NO orphan rule (no cruxTag
    definition files exist — recurrence is derived by
    grouping articles on equal tags). Framework contract
    around the article-page arc: the crux is also
    compressed into every artifact's context-block
    PROBLEM line, keeping reader and cold-visitor entry
    points in sync by construction.
  - **Standalone-visitor artifact contract** — every
    artifact bundle ships two required elements: (1) a
    context block above the controls (THE PROBLEM / THE
    MOVE / TRY, expanded by default, HIDE/SHOW toggle;
    PROBLEM compresses the article's crux, MOVE names
    the artifact's answer in the artifact's own
    toggle/scenario language, TRY states the reading
    rule the interaction assumes); (2) a footer backlink
    to `https://behindscale.com/articles/<slug>` with
    `target="_blank"` so it works inside the sandboxed
    embed iframe. Compression-never-second-source: the
    block introduces no claims that don't already exist
    in the article. Teaser-truth enforced at block
    level: TRY line changes in the same commit as the
    interaction it describes. Rationale: artifact
    bundles have shareable standalone URLs and are
    routinely opened without the article, so the
    bundle must be self-contained enough to convert a
    context-free toy into a self-contained lesson.
    Locked in the docs commit's `architecture.md`
    invariant 2 amendment (Standalone-Visitor Contract
    paragraph) plus the new §6 subsection of the Taste
    Document.
  - Nine cruxTags at close, three of them two-company:
    `ambiguous-failure-under-retry` (Stripe + Shopify),
    `priority-blind-load-shedding` (Uber + Netflix),
    `partial-completion-under-crashes` (Skipper +
    Cadence — the first same-crux/opposite-solution pair).
    The taxonomy proves itself day one of the schema by
    construction, without needing the deferred
    `/bottlenecks` browsable surface.
  - Small AWS-side authoring fix during land: the AWS
    article shipped one stat with `placement: "summary"`,
    a value outside the locked
    `problem | solution | tradeoffs` enum; moved to
    `solution` (it's a solution-framing anyway) with a
    fuzzy-miss warning (`"3"` vs prose `"three tools"`)
    surfacing but not blocking, per the Uber-sprint chore's
    warning-not-error semantics. Recorded in the AWS
    publish commit's message.
- **Article #6 (Netflix prioritized load shedding) chosen
  on recurrence-driven sourcing grounds** (2026-06-18).
  First publication where the article was picked
  specifically because it would make two existing patterns
  recur across a second company, rather than because of
  its individual merit. The selection criterion was made
  operational by the Uber sprint's pattern-merge work,
  which authored `feedback-controlled-load-management`
  (and re-authored `priority-aware-load-shedding`) at a
  generality that anticipated a non-Uber embodiment --
  the merge's correctness depended on that generality
  bar holding. The Netflix article is the first real test
  of that bar; both patterns took the new embodiment
  without a single edit to their definition files. The
  decision rule going forward: when picking the next
  article, weigh the cross-pattern recurrence it would
  unlock (pattern jumps from one company to two, or two
  to three) alongside the article's standalone merit; the
  recurrence dimension is what makes the library
  compound, and is what a senior/staff reader is most
  likely to notice. A side effect of this article: a
  hosting-migration fix landed in the same publication
  series (Netflix Tech Blog moved from netflixtechblog.com
  to medium.com/@netflixtechblog at some point post-2018;
  the prior two commits used the legacy URLs, the fix
  commit landed canonical medium.com forms across feeds,
  the article, and the two predecessor prose URLs).
- **Discord article enrichment + capstone artifact view +
  five-article sprint closeout** (quality audit,
  2026-06-13). Unlike the four prior reworks, this article
  needed no fidelity rewrite -- the audit found Discord the
  library's reference standard. Additive changes only: a
  precision fix to problem ¶3 (the 2017 queue was Celery
  with Redis as the shard-mapping cache; the "Redis drops
  under pressure" failure is the 2025-era description, now
  phrased to not misattribute the 2017 design); a teaser
  matching the new view; three canonical Unit 10 stat
  values landed at last; a `relatedArticles` cross-link to
  the Airbnb monitoring article (the fault-isolation
  parallel the pattern note already names); a new
  EvolutionDiff artifact view -- the centerpiece -- made
  the default tab. The view turns the 2017->2025 evolution
  into a per-component before/after ledger (sharding
  PRESERVED in green; queue, bulk indexing, cluster
  topology, upgrades, largest-guild ceiling all REPLACED in
  indigo), with the failure math (~40% at 100 nodes) and
  the log4shell forcing-moment surfaced where they belong.
  The staff-level throughline: an architecture ages
  component by component; reaching a design's boundary is
  not the same as having chosen wrong; the choices that
  preserve your freedom to change are the ones worth
  getting right early. With this, the five-article sprint
  closes for real: every article verified, every artifact
  past the interaction bar, pattern library at 15
  all-general entries, two cross-company threads seeded
  (Stripe<->Uber, Discord<->Airbnb), and the prior Skipper
  docs commit's premature "complete" framing is corrected.
- **Skipper article rewrite + artifact rebuild** (quality
  audit, 2026-06-13). (The original framing of this entry
  included "sprint closeout"; the closer is actually the
  Discord entry above. The Skipper rework remains the
  deepest of the five reworks.) The deepest of the
  five reworks. Fidelity fixes: wrong `publishedAt`
  (2024-08-15 -> 2026-04-01); "MySQL or DynamoDB" as a
  routine state backend corrected to "MySQL or Airbnb's
  internal Unified Data Store (UDS)" (DynamoDB appears in
  the source only in the 10,000-workflows/sec throughput
  figure); a fabricated idempotency-key-derivation mechanism
  removed from the at-least-once tradeoff; a happy-path
  overclaim ("only activates persistence on crash/wait/error")
  corrected to the source's actual batched-checkpoint +
  delayed-timeout-task design. Enrichment: compensation
  (`@Compensate`, reverse-order undo) added, signals
  (`@SignalMethod`) added, the delayed-task safety net
  promoted to the core of the happy-path explanation,
  state-fields-vs-event-sourcing trade explicitly named in
  both solution and tradeoffs; tradeoffs expanded 5 -> 6.
  Artifact: the "Replay & Checkpoints" static code-reveal tab
  -- the library's weakest interaction by the craft standard
  locked in the Airbnb sprint -- replaced with a ReplaySim
  crash-and-replay simulator on the
  `ListingPublicationWorkflow` example. With this rework, the
  five-article quality sprint closes: every article in the
  library is source-verified, every artifact has at least one
  interaction that lets the reader trigger the article's
  claim rather than read it asserted, and the editorial bar
  is uniform across the library.
- **Airbnb article micro-fixes + artifact upgrade** (quality
  audit, 2026-06-13). Source verification of the original 5d
  dissection found this article the cleanest of the
  five-article audit: every figure, component, and the Dead
  Man's Switch chain verified against the source. Two
  micro-fixes lifted to a content commit: `publishedAt`
  corrected from 2026-05-12 to 2026-05-05 per the source's
  `article:published_time` meta tag; and a manufactured
  "four overlapping circular dependencies" count in the
  `circular-dependency-avoidance` pattern note replaced with
  "had overlapping circular dependencies" (the source never
  enumerates). All three of this article's pattern
  definitions (`fault-isolation`, `dead-mans-switch`,
  `circular-dependency-avoidance`) passed the post-Uber
  generality bar without changes -- none of them name
  implementations or company jargon.
- **Artifact as thesis demonstration, not thesis assertion**
  (Unit 11 quality sprint pt 3, 2026-06-13). Articulated
  during the Airbnb artifact upgrade and recorded here so it
  applies to future artifact craft reviews. An interactive
  artifact's signature surface should let the reader
  *trigger* the article's central claim, not read a static
  card that asserts it. The Airbnb article's thesis ("never
  let your safety mechanism depend on the thing it's
  protecting") had no interactive demonstration -- the
  original Problem tab showed a hard-coded dependency-loop
  card. The new FailureSim collapses thesis into interaction
  via a 2-by-4 outcome matrix (architecture x failure
  injection), where the reader picks the same failure under
  the before- and after-architectures and sees the page
  outcome diverge. The pedagogically load-bearing cell is
  After + observability-stack-fails: even with full
  isolation, the stack itself can die, and the Dead Man's
  Switch is the cell that turns the silence into a page --
  the artifact teaches WHY the DMS exists rather than just
  THAT it exists. Generalizable rule for the next artifact
  review: if every tab is "click an option to see a
  tradeoff" or "explore some state," the artifact is a
  diagram, not a simulation. At least one tab should let the
  reader break the thing.
- **Uber article fidelity fixes + pattern merge** (quality
  audit, 2026-06-12). Source verification of the original 5e
  dissection (against
  `https://www.uber.com/blog/from-static-rate-limiting-to-intelligent-load-management/`)
  found: a dead source URL (the post lives at the
  `from-static-rate-limiting-…` path; the
  `/blog/intelligent-load-management/` slug in the article
  404s); wrong `publishedAt` (the 2024-11-21 date belonged to
  Uber's separate Cinnamon post, not this article); "Helix"
  where the source says Schemaless; two fabricated example
  figures (15ms → shed 50%, 10ms P90 target — neither in the
  source, whose example is a fixed wait "like 5
  milliseconds"); understated scale ("millions" → "tens of
  millions" requests per second across "thousands of
  clusters"); and one tradeoff that inverted the source's
  claim (Cinnamon advertises no per-service tuning; the
  honest tradeoff is that calibration concentrated at the
  platform level, paid once centrally). PID-term material
  from Uber's companion posts is now attributed in prose by
  name per the same convention the Stripe rework locked in.
  Pattern merge: `pid-controlled-adaptive-thresholds` and
  `byos-platform-design` retired into
  `feedback-controlled-load-management` — pattern names must
  survive without naming an implementation (PID) or a
  company's jargon (BYOS); both live on as Uber's
  instantiations in the article's pattern note. Old slugs
  308-redirect. Library: 15 patterns, all general.
- **Validator framework: warning vs. error severity is
  first-class** (Unit 11 quality sprint pt 2, 2026-06-12).
  `CheckError.severity` is now an optional field on the
  framework contract (`'error' | 'warning'`, default
  `'error'`). The validator runner tracks errors and warnings
  separately; warnings surface in the same output format with
  a `(warning)` tag, but only errors flip the exit code. The
  immediate driver is the `stats-value-in-prose` check, whose
  Unit 10 docs commit said "flag, don't block, on fuzzy
  misses" but whose implementation shipped as exit-1 — the
  framework now supports the docs-commit intent, and the
  stats check uses it for the value-in-prose miss (structural
  rules like max-3 stay hard errors). Other checks
  (orphan-pattern-slugs, minimum-pattern-coverage,
  artifact-path-matches-slug) keep their hard-error semantics
  by omitting the field. The pattern is now available the
  next time a check needs "surface but don't block": the
  framework no longer forces every editorial discipline into
  the binary build-passes/build-fails choice when the right
  answer is a human-eyeballed warning.
- **Stripe seed article reworked to source** (quality audit,
  2026-06-12). The original stripe-idempotency dissection
  (Unit 3f, the site's seed article) included mechanism detail
  — atomic phases, recovery points, the Rocket Rides
  walkthrough — imported from Brandur Leach's *personal blog*
  series rather than the attributed official post, which
  predated the project's fidelity discipline. Rewritten
  sourced exclusively from `stripe.com/blog/idempotency`:
  failure taxonomy, HTTP idempotent-verb semantics,
  idempotency keys and their per-failure-case resolution, and
  exponential backoff with jitter. Pattern references
  corrected: `atomic-phases` removed (one supporting sentence
  in the source is not an embodiment) and rehomed to
  `skipper-workflow-engine`, where checkpointed Actions are a
  true instance; `retry-with-backoff-and-jitter` added as a
  new library pattern (synthesized across Ethernet CSMA/CD,
  TCP, AWS SDK retry policies, gRPC + Envoy). Artifact rebuilt
  from the actual source's material. `publishedAt` corrected
  (2017-02-22). First use of `updatedAt`. The deeper
  recovery-point material remains valuable but has no
  qualifying first-party source; it returns if and when one
  exists.
- **Article reading arc: artifact between Solution and Tradeoffs**
  (Unit 10, 2026-06-11). Section order on every article page is
  `header → top pattern chips (wayfinding) → summary → artifact
  teaser → Problem → Solution → [ARTIFACT EMBED] → Tradeoffs →
  Patterns (full)`. Rationale: the learning arc is
  understand-problem → understand-solution → interact → read
  tradeoffs with hands-on intuition. Tradeoffs land harder after
  the reader has toggled a failure mode themselves; the full
  patterns section stays last as the zoom-out beat. The width
  discontinuity (720 px prose → 960 px artifact breakout →
  720 px prose) is by design, matching the Stripe Docs / Notion
  precedent; recorded here so the visual judgment isn't
  re-debated when someone proposes containing the artifact at
  720 px later. Locked in `architecture.md` Article Reading Arc
  section.
- **Editorial discipline: stats are a lift, not a source**
  (Unit 10, 2026-06-11). Article.stats[] is a strict editorial
  surface: at most 3 per article, every value must appear in
  the article's own prose (problem/solution/tradeoffs/summary).
  Zero is fine — an article without strong figures ships
  without callouts rather than with weak ones. The
  `stats-value-in-prose` validator check (the fourth, joining
  orphan-pattern-slugs / minimum-pattern-coverage /
  artifact-path-matches-slug) enforces both constraints with
  best-effort normalization (strip `+`, `%`, `,`, whitespace;
  lowercase) so `+80%` matches "80 percent" and `3.1 s`
  matches `3.1s`. Flag, don't block, on fuzzy misses. Locks
  the same pattern as the previous editorial-rigor checks:
  the validator is the enforcement layer; the prose is the
  source of truth. The teaser card follows the same shape:
  no generic fallback, specificity over presence.
- **Artifact interaction telemetry uses postMessage**
  (Unit 10, 2026-06-11; instantiates the Unit 5 "never loosen
  sandbox, widen postMessage" decision). The
  `artifact_interacted` analytics event fires on first
  pointerdown inside the artifact iframe and is delivered via
  `window.parent.postMessage({ type: 'artifact:interacted',
  slug })` with target origin `'*'`. The cross-origin design
  is mandatory, not preferential: the iframe sandbox is
  `allow-scripts` *without* `allow-same-origin` (architecture
  invariant 2 — locked in Unit 5b), which gives the iframe an
  opaque origin (`event.origin === "null"` on the parent
  side). Parent gating uses **source comparison**
  (`event.source === iframeRef.current?.contentWindow`), not
  origin comparison — an origin allowlist would be meaningless
  when every sandboxed message arrives with origin `"null"`.
  The brief's original proposal (read `iframe.contentDocument`
  for a pointerdown listener) is structurally impossible
  under this sandbox; surfaced during scope review and folded
  in before the feat commit, with a smoke test step that
  would have caught it shipping silently.
- **Two-column article layout — rejected** (Unit 10,
  2026-06-11). Evaluated during the editorial review that
  produced Unit 10. Rejected: artifacts are designed for
  ~960 px and break at half-column widths; reading and
  simulating are competing cognitive modes; mobile is
  unaffected either way (single-column at both widths).
  Recorded here so the rejection isn't re-litigated from
  scratch the next time a "reading + interactive side by
  side" proposal surfaces.
- **Analytics is a progressive enhancement, not content**
  (Unit 10, 2026-06-11; Vercel Analytics free tier). Mounted
  client-only, never invoked during SSR or referenced in
  render paths. The framing is the same class as the
  artifact iframe HEAD probe — runtime network activity for
  *enhancements*, not for content delivery. Invariant 1's
  Unit 9 wording ("content available without runtime
  computation") is untouched: analytics events are not
  content, so the no-runtime-computation property still
  holds for everything Google or any other crawler indexes.
  Pre-defends the next invariant-1 revisit.
- **Rendering: per-route SSG at build time** (Unit 9, 2026-06-11).
  The website renders to one HTML file per known route at build
  time via `scripts/prerender.ts`, using `react-dom/server`'s
  `renderToString` + `react-router-dom`'s `StaticRouter`,
  templating off `dist/index.html` to inherit Vite's already-
  injected asset paths and stylesheet links. The same components
  run again at runtime via `hydrateRoot` + `BrowserRouter` for
  interactivity. Implementation: ~200 lines of glue over
  first-party primitives. Rationale: matches the content's actual
  shape (fully known at build time) better than the SPA model did;
  produces real HTML for crawlers, link-preview unfurlers, screen
  readers, and accessibility tools; aligns with invariant 1's
  spirit (content available without runtime computation, not just
  without runtime fetch). The `architecture.md` Rendering section
  documents the full contract including defensive properties,
  JSON-LD field map, sitemap derivation, and deploy semantics.
- **vite-react-ssg evaluated, rejected** (Unit 9, 2026-06-11).
  A community-maintained Vite SSG library for React
  (`Daydreamer-riri/vite-react-ssg`, v0.9.0, single maintainer,
  pre-1.0). Technically viable for our exact stack — Vite 5 +
  React 18 + react-router-dom v6 — with a clean `<Head>`
  primitive (react-helmet-async wrapper), configurable emit
  shape (`dirStyle: 'flat'` matches our trailing-slash policy),
  and `includedRoutes` enumeration matching `articleBySlug` /
  `patternBySlug`. Rejected on two grounds: (1) single-maintainer
  pre-1.0 beta on a load-bearing path concentrates upgrade-cycle
  risk on a third party we don't control; (2) the custom-prerender
  alternative, once simplified by templating off `dist/index.html`
  and skipping the head-context library, lands at ~200 lines of
  glue over first-party primitives (`react-dom/server`,
  `react-router-dom`'s StaticRouter, Node `fs`) — a stronger
  dependency position than the library trade-off implied at first
  read. Revisit if the custom script's upgrade cost exceeds
  expectations at the next React or Vite major (failure case:
  hydration semantics or SSR globs break in a way our script
  can't paper over with a small patch). The library remains a
  contained fallback — same emit shape, same `vercel.json`, same
  hash shim, same JSON-LD — so the migration cost in that
  scenario is bounded.
- **Static site, no DB/auth on the website.** The site renders only
  pre-generated files; all dynamic work is in the build-time pipeline.
  Rationale: a personal/public learning library has no per-user state needs;
  static is cheaper, simpler, and faster, and deploys free.
- **Two decoupled sub-systems: pipeline and website**, communicating only
  through generated files (the content contract). Rationale: clean separation
  of build-time vs render-time concerns; mirrors the "colocate logic with
  state / clear boundaries" lessons from the studied blogs.
- **Artifacts rendered in sandboxed iframes**, one self-contained bundle
  each. Rationale: auto-generated artifacts will occasionally be malformed;
  iframes isolate failures so one bad artifact can't break the build or other
  artifacts. This is the fault-isolation pattern from the Airbnb monitoring
  study, applied to our own system.
- **Light editorial reading shell + dark technical artifacts.** Rationale:
  long-form reading is most comfortable on a light, high-whitespace surface
  (Stripe docs / Linear style); the dark interactive artifacts gain hierarchy
  and a "lab" feel by contrast.
- **Official engineering blogs only (allowlist-enforced).** Rationale:
  signal quality is the whole point of the library. First-party engineering
  writeups from the team that actually built the system are dense, accurate,
  and full of real tradeoffs. Personal blogs, third-party summaries, and
  aggregators dilute that signal — they often paraphrase official posts with
  less depth, vary wildly in quality, and create dedup noise. The allowlist
  in `content/feeds.json` is the single source of truth for what counts.
- **Dual-axis navigation: articles and patterns are equally first-class.**
  The home page is the article feed (the daily reading surface), and the
  pattern library at `/patterns` is the durable-knowledge surface, with a
  prominent pattern detail page per pattern. Articles reference patterns by
  canonical slug; patterns list their articles. Bidirectional integrity is
  enforced at build time (invariant 8). Rationale: the stated mission is to
  build durable, transferable system design intuition — patterns are the
  takeaway, articles are the evidence. But the daily-reading ritual is real,
  so the article feed remains the primary entry point. Pure pattern-first
  navigation would bury fresh articles; pure article-first would relegate
  the pattern library to a footnote. Both axes get their own surface.
- **Pattern definitions are authored, not auto-generated.** The pipeline
  may *propose* new pattern slugs when it sees something recurring, but
  pattern definition files in `content/patterns/{slug}.json` are hand-written
  or hand-reviewed. Rationale: the synthesis across articles is where the
  learning compounds; auto-derived definitions from a single article tend
  to be too narrow and miss the cross-article generality that makes a
  pattern useful.
- **Pipeline metadata in SQLite; published content as committed JSON/JSX.**
  Rationale: control-flow/dedup state belongs in a queryable store; durable
  published content belongs in version control for auditability.
- **Prompts treated as versioned code** under `pipeline/prompts/`. Rationale:
  artifact/summary quality depends on prompt quality; it must be reviewable
  and improvable over time.
- **Hash-based routing** (`react-router-dom` with `HashRouter`).
  **SUPERSEDED by Unit 9 (2026-06-11; see "Rendering: per-route SSG"
  above). The premise of this decision — GitHub Pages SPA-routing
  compatibility — expired when hosting moved to Vercel in Unit 3f.
  SEO surfaced the cost of not revisiting on 2026-06-11: crawlers
  and link-preview unfurlers saw the empty SPA shell for every URL,
  making the whole library invisible to organic discovery and
  shareability. The evolution-not-revision framing applies: the
  original choice was right for its stated premise, the premise
  changed, and the cost compounded silently until an external signal
  made it visible. Original rationale preserved below for the
  record.** Rationale:
  GitHub Pages does not natively serve SPA routes under browser history —
  visiting `/articles/foo` directly returns 404 unless we add a `404.html`
  redirect shim, which is fragile. Hash routes (`#/articles/foo`) are served
  identically on local dev and Pages with zero config. The aesthetic cost
  (visible `#`) is minor and acceptable for a learning site. Locks in
  consistent behavior across environments.
- **esbuild for compiling artifact bundles.** Each `.jsx` artifact is
  compiled to a self-contained ESM bundle and wrapped in a minimal HTML
  shell, one bundle per article under `public/artifacts/{slug}/`. Rationale:
  esbuild is fast, handles JSX/TSX out of the box, has near-zero config, and
  produces standalone bundles suitable for iframe embedding. Alternatives
  (Vite library mode, Rollup) are heavier without providing additional value
  for this use case. The bundler is invoked from the pipeline's `generate`
  stage; the website does not import esbuild.
- **Article `artifact` pointer as discriminated null** (`{ path: string } | null`
  rather than `{ path, hasArtifact: boolean }`). Rationale: missing-artifact
  is a data state, not a filesystem inference — encoding it as `null`
  rather than a 404 keeps the iframe loader's "skip + flag on bad entry"
  path deterministic (invariant 6) and leaves room for summary-only
  articles without a special case. The discriminated form makes the
  invalid state `{ path: "/x", hasArtifact: false }` unrepresentable,
  which the boolean-plus-path shape cannot prevent.
- **Canonical pattern categories — four locked in, additive via
  two-step docs-then-code change.** `resilience` (blue), `consistency`
  (purple), `throughput` (green), `observability` (cyan). The remaining
  `--cat-*` ramp tokens (`orange`, `red`, `amber`) are reserved
  headroom; assigning one to a new category is a `docs:` commit
  updating architecture.md's Canonical pattern categories table first,
  then a `feat:` commit wiring the slug into `PatternChip.CATEGORY_CLASSES`.
  Rationale: prevents pattern definitions from being authored against a
  category slug the website doesn't know how to color, and keeps the
  ramp from sprawling into a deep taxonomy. Uncategorized patterns (no
  `category` field) stay valid via the neutral-chip path.
- **Prose-field rendering contract — paragraph-separated plain text,
  markdown deferred to Unit 7+.** `Article.problem`, `Article.solution`,
  and `PatternDefinition.definition` are typed as plain strings split
  on blank lines into `<p>` chunks (the `Prose` component). When the
  first real Claude output lands (Unit 7+, analyze stage), `Prose`
  swaps for a real markdown renderer (likely `react-markdown`) with no
  consumer changes — Article/Pattern detail pages keep importing
  `Prose` and the URL shape, prop surface, and rendering contract stay
  identical. Rationale: ship a working contract today rather than
  picking a renderer speculatively; the renderer swap is a one-component
  change.
- **Artifact accent colors are not bound to the category color ramp.**
  `PatternChip` strictly follows the category ramp from architecture.md
  — wayfinding benefits from consistency, so the same category always
  reads the same color across every chip on every page. Artifacts pick
  whatever accent best suits their specific visualization: 5b's Stripe
  artifact uses indigo (not a category color); 5c's Skipper artifact
  uses green (which *is* the throughput category color, but Skipper is
  mostly resilience/throughput, not throughput's pure case). Rationale:
  chips are navigation surfaces where consistency aids recognition;
  artifacts are destinations where variety aids differentiation between
  the small number of artifacts a reader sees in one session. The
  decoupling lets artifact authors pick colors that read well against
  the dark token palette without being constrained by category
  semantics that don't cleanly apply to the artifact-as-a-visualization.
  Prevents future artifacts from re-litigating this — accent choice is
  artifact-local and free.
- **`feeds.json` lives at `content/feeds.json`** (Unit 6, Option A).
  The website needs to read the allowlist for the source filter, and
  importing from `pipeline/` would breach invariant 3 (the only
  permitted cross-boundary surface is type-only imports from
  `src/types/`). Moving the file to `content/` resolves the boundary
  cleanly: the website reads from one place (`content/`), the
  pipeline reads the same file from `content/feeds.json`, nothing
  else changes. Forecasted in the open questions block since Unit 3b
  and locked here. Pipeline references in architecture.md update
  in the same Unit 6 feat commit.
- **Filter UI chip derivation principle — navigation surfaces filter
  by realized content; informational surfaces describe intended
  scope.** Source filter chips on the article index derive from
  `articles[*].source` (only sources with at least one article),
  *not* from the full `content/feeds.json` allowlist. A chip for a
  source the library doesn't yet cover reads as broken at small
  library sizes. When the gap matters — likely with a future
  "Sources we track" page — that page reads `content/feeds.json` as
  its truth. Same principle applies to any future filter
  (categories, tags, companies): the navigation chip shows what's
  reachable; the informational page describes what's tracked.
- **Filter chip ordering — alphabetical by display name,
  deterministic.** Don't order by article count or iteration order.
  Count-based ordering creates visual jitter when a new article
  from a less-represented source reorders chips; iteration order
  isn't deterministic across reloads. Alphabetical is the safer
  default. Change deliberately later if a different order emerges
  as obviously better at higher article counts.
- **Validator check parity: artifact-path-matches-slug as
  enforcement (Unit 6).** Every article with `artifact !== null`
  must have `artifact.path === '/artifacts/' + slug + '/index.html'`.
  Convention since Units 5/5b/5c; enforced from Unit 6 onward as a
  build-time check in `scripts/checks/`. The Unit 4 framework
  makes this one file + one entry in `CHECKS`. Closes the
  convention-vs-enforcement gap before the fourth artifact backfill
  can silently break it.
- **Source filter URL shape — query string, `/?source=<slug>`.**
  `SourceAttribution variant="card"` already emits this URL; the query
  string is currently inert and becomes effective when Unit 6 wires the
  filter on the article index. Rationale: keeps `/` as the canonical
  route, composes naturally with future category/tag filters via
  additional query params, easy to share, no UX cost over a dedicated
  `/sources/<slug>` route.
- **Hand-written type-guard predicates over Zod (for now).** Schema
  validation predicates live in `src/types/predicates.ts` — a
  non-barrel-exported sibling of the type files. They're consumed by
  both vitest schema tests (via the boolean `isXxx` wrappers) and the
  build-time content validator (via the field-level `checkXxx`
  functions that return `Result` objects). The barrel
  (`src/types/index.ts`) stays type-only, so the website's main bundle
  is unaffected. Rationale for hand-written: at this stage the
  validation surface is small (one consumer per side); shipping a
  runtime validation library would be premature. Zod (or similar) will
  be introduced when the pipeline's analyze stage needs to validate
  Claude's JSON output before writing to `content/`.
- **Invariant 8 expansion — minimum-2-pattern coverage** (architecture.md).
  Every article must reference at least 2 patterns; below-threshold
  articles fail the build. Rationale: behindscale's mission is
  transferable-patterns synthesis across companies, and the library's
  value compounds through cross-article overlap. Single-pattern articles
  are case studies, not library entries. The validator (Unit 4) is the
  enforcement layer; the analyze stage's Proposed Pattern Queue
  (Unit 7+) is the upstream mechanism that produces well-grounded
  articles.
- **Proposed Pattern Queue — analyze stage's strip-and-log mechanism**
  (architecture.md, new section). The analyze stage splits each
  candidate `patterns[]` entry into grounded references (slug has a
  definition → stays on the article) and proposed references (slug has
  no definition → stripped + logged to
  `pipeline/proposed-patterns.json`). Three publish states — Published,
  Blocked, Rejected — cover the case where stripping drops an article
  below the invariant-8 minimum. Blocked articles land in
  `pipeline/blocked-articles.json` and don't enter `content/`. The
  validator (Unit 4) only ever sees articles with fully grounded
  references; new pattern definitions enter the library through a
  deliberate authoring gate. **Deliverable in Unit 7+** (analyze
  stage); the architecture lands now so Unit 7 doesn't redebate.
  Principle: validator enforces shape integrity; analyze stage makes
  authoring decisions.

## Session Notes

- Domain `behindscale.com` has been acquired by the owner; deployed to
  Vercel with the domain configured as a custom alias (DNS managed at the
  registrar). **Production URL: https://www.behindscale.com** (apex
  `behindscale.com` 301-redirects to www). Deploy went live 2026-05-29
  (Unit 3f). Production smoke (`npm run test:e2e:prod`) green at the
  time of recording: 1/1 in 6.6 s end-to-end (full four-route walk
  against the live URL, no local build).
- The owner is studying system design by dissecting engineering blogs; this
  project automates and publishes that workflow. The studied patterns so far
  (workflow durability, idempotency/atomic phases, fault isolation /
  dead-man's-switch, priority-aware load shedding / PID control) are good
  candidates to seed the initial pattern library.
- Owner uses Claude Code locally; this repo is intended to be built with it
  following the spec-driven workflow in ai-workflow-rules.md.
