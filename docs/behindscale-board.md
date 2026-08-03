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
- Rows marked `AGENT CHECK` have gaps only the repo can fill. One-time
  backfill task for the implementation agent: complete them from the
  repo export, after which this ledger is authoritative.
- Status vocabulary: LIVE (deployed to production), AUTHORED (round
  zip delivered, not yet published), PENDING (exists conditionally —
  e.g. a mint awaiting merge-or-discard).

## Board summary (as of round 32 — batch r31+r32 sync commit)

41 articles LIVE · 23 sources · 14 crux classes · 51 pattern
definitions · 41 artifacts. All rounds through r32 are deployed
to production; the implementation agent pushes each round to
`main` at landing, which Vercel deploys automatically.

## CruxTag registry (14 classes)

| # | cruxTag | companies | members / status |
|---|---------|-----------|------------------|
| 1 | ambiguous-failure-under-retry | 5 | Stripe, Shopify, Airbnb, AWS, Segment — LIVE |
| 2 | buffer-degrades-under-backlog | 5 | Meta, Slack, Segment, Uber, DoorDash — LIVE |
| 3 | single-cluster-scaling-ceiling | 5 | GitHub, Airbnb, Slack, GitLab, Google (r30, solved-side face) — LIVE |
| 4 | priority-blind-load-shedding | 5 | Netflix, Stripe, Uber, AWS (Builders, r24), LinkedIn (r31, fleet-default face) — LIVE |
| 5 | single-table-scaling-ceiling | 4 | Figma, Notion, Pinterest, Canva — LIVE |
| 6 | gray-failure-defeats-automatic-detection | 3 | Slack, Cloudflare, Meta — LIVE |
| 7 | partial-completion-under-crashes | 3 | Airbnb (Skipper), Uber (Cadence), Netflix (Conductor) — LIVE |
| 8 | observer-shares-fate-with-observed | 3 | Airbnb, Roblox, Datadog — LIVE |
| 9 | blast-radius-scales-with-cluster-size | 3 | Discord, AWS, Shopify — LIVE |
| 10 | retry-amplified-overload | 1 | AWS (timeouts doctrine) — LIVE |
| 11 | mitigation-scoped-narrower-than-failure | 1 | DoorDash (Aperture) — LIVE |
| 12 | degraded-state-outlives-its-trigger | 1 | Slack 2-22-22 — LIVE (r28) |
| 13 | unrecorded-config-outlives-its-authors | 1 | Reddit Pi-Day — LIVE (r29) |
| 14 | placement-precedes-the-access-pattern | 1 | Google Colossus SSD placement — LIVE (r32) |

Open class quests: partial-completion 4th, observer-fate 4th,
blast-radius 4th (all currently lack bar-clearing sources — see the
exhausted-candidates list below), plus growing any singleton.

## Pattern registry

| pattern | minted | status / notes |
|---------|--------|----------------|
| idempotency-keys | early | LIVE; first FIVE-company pattern (6 articles / 5 companies, r21) |
| retryable-error-classification | r12 | LIVE; 2-company since r19 |
| atomic-phases | r12 | LIVE; 2-company since r19; pole pair w/ designated-source-of-truth |
| single-writer-ownership | pre-r20 | LIVE; 2nd company r22 (retirement story) |
| conservative-auto-remediation | pre-r20 | LIVE; recurred r28 (anti-instance) |
| universal-staged-rollout | pre-r20 | LIVE; recurred r25, r27, r29 (readmission face); 6 articles / 6 companies |
| selective-acknowledgment | r20 | LIVE; pole pair w/ fetch-execute-decoupling (r27) |
| designated-source-of-truth | r21 | LIVE (consistency); pole pair w/ atomic-phases |
| sharding-behind-a-proxy | r22 | LIVE; pole pair w/ id-encoded-placement |
| content-free-change-events | r23 | LIVE; composes w/ designated-source-of-truth |
| hot-data-first-migration | r23 | LIVE |
| priority-aware-load-shedding | (live pre-r12) | LIVE; chipped by r24 + r28 (Fable's r24 conditional-slug guess `prioritized-load-shedding` resolved to this live slug at placement); 6 articles / 6 companies |
| loose-foreign-keys | r25 | LIVE (company coinage kept) |
| violation-ratchet | r25 | LIVE; process-pattern ruling still open (OWNER CALL — open-decisions item 16) |
| known-answer-testing | r26 | LIVE (crypto's own name kept; tiers fold into definition) |
| distributed-metadata-model | r30 | LIVE (throughput; Google's coinage kept) |
| shared-pool-multiplexing | r30 | LIVE (throughput; device-tier folded into definition) |
| load-bearing-cache | r28 | LIVE; 2nd company chipped r29 (Reddit) |
| no-uncommitted-config | r29 | LIVE (resilience); boundary vs violation-ratchet inside definition |
| rehearsed-restore | r29 | LIVE (resilience) |
| dead-letter-queue | r20 | LIVE (resilience); companion to selective-acknowledgment |
| fetch-execute-decoupling | r27 | LIVE (throughput); pole pair w/ selective-acknowledgment |
| deadline-propagation | r24 | LIVE (resilience); boundary vs bounded-queue-age (open-decisions item 15) |
| layered-admission-control | r14 | LIVE; 2nd company r24 (Stripe + AWS) |
| master-only-reads | r15 | LIVE; canonical 2-company mint (Pinterest + Airbnb Orpheus) |
| id-encoded-placement | r15 | LIVE (throughput); pole pair w/ sharding-behind-a-proxy |
| database-as-a-queue | r16 | LIVE (resilience); pole pair w/ selective-acknowledgment (r20 Uber's answer) |
| independent-observability | r17 | LIVE; canonical 3-company launch (Airbnb + Roblox + Datadog) |
| choreography-vs-orchestration | r13 | LIVE (category-strain flag noted at mint, still open) |
| replica-promotion-split | r7 | LIVE |
| throttled-readmission | r8 | LIVE |
| shuffle-sharding | r9 | LIVE |
| simulated-policy-selection | r32 | LIVE (throughput); Google's L4 as reference form; boundary vs A/B testing + offline modeling inside definition |
| feedback-controlled-load-management | pre-r12 | LIVE; 5 articles / 5 companies as of r31 (Uber + Netflix + Stripe + DoorDash + LinkedIn) |
| retry-budget | pre-r12 | LIVE; 2 companies as of r31 (AWS + LinkedIn) |

Above lists every pattern surfaced round-by-round in DECISIONS. The
full live library is **50 patterns** — the remainder (pre-r12
mints: application-layer-sharding, batched-routing-by-destination,
cell-architecture, checkpoint-bounded-scans, circuit-breaker,
compile-time-boundary-enforcement,
dead-mans-switch, durable-front-buffer, durable-workflows,
embedded-vs-centralized-orchestration, fault-isolation,
feedback-controlled-load-management, generic-mitigation,
hibernation-vs-polling, logical-physical-migration-split,
queue-with-guaranteed-delivery, retry-budget,
retry-with-backoff-and-jitter, shard-key-colocation) all LIVE.

Retired pattern names (do not reuse):
- `pid-controlled-adaptive-thresholds`
- `byos-platform-design` (Uber jargon; re-minted and retracted at r11 for DoorDash Aperture — see taste doc for the retraction lesson)
- `circular-dependency-avoidance` (merged into `independent-observability` on 2026-08-03; the target pattern's definition already carried the circular-dependency framing as the general trap, so the two chips on airbnb-monitoring-reliably-at-scale collapsed to one merged note)

## Sources (23)

All in `content/feeds.json`, deduped from every article's
`source.slug`. Numbering below is round-order-joined:

Pre-round-folder era (rounds 1–11): Amazon Builders' Library
(Amazon (AWS)), Airbnb Engineering, The Cloudflare Blog,
Discord Engineering, Engineering at Meta, Figma Blog, The GitHub
Blog, Netflix Technology Blog, Notion Blog, Roblox Blog, Shopify
Engineering, Slack Engineering, Stripe Engineering, Uber
Engineering, DoorDash Engineering Blog. Rounds-12+ additions:
Pinterest Engineering Blog (r15), Segment Blog (r16), Datadog
Engineering Blog (r17), Canva Engineering Blog (r23), GitLab Blog
Engineering (r25), r/RedditEng (r29), Google Cloud Blog (r30 —
feed URL is Fable's guess `cloudblog.withgoogle.com/rss/`, not
yet verified), LinkedIn Engineering (r31 — feed URL is Fable's
guess `engineering.linkedin.com/blog.rss`, not yet verified).

Total: 23 sources. New sources must be added here with slug +
feed URL when first used.

## Company concentration (owner's rule)

Crossing the highest existing per-company article count requires an
explicit DECISIONS sentence naming the recurrence value a new-company
article could not deliver. Current four-article companies (the
ceiling): **Airbnb, AWS, Slack**.

| articles | companies |
|----------|-----------|
| 4 | Airbnb, Amazon (AWS), Slack |
| 3 | Uber |
| 2 | DoorDash, Google, Meta, Netflix, Segment, Shopify, Stripe |
| 1 | Canva, Cloudflare, Datadog, Discord, Figma, GitHub, GitLab, LinkedIn, Notion, Pinterest, Reddit, Roblox |

## Accent registry (chrome colors)

Moved here from the taste doc (2026-07-23). LAW stays in the taste
doc: chrome only, never verdict colors. The owner registry pass over
the crowded corridors is a standing open item (oranges / greens /
purples / reds).

| article | accent | notes / flags |
|---------|--------|---------------|
| airbnb-orpheus-idempotent-payments | #FF5A5F coral | matches partitioning-main-database coral |
| netflix-conductor-microservices-orchestrator | #E50914 | company match w/ netflix-prioritized-load-shedding; semantic-red caveat |
| stripe-rate-limiters | #6366F1 indigo | CORRECTED from brand #635BFF to match live stripe-idempotency |
| pinterest-sharding-mysql | #E60023 | HIGH-RISK (semantic red + Netflix red); teal swap withdrawn (Cadence owns #2DD4BF); candidate #D946EF — OWNER in-situ call |
| segment-centrifuge-database-queue | #52BD94 green | FLAG: near Skipper #22C55E (also semantic green) — OWNER call |
| datadog-incident-response-observer-fate | #632CA6 purple | purple corridor 3-deep (violet #9b8cf0, Figma #A259FF) |
| shopify-pods-architecture | #84CC16 lime | CORRECTED from brand #96BF48 to match live Shopify accent |
| slack (r22 set) | #ECB22E, #36C5F0, #E01E5A | #E01E5A flagged reds corridor |
| gitlab (r25) | #FC6D26 | orange corridor 4th member |
| slack-incident-2-22-22 (r28) | #2EB67D | greens corridor (Segment #52BD94, semantic GREEN) |
| reddit-piday-outage (r29) | #FF4500 | RED corridor — HARD flag |
| google-colossus (r30) | #4285F4 | blue corridor (Slack cyan #36C5F0) |
| linkedin-hodor-overload-protection (r31) | #0A66C2 | HARD FLAG: blue corridor FIVE-deep (GitHub #58A6FF, Slack #36C5F0, Roblox #00A2FF, Google #4285F4, this) |
| google-colossus-ssd-placement (r32) | #4285F4 | company-match REUSE of r30 (Netflix precedent); no new corridor entry |
| pre-r12 articles | AGENT CHECK | complete from repo |

## Hunt candidates (vetted, unclaimed)

- **Google "Colossus under the hood: SSD performance at HDD prices"
  (2025)** — the placement/tiering sequel to r30's source; deeper and
  more technical than the 2021 piece; possible distinct crux
  (placement doctrine). Disclosed as unread sibling in r30.
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

- r22 (slack-vitess-datastores) must publish before or with r28
  (relatedArticles dependency).
- r29's gitlab relatedArticle depends on the r25 slug (AGENT CHECK
  alignment) and r25 being published.
- All r24/r28/r29 conditional pattern chips resolve together at
  publish (merge-or-discard).

## Round log

| round | article (slug) | class ruling | mints | agent |
|-------|----------------|--------------|-------|-------|
| ≤27 | rounds 12–27 all LIVE (r12 Airbnb Orpheus through r27 DoorDash RabbitMQ→Kafka, plus the pre-round-folder pattern-library seed) | see class-history appendix | see pattern registry | Agent A (original) |
| 28 | slack-incident-2-22-22 | MINT degraded-state-outlives-its-trigger (12th) | load-bearing-cache | Agent A |
| 29 | reddit-piday-outage | MINT unrecorded-config-outlives-its-authors (13th) | no-uncommitted-config, rehearsed-restore | Agent A |
| 30 | google-colossus | single-cluster-scaling-ceiling 5th (solved-side face; third 5-company class) | distributed-metadata-model, shared-pool-multiplexing (declared two-chip) | Agent A |
| 31 | linkedin-hodor-overload-protection | priority-blind-load-shedding 5th (fleet-default face; fourth 5-company class) | pure-recurrence (zero mints; three recurs) | Agent B |
| 32 | google-colossus-ssd-placement | MINT placement-precedes-the-access-pattern (14th class) | simulated-policy-selection (throughput) | Agent B |
| 33+ | — | assigned by owner | — | — |

## In-flight claims

| round | target source | agent |
|-------|---------------|-------|
_(none)_

When a round is assigned, the assigned agent adds a row here
immediately (round number, target source, agent name) so the sibling
never hunts the same source. The row moves to the round log at
completion.

## Round narratives (round by round, newest last)

One narrative entry per round — the ruling, the lessons, the
precedents. Appended by the authoring agent as part of each round's
sync commit, directly after the previous round's entry. (Rounds
12–29 migrated here from the taste doc on 2026-07-23.)

**Taxonomy update — the third-company run (rounds 12–18, authored
2026-07-15, pipeline pending deploy).** Seven classes reached three
companies in one run, each with an explicit manifestation caveat
recorded in its round's decision log:
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

**Round 30 (Google Colossus, Agent A).** single-cluster-scaling-
ceiling's 5th company and the class's first SOLVED-SIDE face — the
successor system's origin story, ruled on the post's own motivation
sentence (GFS's metadata ceiling, answered by Curators + Bigtable,
100x). The register call is the round's main lesson: the thinnest
source in the library (6-minute promotional overview) was authored
with facts held strictly to the post — the famous Bigtable-on-
Colossus recursion excluded as not-in-source, analysis marked as
analysis in the tradeoffs, and the solved-side telling's omissions
named for the reader. Declared two-chip round (distributed-metadata-
model — Google's coinage; shared-pool-multiplexing — device-tier
folded in); zero recurs, honestly, after a full registry scan. The
three-round mint streak ends without a forced fourth.