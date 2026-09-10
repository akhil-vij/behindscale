# Search-terms authoring report

Author's record for `keywords/articles.json` (41), `keywords/patterns.json` (52), and
`keywords/walls.json` (14). Shows the method was applied, records per-item category coverage
and dropped candidates, and gives evidence for every alias family. Read alongside
`keywords/tests.md`, which proves the search now finds things.

## Method applied

Per item, in order: (1) read the dissection JSON — crux, cruxSummary, problem, solution,
tradeoffs, tags, `patterns[].note`, stats, artifact teaser; (2) read the original post where
reachable (see the fetch note below) for named things and the author's own failure words;
(3) added the two or three ways an engineer would type the problem as a search/interview
question, each tested against the crux; (4) checked demand for aliases and abbreviations
(evidence section below); (5) normalised — lowercase except proper nouns and product names,
singular, community hyphenation, no trailing punctuation, ≤4 words for terms (walls allow
longer natural-language questions because that is how readers type a symptom); (6) capped and
ranked (failure → technique → named → technology → question → alias), 8–15 per article, 4–8
per pattern, 6–10 per wall; (7) cross-checked collisions.

Six categories were checked against every item. Most articles populate four or five. An empty
category is a valid answer and was left empty rather than padded.

## How the search behaves (verified against a simulator)

The match model is case-insensitive, token-prefix, and multi-word queries are tokenised with
**AND** semantics: every query token must be a prefix of some indexed token in the document.
This was confirmed by a simulator built over the real corpus (title, summary, tags, company,
class label, pattern names) plus the authored fields, and it drove three consequences the
terms were written around:

- **Distinctive multi-word phrases are precise.** `head-of-line blocking`, `poison pill`,
  `silent data corruption`, `cache miss storm` each land on exactly the right items because all
  their tokens co-occur only there.
- **Question phrasings work only when authored verbatim.** Because every token must match,
  `prevent double payments` finds an article only if those tokens are present — which is why the
  question phrasings are authored as keywords on the items they answer, not left to chance.
  Stopword-heavy questions (`how to shard a database`) match more loosely and are used mainly as
  wall keywords and page-title seeds, not as the load-bearing article term.
- **Apostrophes split.** `dead man's switch` tokenises to `dead / man / s / switch`; a reader
  typing `dead mans switch` (no apostrophe) tokenises to `dead / mans / switch` and `mans` is
  not a prefix of `man`, so it misses. The reliable queries are `dead man's switch` or
  `dead man switch`; both are covered. Flagged for the implementation agent's test wording.

## Cross-cutting decisions

1. **Kafka returns five articles, not seven.** The audit's "2 of 7" counted every article where
   the word Kafka appears. Two of those seven use it only in passing: FOQS (MySQL-based; Kafka
   appears only in its related-links) and Cadence (one mention inside a list of backing stores).
   Making Kafka return those two is exactly the "lands where Kafka is a footnote" failure the
   brief warns against, so Kafka is authored to return the five where it is material —
   `doordash-rabbitmq-kafka`, `slack-scaling-job-queue`, `uber-kafka-consumer-proxy`,
   `segment-exactly-once-delivery` (all four carry Kafka as a tag already), and
   `segment-centrifuge-database-queue` (added as a keyword; the post engages Kafka's semantics
   substantively as the queue it rejects). `tests.md` states the expected set as these five and
   documents the two deliberate exclusions.

2. **Never duplicate an article's own tag as a keyword.** The field rule ("add what the tags
   miss") is enforced: a validator confirms zero keyword equals one of that article's tags
   (case-insensitive). One consequence for the worked example — Airbnb Orpheus — is that
   `MySQL` was dropped from its keywords (`mysql` is already a tag); the master-vs-replica
   specificity the worked example wanted from `MySQL` is carried instead by `replica lag` and
   `master-only reads`, which the tag does not provide.

3. **Product names stay on the item that names them, in the item's own case.** Article keywords
   keep authored case (`Orpheus`, `Kafkagate`, `Semian`, `ClientToken`, `Cinnamon`, `CoDel`,
   `FOQS`, `Colossus`). Pattern aliases are lowercase by schema, so the same names lower-case
   there (`vitess`, `kafka in front of redis`, `namenode`); noted, not fought. Company-specific
   product names were kept off the general pattern aliases unless the product is effectively
   synonymous with the technique.

4. **Same failure gets the same term across the library.** `head-of-line blocking` (never bare
   `HOL`), `replica lag`, `retry storm`, `thundering herd`, `blast radius`, `gray failure`,
   `cascading failure`, `vertical partitioning`, `protect critical traffic`, `crash between
   steps` are spelled identically everywhere they appear.

5. **Peripheral collisions demoted to the specific form.** `thundering herd` was dropped from
   `reddit-piday-outage` (a one-line recovery-traffic aside, not the crux) in favour of
   `gradual recovery`, which is what the post actually teaches. No term matches more than eight
   articles; the ones that reach four to eight (`idempotency key` 6, `load shedding` 8,
   `thundering herd` 4, `protect critical traffic` 4, `vertical partitioning` 4, `blast radius`
   4, `retry storm` 4) are central to every article they hit.

## Original-post fetch status

The dissection JSONs are detailed and served as the primary source; every term is grounded in
the dissection. Cached raw text of many original posts (AWS, GitHub, GitLab, Slack, Segment,
Uber, Meta, Cloudflare, Discord, Shopify, Airbnb, Pinterest, Notion, Figma, Canva, Colossus,
LinkedIn, Netflix, and others) was available from an earlier pass and consulted for exact
spellings. Two posts could not be fetched: **Reddit's Pi-Day post** (reddit.com blocks
automated fetch and login-walls the fallbacks) — its terms are dissection-only, flagged in that
article's notes. The Slack 2-22-22 post fetched cleanly with exact counts.

## Alias evidence

Most authored terms are first-party — they appear in the dissection or the post, so they need no
external demand check. The genuine aliases (abbreviations, spelling variants, and the one or two
synonyms in real use) are below, each with evidence from engineering writing.

- `head-of-line blocking` / `HOL blocking` — KEEP both. Wikipedia has a "Head-of-line blocking"
  page; multiple Kafka engineering posts use the exact phrase and the `HOL` abbreviation
  (Confluent/Walmart/independent blogs). The bare `HOL` was **not** added as a standalone term
  (too ambiguous alone); the full phrase carries it. Evidence: en.wikipedia.org/wiki/Head-of-line_blocking; medium.com Kafka HOL posts.
- `DLQ` / `dead-letter queue` — KEEP both. `DLQ` is standard equipment in every mature broker
  (AWS SQS "dead-letter queues", Azure Service Bus, Cloudflare Queues, Redisson) and is the term
  people type. Kept as an alias on `dead-letter-queue` and a keyword on `uber-kafka-consumer-proxy`.
- `cache stampede` / `thundering herd` / dogpile — KEEP `cache stampede` and `thundering herd`
  (both heavy demand; Redisson, Wikipedia "Thundering herd problem", multiple guides confirm the
  three are the same problem). `dogpile` was **not** added — lower demand and the two kept forms
  cover it. Placed on `load-bearing-cache` and `slack-incident-2-22-22`.
- `job queue` / `task queue` / `message queue` — KEEP all three as distinct entries. GeeksforGeeks
  "Message Queue vs. Task Queue", JobRunr, and multiple guides show all three have real,
  differentiated search demand. Used across the queue-backlog articles and `database-as-a-queue`.
- `brownout` (overload sense) — KEEP. Attested in SRE/overload literature (Google SRE cascading-
  failures/handling-overload; brownout scheduling papers). Placed on `priority-aware-load-shedding`
  and `aws-load-shedding`; disambiguated by its overload-context neighbours.
- `idempotent` / `idempotency key` / `Idempotency-Key header` — KEEP. Universal in payments-API
  writing (Adyen, Checkout.com, Stripe-style guides); the `idempotency-key` request header is a
  de-facto standard, and the "ambiguous failure / lost response / double charge" framing matches
  the class exactly. The adjective `idempotent` is reached via the phrase `idempotent api`
  (tokenised), so no bare `idempotent` was needed.
- Abbreviations taken straight from their posts (first-party, no external check needed): `SDC`
  (Meta), `BFG` (Discord), `MVCC` (Meta FOQS), `KSUID` (Segment), `ULID` (Shopify), `429`/`503`
  (Stripe), `PID controller` / `BYOS` (Uber), `GFS` (Google), `uForwarder` (Uber).

## Per-article coverage

Categories: 1 named · 2 tech · 3 failure · 4 technique · 5 question · 6 alias. "drops" lists the
notable candidates left out and why.

### Queue-backlog (buffer-degrades-under-backlog)
- **doordash-rabbitmq-kafka** — 1,3,4,5. Kept `Flow Control`, `harakiri`, `uWSGI` (named, the
  reader who lived it types these). drops: kafka/rabbitmq/celery/task-queues/migrations (own tags).
- **meta-foqs-priority-queue** — 1,3,4,5. Kept `MVCC`, `history list`, `FOQS`, `Prefetch Buffer`.
  drops: kafka (footnote only — see Kafka decision); queues/mysql (tags).
- **segment-centrifuge-database-queue** — 1,3,4,5,6. `Kafka` added (substantive rejection of it);
  `noisy neighbor` alias for the whale-customer failure. drops: database-as-a-queue (pattern name,
  indexed).
- **slack-scaling-job-queue** — 1,3,4,5. `Kafka in front of Redis` is the durable-front-buffer
  shorthand and the literal fix. drops: kafka/redis (tags).
- **uber-kafka-consumer-proxy** — 1,3,4,5,6. `DLQ` alias; `poison pill`, `out-of-order commit`,
  `watermark`. drops: head-of-line-blocking/kafka/grpc (own tags).

### Ambiguous-timeouts (ambiguous-failure-under-retry)
- **airbnb-orpheus-idempotent-payments** — 1,3,4,5,6. Worked-example set minus `MySQL` (tag).
- **aws-idempotent-apis** — 1,3,4,5. `ClientToken`, `RunInstances`, `replay the response`. drops:
  idempotency/ec2/retries (tags).
- **segment-exactly-once-delivery** — 1,3,4,5. `messageId`, `bloom filter`, `dedupe window`,
  `Memcached` (the replaced system). drops: kafka/rocksdb/exactly-once (tags).
- **shopify-resilient-payments** — 1,3,4,5. `Semian`, `ULID`, `Little's Law`. drops: circuit-breakers
  (tag) so no bare "circuit breaker".
- **stripe-idempotency** — 1,3,4,5,6. `Idempotency-Key header`, `jitter`, `thundering herd`.

### Priority-blind load shedding + mitigation gap
- **aws-load-shedding** — 1,3,4,5. `load balancer health check` (the crux), `brownout`,
  `Universal Scalability Law`, `max connections`. drops: load-shedding/overload/goodput/prioritization
  (tags) so `goodput plateau` (adds "plateau") kept instead of bare goodput.
- **linkedin-hodor-overload-protection** — 1,3,4,5. `Hodor`, `CPU starvation`, `garbage collection
  pause`, `thread pool exhaustion`. drops: load-shedding/jvm (tags).
- **netflix-prioritized-load-shedding** — 1,3,4,5. `PlayAPI`, `Zuul`, `congestive failure`,
  `partitioned concurrency limiter`. drops: prioritization/concurrency/backpressure (tags).
- **stripe-rate-limiters** — 1,3,4,5,6. `token bucket`, `429`/`503`, `flapping`, `criticality
  ladder`, `dark launch`. drops: rate-limiting/redis (tags).
- **uber-intelligent-load-management** — 1,3,4,5. `Cinnamon`, `CoDel`, `PID controller`, `Docstore`,
  `Schemaless`, `bring your own signal`, `split brain`. drops: rate-limiting/control-systems (tags).
- **doordash-aperture-global-failure-mitigation** — 1,3,4,5. `Aperture`, `Prometheus`, `cascading
  failure`, `death spiral`, `metastable failure`, `shed at the edge`. drops: circuit-breaker/load-shedding
  (tags) so no bare "circuit breaker".

### Single-table sharding + Colossus
- **canva-media-dynamodb** — 1,3,4,5,6. `gh-ost`, `2TB table limit`, `RDS`, `SQS`, `NewSQL`, `dual
  reads`, `hot data first`. drops: dynamodb/mysql/nosql (tags).
- **figma-postgres-sharding** — 1,3,4,5. `DBProxy`, `vacuum`, `logical sharding`, `Postgres views`,
  `scatter-gather`, `colocation`. drops: postgres/sharding (tags).
- **notion-sharding-postgres** — 1,3,4,5. `transaction ID wraparound`, `VACUUM stalls`, `workspace
  ID`, `Citus`, `dark reads`, `double-write`, `logical shards`. drops: postgres/sharding (tags).
- **pinterest-sharding-mysql** — 1,3,4,5. `virtual shards`, `ID-encoded placement`, `ID as address`,
  `64-bit ID`, `ZooKeeper`, `hot shard`, `stale replica read`. drops: sharding/mysql/id-generation (tags).
- **google-colossus** — 1,3,4,5. `Curators`, `Bigtable`, `GFS`, `metadata bottleneck`, `single
  master`, `shared pool`, `tiered storage`. drops: metadata/disaggregation/google (tags).
- **google-colossus-ssd-placement** — 1,3,4,5. `L4`, `CacheSack`, `read cache`, `writeback cache`,
  `online simulation`, `SSD vs HDD`. drops: ssd/caching/data-placement (tags).

### Single-cluster splits + retry-amplified overload
- **airbnb-partitioning-main-database** — 1,3,4,5. `replica promotion`, `read replica promotion`,
  `snapshot latency spike`, `Multi-AZ`, `Zookeeper`, `planned downtime`. drops: rds/partitioning (tags).
- **github-partitioning-relational-databases** — 1,3,4,5. `schema domains`, `query linter`, `virtual
  partitioning`, `write cutover`, `application-side joins`, `Vitess`, `mysql1`, `blast radius`. drops:
  mysql/partitioning/rails/linters (tags).
- **gitlab-database-decomposition** — 1,3,4,5. `loose foreign keys`, `violation ratchet`, `allowlist`,
  `vacuum saturation`, `Patroni`, `write bottleneck`, `decompose a database`. drops: postgres/rails/ci-cd (tags).
- **slack-vitess-datastores** — 1,3,4,5. `keyspace`, `channel id`, `sharding behind a proxy`,
  `query layer`, `resharding`, `hot shard`, `shard hot spots`. drops: vitess/sharding/multi-tenancy (tags).
- **aws-timeouts-retries-backoff-jitter** — 1,3,4,5,6. `retry storm`, `full jitter`, `token bucket`,
  `retries amplify overload`, `idempotency key`. drops: timeouts (tag → bare "timeout" is a prefix of it).

### Blast-radius + gray-failure
- **aws-shuffle-sharding** — 1,3,4,5,6. `shuffle sharding`, `Route 53`, `Infima`, `poison request`,
  `DDoS`, `noisy neighbor`, `workload isolation`. drops: multi-tenancy/fault-isolation/dns (tags).
- **discord-trillions-message-search** — 1,3,4,5. `Lucene`/`Lucene limit`, `BFG`, `PubSub`, `batch by
  destination`, `coordination overhead`, `dropped messages`, `search all my DMs`. drops:
  elasticsearch/sharding/kubernetes (tags).
- **shopify-pods-architecture** — 1,3,4,5. `pods`, `Sorting Hat`, `Pod Mover`, `fan-out failure`,
  `platform-wide outage`, `shared resource`, `data center failover`. drops: cell-architecture/mysql (tags);
  Redismageddon left out (internal joke-name, low demand).
- **cloudflare-byzantine-failure** — 1,3,4,5. `Byzantine failure`, `omission fault`, `split brain`,
  `false failover`, `primary promotion`, `partial network failure`, `conservative auto-remediation`. drops:
  etcd/raft/consensus (tags).
- **meta-silent-data-corruption** — 1,3,4,5,6. `SDC`, `Fleetscanner`, `Ripple`, `known-answer testing`,
  `deep test`, `shallow test`, `wrong answer no error`. drops: silent-data-corruption/cpus (tags).
- **slack-cellular-architecture** — 1,3,4,5. `drain button`, `siloing`, `Rotor`, `availability zone
  failure`, `components disagree`, `cell architecture`, `generic mitigation`. drops: cellular-architecture/envoy (tags).

### Observer-fate + workflows
- **airbnb-monitoring-reliably-at-scale** — 1,3,4,5. `dead man's switch`, `heartbeat`, `meta-monitoring`,
  `circular dependency`, `Prometheus`, `Envoy`, `who monitors the monitoring`. drops: observability/monitoring/fault-isolation (tags).
- **datadog-incident-response-observer-fate** — 1,3,4,5. `unattended-upgrades`, `Cilium`, `silence
  looks like health`, `auto-update outage`, `external watcher`, `staged rollout`. drops: observability/kubernetes (tags).
- **roblox-return-to-service** — 1,3,4,5. `BoltDB`, `Nomad`, `DNS steering`, `throttled readmission`,
  `single point of failure`, `cold cache`, `return to service`. drops: consul/observability/on-prem (tags).
- **netflix-conductor-microservices-orchestrator** — 1,3,4,5. `Conductor`, `Decider`, `what remains`,
  `stalled workflow`, `state machine`, `orchestration`, `orchestration vs choreography`. drops:
  workflow-orchestration/choreography (tags).
- **skipper-workflow-engine** — 1,3,4,5. `Skipper`, `Temporal`, `crash between steps`, `replay`,
  `checkpoint`, `hibernation`, `embedded workflow engine`, `resume after crash`. drops: durable-execution/saga/compensation (tags).
- **uber-cadence-workflow-platform** — 1,3,4,5. `Cadence`, `Temporal`, `duplicated plumbing`, `shared
  dependency`, `workflow as code`, `central workflow engine`, `deterministic workflow`. drops:
  workflows/orchestration/durable-execution (tags).

### Metastable + unrecorded config (incident dissections)
- **slack-incident-2-22-22** — 1,3,4,5. `cascading failure` and `Memcached` added deliberately (both
  are the post's own high-frequency vocabulary and were unfindable — see tag list below);
  `cache miss storm`, `hit rate collapse`, `scatter query`, `Mcrib`, `tipping point`. drops:
  metastable-failure/caching/vitess/consul (tags).
- **reddit-piday-outage** — 1,3,4,5 (dissection-only; post fetch failed). `unrecorded config`,
  `route reflector`, `node-role.kubernetes.io/master`, `Kubernetes 1.24`, `no downgrade path`,
  `rehearsed restore`, `etcd`, `gradual recovery`. drops: `thundering herd` (peripheral → swapped for
  `gradual recovery`); kubernetes/calico/configuration (tags).

## Per-pattern notes (52)

All 52 patterns received the same six-category pass, lowercased, capped 4–8. Highlights:

- **The `backlog` fix.** The audit's "backlog returns nothing on /patterns" is now solved:
  `backlog` is an alias on `durable-front-buffer`, `database-as-a-queue`,
  `queue-with-guaranteed-delivery`, and (as "scan slows as backlog grows") `checkpoint-bounded-scans`
  — four patterns, verified.
- **Existing owner-authored aliases were preserved and extended**, never replaced: e.g.
  `circuit-breaker` keeps fail fast / half-open / trip the circuit; `fault-isolation` keeps
  blast radius / bulkhead / noisy neighbor / failure domains / cascading failures.
- **Company product names dropped from general patterns**: `semian` removed from `circuit-breaker`,
  `bigtable` removed from `distributed-metadata-model` — those belong on the article that names
  them, not the general technique. `vitess` kept on `sharding-behind-a-proxy` and `kafka in front
  of redis` on `durable-front-buffer` because each is effectively synonymous with the technique.
- **Abbreviations added where standard**: `dlq`, `cdc`, `iac`, `sdc`, `sack`, `pid controller`.

## Per-wall notes (14)

Each wall carries the plain-English symptom, the interview question, and — for the compared walls —
the technique words the five companies share. The single best question phrasing is set as
`searchQuestion` (the second clause of the wall's page title):

| cruxTag (url slug) | searchQuestion |
|---|---|
| ambiguous-failure-under-retry (ambiguous-timeouts) | prevent double payments |
| buffer-degrades-under-backlog (queue-backlog) | design a job queue |
| priority-blind-load-shedding (blind-load-shedding) | protect critical traffic under overload |
| single-table-scaling-ceiling (outgrowing-one-table) | how to shard a database |
| single-cluster-scaling-ceiling (outgrowing-one-cluster) | split a monolithic database |
| blast-radius-scales-with-cluster-size (cluster-blast-radius) | limit the blast radius |
| gray-failure-defeats-automatic-detection (gray-failure) | why didn't automatic detection work |
| observer-shares-fate-with-observed (blind-during-outages) | who monitors the monitoring |
| retry-amplified-overload (retry-storms) | prevent retry storms |
| mitigation-scoped-narrower-than-failure (mitigation-gaps) | prevent cascading failures |
| degraded-state-outlives-its-trigger (metastable-failure) | recover from a cascading failure |
| partial-completion-under-crashes (interrupted-operations) | design a durable workflow |
| unrecorded-config-outlives-its-authors (undocumented-config) | configuration not in version control |
| placement-precedes-the-access-pattern (blind-data-placement) | what to put on ssd |

Walls are keyed by `cruxTag` (e.g. `ambiguous-failure-under-retry`), not the public URL slug, as
the field contract requires.

## Articles whose tags are wrong or thin (list, do not fix)

1. **slack-incident-2-22-22** — the priority fix. Tags are
   `[incident-response, caching, metastable-failure, vitess, consul]`. Missing **`cascading-failure`**
   (the post's own primary term, used ~9×; the tag set only has `metastable-failure`, which appears
   once in the post and only inside a cited paper's title) and **`memcached`** (used ~10× in the
   post, 0× in the dissection body, so it is currently unfindable at the source). A mitigation tag
   (`load-shedding` or `throttling`) and `scatter-query` would also help. The keywords now cover
   these for search, but the tags themselves should be corrected at the source.
2. **reddit-piday-outage** — `configuration` is too vague; consider `configuration-drift` or
   `unrecorded-config`. The entire recovery half (no-downgrade, backup/restore, the etcd
   certificate trap, staged traffic return) is untagged; consider `disaster-recovery` /
   `backup-restore` and `etcd`.
3. **Company-name-as-tag redundancy** — `google-colossus` carries `google`, `meta-foqs-priority-queue`
   carries `meta`. Company is already an indexed field, so these tags add noise, not recall.
   Harmless but worth trimming.
4. **Generic `distributed-systems` tag** — on `airbnb-orpheus-idempotent-payments`,
   `aws-idempotent-apis`, and `skipper-workflow-engine`. It is on the brief's "not a term" list
   (generic); as a tag it adds little the class label and keywords do not already carry. Low priority.
