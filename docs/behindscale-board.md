# behindscale — Board Ledger

Shared coordination state between the authoring agents. This document
prevents collisions; the taste document (`behindscale-taste.md`) holds
style and authoring law. Precedent notes still go to the taste doc;
every board-state change goes HERE.

## Maintenance protocol

- The owner ferries the freshest copy of this ledger to each agent at
  session start and assigns round numbers. The copy you receive
  supersedes anything you remember.
- At round end, the authoring agent updates every affected section
  (classes, patterns, sources, companies, accents, rounds) and adds a
  round-log row. That update is the round's sync commit — a round is
  not done without it.
- Never mint a cruxTag or pattern that could overlap anything listed
  here (live, authored, or pending). Possible overlap = OWNER CALL
  flag in DECISIONS, not a mint.
- Status vocabulary: LIVE (deployed to production), AUTHORED (round
  zip delivered, not yet published), PENDING (exists conditionally —
  e.g. a mint awaiting merge-or-discard). As of the 2026-07-25 audit,
  every round through r29 is LIVE (the implementation agent has been
  pushing each round to `main`, which Vercel deploys automatically).

## Board summary (as of round 29, audited 2026-07-25)

38 articles LIVE across 21 sources · 13 crux classes · 50 pattern
definitions · 38 artifacts. Live counts audited directly from
`content/`, `feeds.json`, and `cruxtags.json`.

## CruxTag registry (13 classes)

Membership derived from live `content/articles/*.json` (`cruxTag` field).

| # | cruxTag | companies | members |
|---|---------|-----------|---------|
| 1 | ambiguous-failure-under-retry | 5 | Airbnb (Orpheus), Amazon (AWS) (idempotent-APIs), Segment (exactly-once), Shopify (resilient payments), Stripe (idempotency) |
| 2 | buffer-degrades-under-backlog | 5 | DoorDash (RabbitMQ→Kafka), Meta (FOQS), Segment (Centrifuge), Slack (job queue), Uber (consumer proxy) |
| 3 | single-cluster-scaling-ceiling | 4 | Airbnb (partitioning main DB), GitHub (partitioning relational DBs), GitLab (decomposition), Slack (Vitess) |
| 4 | single-table-scaling-ceiling | 4 | Canva (media→DynamoDB), Figma (postgres sharding), Notion (postgres sharding), Pinterest (mysql sharding) |
| 5 | priority-blind-load-shedding | 4 | Amazon (AWS) (load-shedding doctrine), Netflix (prioritized shedding), Stripe (rate limiters), Uber (intelligent load management) |
| 6 | blast-radius-scales-with-cluster-size | 3 | Amazon (AWS) (shuffle sharding), Discord (trillions message search), Shopify (pods architecture) |
| 7 | gray-failure-defeats-automatic-detection | 3 | Cloudflare (byzantine failure), Meta (silent data corruption), Slack (cellular architecture) |
| 8 | observer-shares-fate-with-observed | 3 | Airbnb (monitoring reliably), Datadog (incident-response deep dive), Roblox (return to service) |
| 9 | partial-completion-under-crashes | 3 | Airbnb (Skipper), Netflix (Conductor), Uber (Cadence) |
| 10 | mitigation-scoped-narrower-than-failure | 1 | DoorDash (Aperture) |
| 11 | retry-amplified-overload | 1 | Amazon (AWS) (timeouts-retries-backoff-jitter) |
| 12 | degraded-state-outlives-its-trigger | 1 | Slack (2-22-22 incident) |
| 13 | unrecorded-config-outlives-its-authors | 1 | Reddit (Pi-Day outage) |

Open class quests: grow any singleton with a bar-clearing first-party
source. The `retry-amplified-overload` DoorDash June-2021 postmortem
remains a shelved candidate fill (see the exhausted-candidates list
below for what's off the table).

## Pattern registry (50 patterns)

Company counts derived from live `content/articles/*.json`
(`patterns[].slug` field, dedup by `source.company`).

| pattern | category | articles / companies | notes |
|---------|----------|----------------------|-------|
| application-layer-sharding | throughput | 4 / 4 | Discord, Figma, Notion, Pinterest |
| atomic-phases | consistency | 3 / 2 | Airbnb + Amazon (AWS); r19 mint, pole pair w/ designated-source-of-truth |
| batched-routing-by-destination | throughput | 1 / 1 | Discord |
| cell-architecture | resilience | 3 / 3 | Discord + Shopify + Slack; r22 conditional resolved to RECUR |
| checkpoint-bounded-scans | performance | 1 / 1 | Meta |
| choreography-vs-orchestration | resilience | 1 / 1 | Netflix; r13 mint, category-strain flag |
| circuit-breaker | resilience | 3 / 3 | DoorDash, Meta, Shopify |
| circular-dependency-avoidance | resilience | 2 / 2 | Airbnb, Roblox |
| compile-time-boundary-enforcement | consistency | 1 / 1 | GitHub |
| conservative-auto-remediation | resilience | 2 / 2 | Cloudflare + Slack (r28 anti-instance) |
| content-free-change-events | consistency | 1 / 1 | Canva; r23 mint; composes w/ designated-source-of-truth |
| database-as-a-queue | resilience | 1 / 1 | Segment; r16 mint; pole pair w/ selective-acknowledgment |
| dead-letter-queue | resilience | 1 / 1 | Uber; r20 mint |
| dead-mans-switch | observability | 1 / 1 | Airbnb; boundary vs independent-observability |
| deadline-propagation | resilience | 1 / 1 | Amazon (AWS); r24 mint |
| designated-source-of-truth | consistency | 1 / 1 | Segment; r21 mint; pole pair w/ atomic-phases |
| durable-front-buffer | resilience | 1 / 1 | Slack |
| durable-workflows | resilience | 3 / 3 | Airbnb, Netflix, Uber |
| embedded-vs-centralized-orchestration | resilience | 3 / 3 | Airbnb, Netflix, Uber |
| fault-isolation | resilience | 14 / 12 | Most-recurring pattern; Airbnb, Amazon (AWS), Cloudflare, Datadog, Discord, GitHub, Meta, Netflix, Roblox, Segment, Shopify, Slack, Uber |
| feedback-controlled-load-management | resilience | 4 / 4 | DoorDash, Netflix, Stripe, Uber |
| fetch-execute-decoupling | throughput | 1 / 1 | DoorDash; r27 mint; pole pair w/ selective-acknowledgment |
| generic-mitigation | resilience | 3 / 3 | Cloudflare, Shopify, Slack; arc: improvised → pre-positioned → rehearsed |
| hibernation-vs-polling | performance | 1 / 1 | Airbnb |
| hot-data-first-migration | throughput | 1 / 1 | Canva; r23 mint |
| id-encoded-placement | throughput | 1 / 1 | Pinterest; r15 mint; pole pair w/ sharding-behind-a-proxy |
| idempotency-keys | consistency | 6 / 5 | FIRST five-company pattern; Airbnb, Amazon (AWS), Segment, Shopify, Stripe (r21 landing) |
| independent-observability | observability | 3 / 3 | Airbnb, Datadog, Roblox; r17 canonical three-company mint |
| known-answer-testing | observability | 1 / 1 | Meta; r26 mint; boundary vs health checks + vs independent-observability |
| layered-admission-control | resilience | 2 / 2 | Amazon (AWS), Stripe; r14 mint, r24 second company |
| load-bearing-cache | resilience | 2 / 2 | Reddit, Slack; r28 mint, r29 second company one round later |
| logical-physical-migration-split | consistency | 3 / 3 | Airbnb, Figma, GitHub |
| loose-foreign-keys | consistency | 1 / 1 | GitLab; r25 mint; company-coinage kept per SACK precedent |
| master-only-reads | consistency | 2 / 2 | Airbnb, Pinterest; r15 canonical two-company mint |
| no-uncommitted-config | resilience | 1 / 1 | Reddit; r29 mint; boundary vs violation-ratchet |
| priority-aware-load-shedding | resilience | 6 / 6 | Amazon (AWS), DoorDash, Netflix, Slack, Stripe, Uber — 6-company breadth |
| queue-with-guaranteed-delivery | resilience | 3 / 3 | Discord, Meta, Slack |
| rehearsed-restore | resilience | 1 / 1 | Reddit; r29 mint |
| replica-promotion-split | consistency | 1 / 1 | Airbnb; r7 mint |
| retry-budget | resilience | 1 / 1 | Amazon (AWS) |
| retry-with-backoff-and-jitter | resilience | 4 / 4 | Airbnb, Amazon (AWS), Segment, Stripe |
| retryable-error-classification | resilience | 2 / 2 | Airbnb, Amazon (AWS); r12 mint, r19 second company |
| selective-acknowledgment | throughput | 1 / 1 | Uber; r20 mint (TCP SACK name kept); pole pair w/ fetch-execute-decoupling |
| shard-key-colocation | throughput | 2 / 2 | Figma, Notion |
| sharding-behind-a-proxy | throughput | 1 / 1 | Slack; r22 mint; pole pair w/ id-encoded-placement |
| shuffle-sharding | resilience | 1 / 1 | Amazon (AWS); r9 mint |
| single-writer-ownership | throughput | 3 / 2 | Segment, Slack; r16 mint, r22 second company (retirement story) |
| throttled-readmission | resilience | 1 / 1 | Roblox; r8 mint |
| universal-staged-rollout | resilience | 6 / 6 | Canva, Datadog, DoorDash, GitLab, Reddit, Slack — six consecutive migration recurrences (see item 17 in open-decisions for page-ordering curation) |
| violation-ratchet | consistency | 1 / 1 | GitLab; r25 mint; category-strain flag (process-pattern, owner ruling pending — item 16 in open-decisions) |

### Retired pattern names (do NOT reuse)

- `pid-controlled-adaptive-thresholds` — retired
- `byos-platform-design` — retired (Uber jargon; re-minted and retracted at r11 for DoorDash Aperture)

Retired-names pre-flight is required before any new mint.

## Sources (21 in `content/feeds.json`)

Every source below has at least one live article. `slug` matches
`article.source.slug`; `company` matches `article.source.company` (a
minor cosmetic divergence for AWS uses "Amazon (AWS)" — enforce this
at authoring time; two r19/r24 articles were normalized 2026-07-25).

| # | name | slug | company |
|---|------|------|---------|
| 1 | Amazon Builders' Library | amazon-builders-library | Amazon (AWS) |
| 2 | Airbnb Engineering | airbnb-engineering | Airbnb |
| 3 | Canva Engineering Blog | canva-engineering | Canva |
| 4 | The Cloudflare Blog | cloudflare-blog | Cloudflare |
| 5 | Datadog Engineering Blog | datadog-engineering | Datadog |
| 6 | Discord Engineering | discord-engineering | Discord |
| 7 | DoorDash Engineering Blog | doordash-engineering | DoorDash |
| 8 | Engineering at Meta | meta-engineering | Meta |
| 9 | Figma Blog | figma-blog | Figma |
| 10 | The GitHub Blog | github-blog | GitHub |
| 11 | GitLab Blog (Engineering) | gitlab-engineering | GitLab |
| 12 | Netflix Technology Blog | netflix-techblog | Netflix |
| 13 | Notion Blog | notion-blog | Notion |
| 14 | Pinterest Engineering Blog | pinterest-engineering | Pinterest |
| 15 | r/RedditEng | reddit-eng | Reddit |
| 16 | Roblox Blog | roblox-blog | Roblox |
| 17 | Segment Blog | segment-engineering | Segment |
| 18 | Shopify Engineering | shopify-engineering | Shopify |
| 19 | Slack Engineering | slack-engineering | Slack |
| 20 | Stripe Engineering | stripe-engineering | Stripe |
| 21 | Uber Engineering | uber-engineering | Uber |

New sources: add here with slug + feed URL when first used, and
insert into `content/feeds.json` in first-real-word alphabetical order.

## Company article counts (concentration table)

| articles | companies |
|----------|-----------|
| 4 | Airbnb, Amazon (AWS), Slack |
| 3 | Uber |
| 2 | DoorDash, Meta, Netflix, Segment, Shopify, Stripe |
| 1 | Canva, Cloudflare, Datadog, Discord, Figma, GitHub, GitLab, Notion, Pinterest, Reddit, Roblox |

**Company concentration (owner's rule)**: crossing the highest existing
per-company article count requires an explicit DECISIONS sentence
naming the recurrence value a new-company article could not deliver.
The 4-article ceiling currently belongs to Airbnb (Orpheus r12,
owner-approved precedent), Amazon (AWS) (load-shedding r24), and
Slack (2-22-22 r28). Uber sits one below at 3.

## Accent registry (chrome colors)

LAW stays in the taste doc: accents are chrome only, never verdict
colors; corridor collisions are flagged at assignment; the owner
registry pass over crowded corridors is a standing open item
(open-decisions item 3, nine unresolved conflicts).

Extracted directly from `content/artifacts/*.jsx` on 2026-07-25.

| article | accent | notes / flags |
|---------|--------|---------------|
| airbnb-monitoring-reliably-at-scale | #06B6D4 cyan | pre-r12; uses semantic red/green as verdict colors (compliant) |
| airbnb-orpheus-idempotent-payments | #FF5A5F coral | matches partitioning-main-database |
| airbnb-partitioning-main-database | #FF5A5F coral | Airbnb per-article precedent origin |
| aws-idempotent-apis | #FF9900 | Amazon orange (established) |
| aws-load-shedding | #FF9900 | Amazon orange |
| aws-shuffle-sharding | #FF9900 | Amazon orange |
| aws-timeouts-retries-backoff-jitter | #FF9900 | Amazon orange |
| canva-media-dynamodb | #00C4CC teal-cyan | FLAG: cyan/teal corridor (Slack #36C5F0, Roblox #00A2FF, Airbnb #06B6D4, Cadence #2DD4BF) |
| cloudflare-byzantine-failure | #F6821F orange | FLAG: orange corridor (AWS #FF9900, Uber #F97316, resilience-chip #EA580C) |
| datadog-incident-response-observer-fate | #632CA6 purple | FLAG: purple corridor (DoorDash #9b8cf0, Stripe #6366F1) |
| discord-trillions-message-search | #5865F2 blurple | |
| doordash-aperture-global-failure-mitigation | #9b8cf0 violet | |
| doordash-rabbitmq-kafka | #EB1700 red | DoorDash brand red |
| figma-postgres-sharding | #A259FF purple | |
| github-partitioning-relational-databases | #58A6FF blue | |
| gitlab-database-decomposition | #FC6D26 orange | FLAG: orange corridor 4th member |
| meta-foqs-priority-queue | #0866FF blue | Meta brand |
| meta-silent-data-corruption | #0866FF blue | Meta brand (from FOQS) |
| netflix-conductor-microservices-orchestrator | #E50914 red | FLAG: near semantic red |
| netflix-prioritized-load-shedding | #E50914 red | Netflix brand (from Conductor) |
| notion-sharding-postgres | #DE8A5A tan | |
| pinterest-sharding-mysql | #E60023 red | FLAG: reds corridor + semantic red |
| reddit-piday-outage | #FF4500 orange-red | FLAG: reds corridor (semantic, Netflix, Pinterest, Slack) |
| roblox-return-to-service | #00A2FF cyan | FLAG: cyan/teal corridor |
| segment-centrifuge-database-queue | #52BD94 green | FLAG: greens corridor near semantic |
| segment-exactly-once-delivery | #52BD94 green | Segment brand (from Centrifuge) |
| shopify-pods-architecture | #84CC16 lime | matches shopify-resilient-payments (company consistency) |
| shopify-resilient-payments | #84CC16 lime | pre-r12; Shopify chrome |
| skipper-workflow-engine | #22C55E green | pre-r12; VIOLATES chrome-only law (semantic green as accent) — legacy, flagged for the owner registry pass |
| slack-cellular-architecture | #ECB22E gold | Slack per-article accent |
| slack-incident-2-22-22 | #2EB67D green | FLAG: greens corridor |
| slack-scaling-job-queue | #36C5F0 cyan | Slack per-article accent |
| slack-vitess-datastores | #E01E5A magenta-red | FLAG: reds corridor |
| stripe-idempotency | #6366F1 indigo | corrected from brand #635BFF |
| stripe-rate-limiters | #6366F1 indigo | matches stripe-idempotency |
| uber-cadence-workflow-platform | #2DD4BF teal | Cadence's own accent (not Uber orange) |
| uber-intelligent-load-management | #f97316 orange | Uber brand (lowercase hex — cosmetic) |
| uber-kafka-consumer-proxy | #F97316 orange | Uber brand |
| _hero (site-level) | #F5B841 gold | landing-page hero, contract-exempt (taste doc §6) |

## Hunt candidates (vetted, unclaimed)

- **Google "Colossus under the hood" (Cloud blog, 2021)** — the
  strongest Google candidate; first-party architecture dissection in
  blog register. Google is absent from the library because its
  deepest material is books/papers (bar-failing); its developers
  blog verified 2026-07-24 as dev-rel/announcements only.
- **Google HTTP/2 Rapid Reset (2023)** — first-party, technical;
  sibling of the exhausted Cloudflare Nov-2023 post — ruling must
  establish a distinct crux or shelve.
- **Google June-2019 outage incident report** — deep and famous, but
  status-page register, not a blog post: OWNER CALL on the bar
  before any hunt.

## Exhausted / rejected source candidates (do not re-hunt)

Coinbase/Temporal (vendor bar), Meta Defcon (paper only), Google SRE
book (not first-party blog), GitHub Oct-2018 (crux ruled elsewhere),
Cloudflare Nov-2023, Netflix active-active 2013, Figma 2024.

## Publish sequencing constraints

_All prior sequencing constraints (r22 before r28; r25 before r29
gitlab backlink; r24/r28/r29 conditional pattern chip resolutions)
were satisfied at each round's landing and are now closed. Add new
constraints here as they arise._

## Round log

| round | article (slug) | class ruling | mints | agent |
|-------|----------------|--------------|-------|-------|
| ≤11 | 15 LIVE articles (pre-round-folder era; pattern library seeded, first cruxTags coined) | seed taxonomy | seed pattern set (see registry above) | pre-Fable authoring |
| 12 | airbnb-orpheus-idempotent-payments | RECUR ambiguous-failure-under-retry → 3rd company | atomic-phases; retryable-error-classification | Agent A |
| 13 | uber-cadence-workflow-platform | RECUR partial-completion-under-crashes | choreography-vs-orchestration | Agent A |
| 14 | stripe-rate-limiters | RECUR priority-blind-load-shedding → 3rd company | layered-admission-control | Agent A |
| 15 | pinterest-sharding-mysql | RECUR single-table-scaling-ceiling → 3rd company | id-encoded-placement; master-only-reads | Agent A |
| 16 | segment-centrifuge-database-queue | RECUR buffer-degrades-under-backlog → 3rd company | database-as-a-queue; single-writer-ownership | Agent A |
| 17 | datadog-incident-response-observer-fate | RECUR observer-shares-fate-with-observed → 3rd company | independent-observability (3-company canonical); universal-staged-rollout | Agent A |
| 18 | shopify-pods-architecture | RECUR blast-radius-scales-with-cluster-size → 3rd company | (none — cell-architecture conditional resolved RECUR) | Agent A |
| 19 | aws-idempotent-apis | RECUR ambiguous-failure-under-retry → 4th company (FIRST four-company) | pure recurrence round | Agent A |
| 20 | uber-kafka-consumer-proxy | RECUR buffer-degrades → 4th company | selective-acknowledgment; dead-letter-queue | Agent A |
| 21 | segment-exactly-once-delivery | RECUR ambiguous-failure → 5th company (FIRST five-company) | designated-source-of-truth | Agent A |
| 22 | slack-vitess-datastores | RECUR single-cluster-scaling-ceiling → 3rd company | sharding-behind-a-proxy | Agent A |
| 23 | canva-media-dynamodb | RECUR single-table → 4th company | content-free-change-events; hot-data-first-migration | Agent A |
| 24 | aws-load-shedding | RECUR priority-blind → 4th company | deadline-propagation | Agent A |
| 25 | gitlab-database-decomposition | RECUR single-cluster → 4th company | loose-foreign-keys; violation-ratchet | Agent A |
| 26 | meta-silent-data-corruption | RECUR gray-failure → 3rd company (declared ONE-CHIP; fault-isolation added via AGENT OPTION) | known-answer-testing | Agent A |
| 27 | doordash-rabbitmq-kafka | RECUR buffer-degrades → 5th company | fetch-execute-decoupling | Agent A |
| 28 | slack-incident-2-22-22 | MINT degraded-state-outlives-its-trigger (12th class) | load-bearing-cache | Agent A |
| 29 | reddit-piday-outage | MINT unrecorded-config-outlives-its-authors (13th class) | no-uncommitted-config; rehearsed-restore | Agent A |
| 30+ | — | assigned by owner | — | — |

## In-flight claims

None. When a round is assigned, the assigned agent adds a row here
immediately (round number, target source, agent name) so the sibling
never hunts the same source. The row moves to the round log at
completion.

## Appendix — Class history, round by round (moved from the taste doc, 2026-07-23)

Historical record of how the board reached its current state; the
registries above are authoritative for CURRENT state. Laws these
rounds established live in the taste doc's distilled-laws list.

**Taxonomy update — the third-company run (rounds 12–18, authored
2026-07-15).** Seven classes reached three companies in one run, each
with an explicit manifestation caveat recorded in its round's decision
log:
`ambiguous-failure-under-retry` +Airbnb (Orpheus — the deepest
server-side treatment; Airbnb becomes the first three-article
company, owner-approved precedent) ·
`partial-completion-under-crashes` +Netflix (Conductor — the
ancestral 2016 instance; crux anchors on the epistemic face,
"what remains?", and a one-clause registry-definition amendment
awaits owner sign-off) ·
`priority-blind-load-shedding` +Stripe (2017 rate limiters — the
chronologically earliest instance; priority via standing 20% fleet
reservation, a distinctive variant) ·
`single-table-scaling-ceiling` +Pinterest (2012-designed ancestral
instance; hypergrowth-rebuild manifestation vs the classmates'
mature-wall) ·
`buffer-degrades-under-backlog` +Segment (Centrifuge — substrate vs
SEMANTICS caveat: push/pop lets a backlog capture the shared buffer;
88,000-pair cardinality) ·
`observer-shares-fate-with-observed` +Datadog (2023-03-08 — the
class's success story: the out-of-band watcher WORKED, three-minute
detection; caveat axis is designs-it / suffers-its-absence /
exercises-it) ·
`blast-radius-scales-with-cluster-size` +Shopify (pods — the class
completes its answer taxonomy: cap it (Discord), shrink it
statistically (AWS shuffle), eliminate it structurally (cells)).
The **manifestation-caveat doctrine**, now standard: same causal
spine, different face → same class plus an explicit caveat naming the
face; different spine → reclassify or mint honestly. Ancestral
instances (a new article predating its classmates) get named as such —
chronology is part of a class's story. Pitch-target flips are normal
and logged (Shopify was hunted as `single-cluster` and reruled to
`blast-radius` on full read — the ceiling was one sentence of
backstory). Landing-preview and class-count copy may not assert counts
that depend on unverified tags: state the outcomes in the decision log
and gate the copy. Remaining after the run: `gray-failure` and
`single-cluster` at two companies; `retry-amplified-overload` (a
DoorDash 2021-06-19 postmortem is shelved as a candidate fill) and
`mitigation-scoped-narrower-than-failure` as singletons.

**The first FOUR-company class (round 19, 2026-07-16):**
`ambiguous-failure-under-retry` +AWS (Featonby's Builders' Library
idempotent-APIs piece — the platform-provider face, completing a
four-face manifestation map: contract / client-at-volume / server
interior / platform). Round 19 is also the first **pure-recurrence
round** under the round-folder format: zero mints, three recurrences,
including the first recurrences of two round-12 mints
(`retryable-error-classification`, `atomic-phases` — both now
two-company). Same-company rule made explicit: pattern recurrence
counts COMPANIES, not articles (`idempotency-keys` gains a fifth
article but stays a four-company pattern, AWS already counted).
Companion-piece note: the source explicitly builds on the live AWS
timeouts/jitter article — the two retry pathologies
(correctness / amplification) now have their two Builders' Library
dissections cross-linked in prose.

**The second four-company class (round 20, 2026-07-16):**
`buffer-degrades-under-backlog` +Uber (Kafka Consumer Proxy — the
second semantics-face instance alongside Segment, which strengthens
and resubmits round 16's proposed one-clause definition amendment
with two supporting instances). The Segment↔Uber divergence is the
class's teaching pair: replace the substrate (database-as-a-queue)
versus keep it and build a ledger above it (selective-acknowledgment)
— the sibling boundary is drawn inside both mints' definitions.
Primary-vs-newest convention clarified: a productionization SEQUEL
that presumes the original's mechanics (Uber's 2026 uForwarder post)
is scoped secondary, not the dissection target — the newest-post rule
applies to evolution RESTATEMENTS. Uber becomes the third
three-article company.

**The first FIVE-company class (round 21, 2026-07-17):**
`ambiguous-failure-under-retry` +Segment (the 2017 exactly-once
dedupe post — the PIPELINE face, ambiguity settled downstream of a
boundary that can't negotiate). The class's manifestation map now
spans where-the-ambiguity-is-settled: contract / client / server
interior / platform / pipeline. Two firsts ride along:
`idempotency-keys` becomes the first FIVE-COMPANY pattern (six
articles), and the class gains its first EMPIRICAL manifestation —
Segment's 0.6%-in-four-weeks is the measured cost of the ambiguity
unmitigated; classes should note when a member quantifies the class.
New mint `designated-source-of-truth` (consistency) forms a
solution-space pole pair with `atomic-phases` inside one class:
enclose in a real transaction where a shared store exists, or crown
one system and repair toward it where none does. Verification-gate
addendum: headless testing also catches PARAMETER RESONANCE, not
just mechanic errors — round 21's default ledger cap slid exactly
behind the re-send order, silently defeating the dedupe beat; the
fix keyed the default miniature to steady-state (no aging) so aging
appears only under the load-spike beat, matching the source's own
claim shape. Segment becomes the fourth three-article company.

**Round 22 (Slack Vitess): the eighth three-company class.**
`single-cluster-scaling-ceiling` +Slack — manifestation caveat one
level DOWN the hierarchy: after tenant-sharding, each tenant's shard
is a single cluster, and the largest tenant finds its ceiling first
(ruled on the post's own bolded sentence). Class answer taxonomy:
split by function (GitHub) / split out the main DB (Airbnb) /
re-shard by finer key behind a proxy (Slack). New mint
`sharding-behind-a-proxy` forms the second sibling POLE PAIR in the
pattern library — vs `id-encoded-placement`: maximally smart
identifiers (Pinterest) versus maximally ignorant application
(Slack), the two answers to who may know where data lives. Pattern
recurrences can be RETIREMENT stories: `single-writer-ownership`'s
second company arrives as Slack retiring active-active dual-writes —
the pattern taught by the cost of its absence. gray-failure is now
the library's only two-company class. Slack becomes the fifth
three-article company; per-article accents (Airbnb precedent) now
also apply to Slack (#ECB22E, #36C5F0, +#E01E5A flagged in the reds
corridor). Sim-design law from the round's gate catch: a stage
ladder's spread logic must key on the STAGE variable alone — gating
it on an architecture flag the ladder never flips created dead code
that silently reported pre-migration numbers as post-migration ones;
headless verification of the post-migration beat is what exposed it.

**Round 23 (Canva media → DynamoDB): the THIRD four-company class,
and the 20th source.** `single-table-scaling-ceiling` +Canva — the
class's answer taxonomy completes: partition in place (Figma), shard
(Notion), hand-shard ahead of the wall (Pinterest), EXIT relational
for managed NoSQL (Canva). Two caveat doctrines sharpened: the
ceiling can be COMPOUND (six walls arriving in formation), and
managed convenience carries MANAGED ceilings — several walls
belonged to the rented substrate (RDS EBS caps, ext3-snapshot table
files), not the database. Class-internal disagreements are prose
gold, not chips: Canva's embraced EC replica reads versus
Pinterest's master-only-reads refusal is cross-referenced, never
inverse-tagged. Two mints that COMPOSE with an earlier one:
`content-free-change-events` (identity-only events, truth re-read
per apply — reorder/retry/pause correctness-free) is the transport
discipline that keeps derived stores following a
`designated-source-of-truth`; `hot-data-first-migration` carries the
honesty that capability arrives per QUERY SHAPE, not per percentage
— made playable as a refused list-by-user button below 100%.
Timestamped answers get their timestamp kept: the post's
would-consider-NewSQL-today candor is quoted in the tradeoffs, not
sanded off. New-source rounds add a feeds.json agent task with the
feed URL marked as a guess until verified.

**Round 24 (AWS load shedding): the FOURTH four-company class, and
two bar rulings.** `priority-blind-load-shedding` +AWS (Yanacek's
doctrine piece) — manifestation caveat: classmates BUILT one
priority mechanism each; this member states the class's DOCTRINE
(ping above all — a shed health check shrinks the fleet;
completion over initiation; within-quota over burst; front-of-stack
shaping). Two source-bar rulings logged: VENDOR CASE STUDIES fail
the bar regardless of technical content (Coinbase/Temporal exists
only on temporal.io — rejected, not forced into
partial-completion); and pre-committed SHELVE-DON'T-FORCE clauses
belong in the hunt itself — this round's fetch carried a written
rule that a retry-amplified ruling would shelve the source (AWS
already holds that class), so the ruling risk was priced before
authoring began. AWS becomes the SECOND four-article company —
corrected: Airbnb was first (Orpheus, r12, owner-approved), a fact
my round-24 ledger got wrong and the owner's concentration-rule
note exposed; the named recurrence value for the crossing stands
(the class's fourth company, no bar-clearing alternative). Sim-honesty additions from the gate: model finite
client populations (retry pools saturate; unbounded feedback loops
break meters), and when a ladder rung claims a mechanism, the sim
must give it a measurable differential over the rung below —
deadlines earned theirs via queue-staleness (doomed-but-admitted
requests served uselessly at rung 3, dropped at dequeue at rung
4). Dramatized rates (the fleet-shrink speed) are labeled as
dramatizations in the artifact footer.

**Round 25 (GitLab database decomposition): the FIFTH four-company
class, the first same-market rivals inside one class, and the 21st
source.** `single-cluster-scaling-ceiling` +GitLab — GitHub↔GitLab
hit the same wall and chose the same answer species, which is the
class taxonomy's strongest possible validation. Caveat doctrines
added: the WRITE-PATH statement of the class (replicas scale reads
arbitrarily; the ceiling is the primary every write must reach, and
it arrives while read dashboards look healthy), and
SPLIT-BY-MEASUREMENT (the write-traffic table chose CI at ~49% of
writes — instinct confirmed, not trusted). Deferred-not-rejected
long-term answers join a class's teaching: namespace sharding stays
on GitLab's map; which escape is REACHABLE depends on accumulated
coupling. Mint rulings: descriptive company coinages are keepable
names (`loose-foreign-keys`, per the SACK precedent); and
PROCESS patterns enforced through CI (`violation-ratchet`) may mint
with an explicit category-strain flag and owner ruling invited —
large-scale transitions fail without them, which earns the library
slot. Multi-post scoping extended: an UNREAD sibling in a series
(Part 3) is disclosed in the artifact footer, not silently skipped.
Informed-refusal beats (r18's REFUSED precedent) now cover declined
PLANS, not just forbidden operations: the zero-downtime design is
examinable in the artifact and returns GitLab's three decline
reasons instead of progress. The orange accent corridor takes its
fourth member (#FC6D26) — the owner registry pass is ten rounds
overdue and restated at maximum volume.

**Round 26 (Meta silent data corruption): the board completes —
no 2-company classes remain.** `gray-failure` +Meta: every
multi-member class now holds 3+ companies (only the two declared
singletons sit below). Caveat doctrine: SILICON gray joins
distributed gray — the class spine (invisible to the system's own
health signals) forced to its logical end: when no passive signal
can ever exist, evidence must be MANUFACTURED (known-answer
interrogation at two depths). Editorial precedents set: the first
declared ONE-CHIP round — a single-lesson-deep post mints once and
says so, rather than forcing recurs (candidates examined and
rejected in DECISIONS, agent option left open); and
SECONDARY-PRESS FACT DISCIPLINE — mechanics appearing only in press
paraphrases of a companion paper (quarantine details) are omitted
from article facts even when convenient, with any artifact
rendering of them footer-labeled as illustrative miniature. The
unread-sibling disclosure (r25) reused for Meta's 2021 mitigation
post — flagged as a plausible distinct-crux future round.

**Round 27 (DoorDash RabbitMQ → Kafka): the SECOND five-company
class.** `buffer-degrades-under-backlog` +DoorDash (Meta, Slack,
Segment, Uber, DoorDash) — the class's REPLACEMENT story
(classmates rebuilt their buffers; DoorDash ruled repair
unreachable and swapped the foundation), with the spine verbatim
in-source: Flow Control exporting the buffer's distress upstream
as publisher latency, amplified by the harakiri kill→churn→load
loop. The class's completing kicker: the post documents the NEW
buffer's backlog physics (head-of-line, rebalance stalls) with
equal candor — you choose your pathologies, you don't escape them.
Editorial rules hardened this round: (1) HONEST-UPDATE notes go in
DECISIONS when a hunt's opening claim is corrected mid-turn (I
opened saying no 5th-company candidate existed; deeper recall
surfaced this one — the correction is on the record, not
silently absorbed); (2) CHIPS ASSERT USE — a drafted
dead-letter-queue chip marking a deliberate ABSENCE was removed
before packaging, because tagging an article with a pattern it
doesn't use falsely lists the company on that pattern's page;
absence-contrasts are prose and boundary material
(selective-acknowledgment ↔ fetch-execute-decoupling became the
library's third sibling pole pair: same head-of-line problem,
delivery-guarantee price vs bounded-loss price). Interrupted-turn
hygiene: a stale partial artifact file discovered at write time is
verified against the intended content and overwritten, with the
discrepancy noted.


**Round 28 (Slack 2-22-22): the TWELFTH cruxTag class — first new
class since r11, and the first round authored under the readability
doctrine.** `degraded-state-outlives-its-trigger` minted on Laura
Nolan's postmortem, its founding document: the trigger was paused
early and "it didn't make a difference," because the degraded state
regenerated itself (cache-fill needed the database that was
drowning for lack of cache). Rules exercised and holding: the
honest-update note fired again (the hunt opened claiming
retry-amplified's 2nd; the post's own accounting demoted retries to
contributor — the class registry grows only when the source's own
words defeat every existing tag, and the rejection of each neighbor
is written down); the owner's concentration rule got its first
worked example (Slack → 4th article, matching not crossing
precedent, with the named value: the class's founding document
exists only at Slack, and the incident RUNS ON the r22-dissected
Vitess architecture — the library's first
incident-on-a-dissected-architecture pair, a link no new company
could deliver); and born-compliant entry surfaces were
self-audited against all nine doctrine rules in DECISIONS. New
board honesty: eliminating all sub-3 classes is not a ratchet —
a genuinely new crux RE-OPENS a singleton, and that is taxonomy
working, not regressing. Sim-design law from the gate: recovery
pacing is load-bearing for teaching beats — a refill rate tuned
too fast closed the fragile window in which the real incident's
too-large limit raise caused its relapse; the fix slowed recovery
until the mistake the story turns on was actually committable.

**Round 29 (Reddit Pi-Day): the THIRTEENTH cruxTag class — second
consecutive mint, and the registry's conservatism held anyway.**
`unrecorded-config-outlives-its-authors`, founded on the post's own
self-demotion: it hands over a perfect proximate cause (the master
label Kubernetes 1.24 deleted) and explicitly subordinates it —
"the actual cause is more systemic… Inconsistency" — with the crux
living in the sentence "committed nowhere… no record… no
breadcrumbs." Two consecutive new classes is not registry drift
when each source's own words defeat every existing tag; the
per-neighbor rejections (including blast-radius despite the TL;DR
using the phrase verbatim as impact framing) are the proof of work,
written down as always. New precedents this round: (1)
SHELVE-DON'T-FORCE resolved by owner assistance — the primary was
robots-blocked, the round paused rather than authoring from
secondary reconstructions, and the owner supplied the public
post's HTML; provenance logged in DECISIONS. The pause cost one
message; forcing would have cost the taxonomy. (2) Intra-session
pattern recurrence: load-bearing-cache found its second company
ONE round after minting — fast corroboration is evidence the mint
carved a real joint, and the conditional-chip protocol handles the
not-yet-published dependency cleanly. (3) A non-numeric stat
("committed nowhere" as the value) — permitted exactly when the
phrase IS the finding. Sim-design law applied, not re-learned: a
narrative incident became a pure act() reducer, and the round's
teaching beats (the runbook-faithful path hitting the silent
failure; the firehose punished; the hindsight path naming itself)
were all headless-asserted before zip.
