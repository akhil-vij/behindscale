# Search tests

Query → expected results the search must pass. Every expected set below was produced by a
simulator that mirrors the site's match model — case-insensitive, token-prefix, multi-word
tokenised with **AND** semantics (every query token must be a prefix of some indexed token) —
run over the real corpus (title, summary, tags, company, class label, pattern names) plus the
authored `keywords`/`aliases`. The implementation agent should wire the same indexed fields and
turn these into unit tests. Results are article/pattern slugs; order does not matter.

Notes on the model that shape a few cases:
- Apostrophes split into their own tokens. `dead man's switch` and `dead man switch` both work;
  `dead mans switch` (no apostrophe) does **not** (`mans` is not a prefix of `man`).
- Stopword-heavy questions (`how to shard a database`) match loosely because common tokens
  co-occur widely; the precise queries are distinctive phrases. Loose cases are marked `~`.

## Required anchors

| # | surface | query | expected (count) |
|---|---|---|---|
| R1 | /problems | `Kafka` | doordash-rabbitmq-kafka, slack-scaling-job-queue, uber-kafka-consumer-proxy, segment-exactly-once-delivery, segment-centrifuge-database-queue (5) |
| R2 | /patterns | `backlog` | durable-front-buffer, database-as-a-queue, queue-with-guaranteed-delivery, checkpoint-bounded-scans (≥2; 4) |
| R3 | /problems | `Orpheus` | airbnb-orpheus-idempotent-payments (1) |

**R1 note:** the audit said "2 of 7". Five is the precision-correct target. The two excluded —
`meta-foqs-priority-queue` and `uber-cadence-workflow-platform` — mention Kafka only in passing
(a related-link and a backing-store list), and must NOT match `Kafka`. See REPORT.md → Kafka
decision. A passing test should assert both the five present AND those two absent.

## Article failure-word queries (category 3)

| query | expected (count) |
|---|---|
| `double payment` | airbnb-orpheus-idempotent-payments, shopify-resilient-payments, stripe-idempotency (3) |
| `double charge` | airbnb-orpheus-idempotent-payments, shopify-resilient-payments, stripe-idempotency (3) |
| `duplicate charge` | airbnb-orpheus-idempotent-payments, stripe-idempotency (2) |
| `replica lag` | airbnb-orpheus-idempotent-payments, canva-media-dynamodb, pinterest-sharding-mysql (3) |
| `head-of-line blocking` | doordash-rabbitmq-kafka, segment-centrifuge-database-queue, uber-kafka-consumer-proxy (3) |
| `poison pill` | uber-kafka-consumer-proxy (1) |
| `thundering herd` | aws-timeouts-retries-backoff-jitter, doordash-aperture-global-failure-mitigation, stripe-idempotency, uber-intelligent-load-management (4) |
| `retry storm` | aws-load-shedding, aws-timeouts-retries-backoff-jitter, doordash-aperture-global-failure-mitigation, linkedin-hodor-overload-protection (4) |
| `cascading failure` | doordash-aperture-global-failure-mitigation, slack-incident-2-22-22 (2) |
| `metastable failure` | doordash-aperture-global-failure-mitigation, slack-incident-2-22-22 (2) |
| `gray failure` | cloudflare-byzantine-failure, meta-silent-data-corruption, slack-cellular-architecture (3) |
| `blast radius` | aws-shuffle-sharding, discord-trillions-message-search, github-partitioning-relational-databases, shopify-pods-architecture (4) |
| `noisy neighbor` | aws-shuffle-sharding, segment-centrifuge-database-queue, uber-intelligent-load-management (3) |
| `split brain` | cloudflare-byzantine-failure, uber-intelligent-load-management (2) |
| `silent data corruption` | meta-silent-data-corruption (1) |
| `circular dependency` | airbnb-monitoring-reliably-at-scale, datadog-incident-response-observer-fate, roblox-return-to-service (3) |
| `crash between steps` | skipper-workflow-engine, uber-cadence-workflow-platform (2) |
| `cold cache` | roblox-return-to-service, slack-incident-2-22-22 (2) |
| `brownout` | aws-load-shedding (1) |
| `hot shard` | canva-media-dynamodb, pinterest-sharding-mysql, slack-vitess-datastores (3) |
| `scatter query` | figma-postgres-sharding, slack-incident-2-22-22 (2) |
| `write bottleneck` | airbnb-partitioning-main-database, gitlab-database-decomposition (2) |
| `death spiral` | doordash-aperture-global-failure-mitigation, netflix-prioritized-load-shedding (2) |
| `transaction ID wraparound` | notion-sharding-postgres (1) |
| `exactly once` | airbnb-orpheus-idempotent-payments, meta-foqs-priority-queue, segment-exactly-once-delivery, stripe-idempotency (4) |
| `backpressure` | netflix-prioritized-load-shedding, uber-intelligent-load-management, uber-kafka-consumer-proxy (3) |

## Article question-phrasing queries (category 5)

| query | expected (count) |
|---|---|
| `prevent double payments` | airbnb-orpheus-idempotent-payments, shopify-resilient-payments, stripe-idempotency (3) |
| `exactly once delivery` | meta-foqs-priority-queue, segment-exactly-once-delivery (2) |
| `deduplicate messages` | segment-exactly-once-delivery (1) |
| `protect critical traffic` | linkedin-hodor-overload-protection, netflix-prioritized-load-shedding, stripe-rate-limiters, uber-intelligent-load-management (4) |
| `idempotent API` | airbnb-orpheus-idempotent-payments, aws-idempotent-apis, aws-timeouts-retries-backoff-jitter, stripe-idempotency (4) |
| `safe retry` | aws-idempotent-apis, aws-timeouts-retries-backoff-jitter, shopify-resilient-payments, stripe-idempotency (4) |
| `resume after crash` | netflix-conductor-microservices-orchestrator, skipper-workflow-engine (2) |
| `who monitors the monitoring` | airbnb-monitoring-reliably-at-scale, datadog-incident-response-observer-fate (2) |
| `design a job queue` | segment-centrifuge-database-queue, slack-scaling-job-queue, uber-intelligent-load-management (3) `~` |
| `shard Postgres` | figma-postgres-sharding, notion-sharding-postgres (2) |
| `what to put on SSD` | google-colossus-ssd-placement (1) |
| `how to shard a database` | canva-media-dynamodb, discord-trillions-message-search (2) `~` |

`~` = stopword-loose. `design a job queue` picks up `uber-intelligent-load-management` because
`job` (→ "jobs") and the other short tokens co-occur; the two intended hits lead. `how to shard a
database` is broad by construction; the precise queries for that intent are `shard postgres`,
`shard mysql`, and the wall term below.

## Named-thing precision spot-checks (category 1)

Each should return exactly its one article (proof that named terms don't leak):

| query | expected |
|---|---|
| `harakiri` | doordash-rabbitmq-kafka |
| `Kafkagate` | slack-scaling-job-queue |
| `FOQS` | meta-foqs-priority-queue |
| `Consumer Proxy` | uber-kafka-consumer-proxy |
| `ClientToken` | aws-idempotent-apis |
| `Semian` | shopify-resilient-payments |
| `Cinnamon` | uber-intelligent-load-management |
| `Aperture` | doordash-aperture-global-failure-mitigation |
| `gh-ost` | canva-media-dynamodb |
| `DBProxy` | figma-postgres-sharding |
| `drain button` | slack-cellular-architecture |
| `Sorting Hat` | shopify-pods-architecture |
| `CacheSack` | google-colossus-ssd-placement |
| `Fleetscanner` | meta-silent-data-corruption |
| `Cadence` | uber-cadence-workflow-platform |

Named things that legitimately span more than one article:

| query | expected (count) |
|---|---|
| `Vitess` | github-partitioning-relational-databases, notion-sharding-postgres, slack-incident-2-22-22, slack-vitess-datastores (4) |
| `Colossus` | google-colossus, google-colossus-ssd-placement (2) |
| `Temporal` | skipper-workflow-engine, uber-cadence-workflow-platform (2) |
| `token bucket` | aws-timeouts-retries-backoff-jitter, stripe-rate-limiters (2) |
| `DLQ` | uber-kafka-consumer-proxy (1) |
| `PID controller` | uber-intelligent-load-management (1) |
| `dead man's switch` | airbnb-monitoring-reliably-at-scale (+ cloudflare-byzantine-failure as a weak apostrophe-token coincidence; airbnb is the intended hit) |

## Pattern queries (/patterns)

| query | expected (count) |
|---|---|
| `backlog` | durable-front-buffer, database-as-a-queue, queue-with-guaranteed-delivery, checkpoint-bounded-scans (4) |
| `dlq` | dead-letter-queue (1) |
| `exponential backoff` | retry-with-backoff-and-jitter (1) |
| `load shedding` | feedback-controlled-load-management, priority-aware-load-shedding (2) |
| `idempotency` | idempotency-keys (1) |
| `saga` | durable-workflows (1) |
| `noisy neighbor` | fault-isolation, shuffle-sharding (2) |
| `cache stampede` | load-bearing-cache (1) |
| `exactly once` | idempotency-keys (1) |
| `rate limiter` | layered-admission-control (1) |
| `head-of-line blocking` | fetch-execute-decoupling, selective-acknowledgment (2) |
| `heartbeat` | dead-mans-switch (1) |
| `source of truth` | designated-source-of-truth (1) |
| `cdc` | content-free-change-events (1) |
| `watermark` | checkpoint-bounded-scans (1) |

## Wall title-seed queries (searchQuestion → wall by cruxTag)

Each wall's `searchQuestion` should surface that wall's group on /problems (via the wall's
`keywords`, keyed by cruxTag). These double as the second clause of each wall's page title.

| searchQuestion | wall cruxTag |
|---|---|
| `prevent double payments` | ambiguous-failure-under-retry |
| `design a job queue` | buffer-degrades-under-backlog |
| `protect critical traffic under overload` | priority-blind-load-shedding |
| `how to shard a database` | single-table-scaling-ceiling |
| `split a monolithic database` | single-cluster-scaling-ceiling |
| `limit the blast radius` | blast-radius-scales-with-cluster-size |
| `why didn't automatic detection work` | gray-failure-defeats-automatic-detection |
| `who monitors the monitoring` | observer-shares-fate-with-observed |
| `prevent retry storms` | retry-amplified-overload |
| `prevent cascading failures` | mitigation-scoped-narrower-than-failure |
| `recover from a cascading failure` | degraded-state-outlives-its-trigger |
| `design a durable workflow` | partial-completion-under-crashes |
| `configuration not in version control` | unrecorded-config-outlives-its-authors |
| `what to put on ssd` | placement-precedes-the-access-pattern |
