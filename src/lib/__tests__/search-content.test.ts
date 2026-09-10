import { describe, it, expect } from 'vitest'
import { articles, patterns, cruxtags } from '../../content'
import { matchTerms } from '../search'
import { articleTerms, patternTerms, cruxTagTerms } from '../searchTerms'

// keywords/tests.md, turned into the search unit suite (Batch 3). Every case is
// query -> expected slugs, produced by the authoring agent's simulator of the
// site's match model (case-insensitive, token-prefix, multi-word AND) run over
// the real corpus + the authored keywords/aliases. These assert the shipped
// search against the shipped content, so a drift in either side is caught here.

function articleHits(q: string): string[] {
  return articles
    .filter((a) => matchTerms(q, articleTerms(a)) !== null)
    .map((a) => a.slug)
    .sort()
}
function patternHits(q: string): string[] {
  return patterns
    .filter((p) => matchTerms(q, patternTerms(p)) !== null)
    .map((p) => p.slug)
    .sort()
}
// A wall (cruxTag) surfaces on /problems when its cruxTagTerms match.
function wallHits(q: string): string[] {
  return Object.keys(cruxtags)
    .filter((slug) => {
      const entry = cruxtags[slug]
      return entry !== undefined && matchTerms(q, cruxTagTerms(slug, entry)) !== null
    })
    .sort()
}
const sorted = (xs: string[]) => [...xs].sort()

describe('Required anchors (keywords/tests.md)', () => {
  it('R1: "Kafka" -> the 5 material articles, and NOT the 2 footnote articles', () => {
    const hits = articleHits('Kafka')
    expect(hits).toEqual(
      sorted([
        'doordash-rabbitmq-kafka',
        'slack-scaling-job-queue',
        'uber-kafka-consumer-proxy',
        'segment-exactly-once-delivery',
        'segment-centrifuge-database-queue',
      ]),
    )
    expect(hits).not.toContain('meta-foqs-priority-queue')
    expect(hits).not.toContain('uber-cadence-workflow-platform')
  })

  it('R2: "backlog" on /patterns -> >= 2 (the 4 authored)', () => {
    const hits = patternHits('backlog')
    expect(hits.length).toBeGreaterThanOrEqual(2)
    expect(hits).toEqual(
      sorted([
        'durable-front-buffer',
        'database-as-a-queue',
        'queue-with-guaranteed-delivery',
        'checkpoint-bounded-scans',
      ]),
    )
  })

  it('R3: "Orpheus" -> the Airbnb article only', () => {
    expect(articleHits('Orpheus')).toEqual(['airbnb-orpheus-idempotent-payments'])
  })
})

// query -> exact expected article slugs.
const ARTICLE_EXACT: Array<[string, string[]]> = [
  ['double payment', ['airbnb-orpheus-idempotent-payments', 'shopify-resilient-payments', 'stripe-idempotency']],
  ['double charge', ['airbnb-orpheus-idempotent-payments', 'shopify-resilient-payments', 'stripe-idempotency']],
  ['duplicate charge', ['airbnb-orpheus-idempotent-payments', 'stripe-idempotency']],
  ['replica lag', ['airbnb-orpheus-idempotent-payments', 'canva-media-dynamodb', 'pinterest-sharding-mysql']],
  ['head-of-line blocking', ['doordash-rabbitmq-kafka', 'segment-centrifuge-database-queue', 'uber-kafka-consumer-proxy']],
  ['poison pill', ['uber-kafka-consumer-proxy']],
  ['thundering herd', ['aws-timeouts-retries-backoff-jitter', 'doordash-aperture-global-failure-mitigation', 'stripe-idempotency', 'uber-intelligent-load-management']],
  ['retry storm', ['aws-load-shedding', 'aws-timeouts-retries-backoff-jitter', 'doordash-aperture-global-failure-mitigation', 'linkedin-hodor-overload-protection']],
  ['cascading failure', ['doordash-aperture-global-failure-mitigation', 'slack-incident-2-22-22']],
  ['metastable failure', ['doordash-aperture-global-failure-mitigation', 'slack-incident-2-22-22']],
  ['gray failure', ['cloudflare-byzantine-failure', 'meta-silent-data-corruption', 'slack-cellular-architecture']],
  ['blast radius', ['aws-shuffle-sharding', 'discord-trillions-message-search', 'github-partitioning-relational-databases', 'shopify-pods-architecture']],
  ['noisy neighbor', ['aws-shuffle-sharding', 'segment-centrifuge-database-queue', 'uber-intelligent-load-management']],
  ['split brain', ['cloudflare-byzantine-failure', 'uber-intelligent-load-management']],
  ['silent data corruption', ['meta-silent-data-corruption']],
  ['circular dependency', ['airbnb-monitoring-reliably-at-scale', 'datadog-incident-response-observer-fate', 'roblox-return-to-service']],
  ['crash between steps', ['skipper-workflow-engine', 'uber-cadence-workflow-platform']],
  ['cold cache', ['roblox-return-to-service', 'slack-incident-2-22-22']],
  ['brownout', ['aws-load-shedding']],
  ['hot shard', ['canva-media-dynamodb', 'pinterest-sharding-mysql', 'slack-vitess-datastores']],
  ['scatter query', ['figma-postgres-sharding', 'slack-incident-2-22-22']],
  ['write bottleneck', ['airbnb-partitioning-main-database', 'gitlab-database-decomposition']],
  ['death spiral', ['doordash-aperture-global-failure-mitigation', 'netflix-prioritized-load-shedding']],
  ['transaction ID wraparound', ['notion-sharding-postgres']],
  ['exactly once', ['airbnb-orpheus-idempotent-payments', 'meta-foqs-priority-queue', 'segment-exactly-once-delivery', 'stripe-idempotency']],
  ['backpressure', ['netflix-prioritized-load-shedding', 'uber-intelligent-load-management', 'uber-kafka-consumer-proxy']],
  // category 5 question phrasings
  ['prevent double payments', ['airbnb-orpheus-idempotent-payments', 'shopify-resilient-payments', 'stripe-idempotency']],
  ['exactly once delivery', ['meta-foqs-priority-queue', 'segment-exactly-once-delivery']],
  ['deduplicate messages', ['segment-exactly-once-delivery']],
  ['protect critical traffic', ['linkedin-hodor-overload-protection', 'netflix-prioritized-load-shedding', 'stripe-rate-limiters', 'uber-intelligent-load-management']],
  ['idempotent API', ['airbnb-orpheus-idempotent-payments', 'aws-idempotent-apis', 'aws-timeouts-retries-backoff-jitter', 'stripe-idempotency']],
  ['safe retry', ['aws-idempotent-apis', 'aws-timeouts-retries-backoff-jitter', 'shopify-resilient-payments', 'stripe-idempotency']],
  ['resume after crash', ['netflix-conductor-microservices-orchestrator', 'skipper-workflow-engine']],
  ['who monitors the monitoring', ['airbnb-monitoring-reliably-at-scale', 'datadog-incident-response-observer-fate']],
  ['shard Postgres', ['figma-postgres-sharding', 'notion-sharding-postgres']],
  ['what to put on SSD', ['google-colossus-ssd-placement']],
]

// Named-thing precision: exactly one article each (proof named terms don't leak).
const NAMED_ONE: Array<[string, string]> = [
  ['harakiri', 'doordash-rabbitmq-kafka'],
  ['Kafkagate', 'slack-scaling-job-queue'],
  ['FOQS', 'meta-foqs-priority-queue'],
  ['Consumer Proxy', 'uber-kafka-consumer-proxy'],
  ['ClientToken', 'aws-idempotent-apis'],
  ['Semian', 'shopify-resilient-payments'],
  ['Cinnamon', 'uber-intelligent-load-management'],
  ['Aperture', 'doordash-aperture-global-failure-mitigation'],
  ['gh-ost', 'canva-media-dynamodb'],
  ['DBProxy', 'figma-postgres-sharding'],
  ['drain button', 'slack-cellular-architecture'],
  ['Sorting Hat', 'shopify-pods-architecture'],
  ['CacheSack', 'google-colossus-ssd-placement'],
  ['Fleetscanner', 'meta-silent-data-corruption'],
  ['Cadence', 'uber-cadence-workflow-platform'],
]

const NAMED_MANY: Array<[string, string[]]> = [
  ['Vitess', ['github-partitioning-relational-databases', 'notion-sharding-postgres', 'slack-incident-2-22-22', 'slack-vitess-datastores']],
  ['Colossus', ['google-colossus', 'google-colossus-ssd-placement']],
  ['Temporal', ['skipper-workflow-engine', 'uber-cadence-workflow-platform']],
  ['token bucket', ['aws-timeouts-retries-backoff-jitter', 'stripe-rate-limiters']],
  ['DLQ', ['uber-kafka-consumer-proxy']],
  ['PID controller', ['uber-intelligent-load-management']],
]

const PATTERN_EXACT: Array<[string, string[]]> = [
  ['backlog', ['checkpoint-bounded-scans', 'database-as-a-queue', 'durable-front-buffer', 'queue-with-guaranteed-delivery']],
  ['dlq', ['dead-letter-queue']],
  ['exponential backoff', ['retry-with-backoff-and-jitter']],
  ['load shedding', ['feedback-controlled-load-management', 'priority-aware-load-shedding']],
  ['idempotency', ['idempotency-keys']],
  ['saga', ['durable-workflows']],
  ['noisy neighbor', ['fault-isolation', 'shuffle-sharding']],
  ['cache stampede', ['load-bearing-cache']],
  ['exactly once', ['idempotency-keys']],
  ['rate limiter', ['layered-admission-control']],
  ['head-of-line blocking', ['fetch-execute-decoupling', 'selective-acknowledgment']],
  ['heartbeat', ['dead-mans-switch']],
  ['source of truth', ['designated-source-of-truth']],
  ['cdc', ['content-free-change-events']],
  ['watermark', ['checkpoint-bounded-scans']],
]

// searchQuestion -> the wall (cruxTag) it must surface on /problems.
const WALL_QUESTIONS: Array<[string, string]> = [
  ['prevent double payments', 'ambiguous-failure-under-retry'],
  ['design a job queue', 'buffer-degrades-under-backlog'],
  ['protect critical traffic under overload', 'priority-blind-load-shedding'],
  ['how to shard a database', 'single-table-scaling-ceiling'],
  ['split a monolithic database', 'single-cluster-scaling-ceiling'],
  ['limit the blast radius', 'blast-radius-scales-with-cluster-size'],
  ["why didn't automatic detection work", 'gray-failure-defeats-automatic-detection'],
  ['who monitors the monitoring', 'observer-shares-fate-with-observed'],
  ['prevent retry storms', 'retry-amplified-overload'],
  ['prevent cascading failures', 'mitigation-scoped-narrower-than-failure'],
  ['recover from a cascading failure', 'degraded-state-outlives-its-trigger'],
  ['design a durable workflow', 'partial-completion-under-crashes'],
  ['configuration not in version control', 'unrecorded-config-outlives-its-authors'],
  ['what to put on ssd', 'placement-precedes-the-access-pattern'],
]

describe('Article queries (keywords/tests.md)', () => {
  it.each(ARTICLE_EXACT)('"%s" -> exact set', (q, expected) => {
    expect(articleHits(q)).toEqual(sorted(expected))
  })
})

describe('Named-thing precision (keywords/tests.md)', () => {
  it.each(NAMED_ONE)('"%s" -> exactly %s', (q, expected) => {
    expect(articleHits(q)).toEqual([expected])
  })
  it.each(NAMED_MANY)('"%s" -> exact set', (q, expected) => {
    expect(articleHits(q)).toEqual(sorted(expected))
  })
  it('"dead man\'s switch" includes the intended Airbnb article', () => {
    // The apostrophe splits; cloudflare can appear as a weak token coincidence,
    // so assert the intended hit is present rather than exact.
    expect(articleHits("dead man's switch")).toContain('airbnb-monitoring-reliably-at-scale')
  })
})

describe('Loose (stopword-heavy) queries (keywords/tests.md)', () => {
  // `~` cases: the intended hits must lead; extras are allowed by construction.
  it('"design a job queue" surfaces the two intended', () => {
    const hits = articleHits('design a job queue')
    expect(hits).toContain('segment-centrifuge-database-queue')
    expect(hits).toContain('slack-scaling-job-queue')
  })
  it('"how to shard a database" surfaces the two intended', () => {
    const hits = articleHits('how to shard a database')
    expect(hits).toContain('canva-media-dynamodb')
    expect(hits).toContain('discord-trillions-message-search')
  })
})

describe('Pattern queries (keywords/tests.md)', () => {
  it.each(PATTERN_EXACT)('"%s" -> exact set', (q, expected) => {
    expect(patternHits(q)).toEqual(sorted(expected))
  })
})

describe('Wall searchQuestion seeds (keywords/tests.md)', () => {
  it.each(WALL_QUESTIONS)('"%s" surfaces %s', (q, cruxTag) => {
    expect(wallHits(q)).toContain(cruxTag)
  })
})
