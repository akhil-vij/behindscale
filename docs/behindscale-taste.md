# behindscale — The Taste Document

*A running blueprint for authoring articles and artifacts, and the editorial
spine for any Fable agent working on the project. It captures the judgment that
makes a piece feel like behindscale rather than a generic dissection — the part
that lives in neither the schema nor the architecture. Update it as the taste
sharpens; treat contradictions between this and an older instruction as this
winning.*

**Version 5** — v4 plus the readability doctrine appended after the
2026-07 two-pass audit of the 23 live articles (see the dated section
following the round-27 entry). Version 4 was: updated through the
round 27 authoring run. The v3 base
(rounds 12–18: Airbnb Orpheus, Netflix Conductor, Stripe rate limiters,
Pinterest sharding, Segment Centrifuge, Datadog 2023-03-08, Shopify pods) took
seven cruxTag classes to three companies; the appended round sections
(19–27: AWS timeouts doctrine, Uber consumer proxy, Segment exactly-once,
Slack Vitess, Canva DynamoDB, AWS load shedding, GitLab decomposition, Meta
silent data corruption, DoorDash RabbitMQ→Kafka) then built the board to two
FIVE-company classes (ambiguous-failure; buffer-degrades) and five
FOUR-company classes, eliminated the last 2-company class (every class now
3+), and added the editorial rules recorded in each round's section below:
vendor-case-study and shelve-don't-force source bars, coinage and
process-pattern mint rulings, unread-sibling and secondary-press-fact
disclosure, informed-refusal beats for declined plans, one-chip-round
honesty, chips-assert-use, honest-update notes, and the sim-design laws the
verification gates taught. The header last matched the content at v3; this
version restores the contract that the label tracks the appends.
Changes since v2: taxonomy updated with seven third-company fills and the
manifestation-caveat doctrine (§3.5); pattern discipline gains the
retired-names check (learned the hard way — a retired name was re-minted and
retracted), the conditional-mint protocol, the cameo rule, and canonical
two-company mints (§4); source discipline gains the depth floor, multi-post
scoping, and date-provenance rules (§2); artifacts gain the verification gate
as a required step, the stage-machine-vs-interval law, and six named craft
moves (§6); the accent registry is extended through round 18 with three
live-registry resolutions and two swap-candidate corrections (§6).
**Version 2** — updated after six articles, the five-article quality sprint,
the first recurrence-driven article (Netflix), and the first interview-bridge
prototype. Changes since v1: added the **crux** as a required content element
(§3.5); added **the reading-shell vs artifact idiom split** as an explicit
visual law (§6.0); added the **interview bridge** as a new content type with
its own authoring bar (§7.5); marked recurrence-driven sourcing as **proven**
(§4); folded in the recurring authoring lessons the sprint surfaced (production
numbers must live in body prose, not only the summary; JSX text takes literal
characters, not unicode escapes). If you are a Fable agent reading this for the
first time: read §0–§6 before authoring anything, and treat §1 (quality over
cadence) and §2 (source discipline) as inviolable.

---

## 0. Who this is for and why it exists

behindscale exists for one reader: a **senior or staff engineer building real
system-design depth** — often for interviews, often just to think better — who
is tired of hypothetical "design Twitter" exercises and wants to understand how
actual teams solved actual problems at scale, and *what those choices cost*.

That reader is sharp. They will catch a hand-waved number, a fabricated
mechanism, or a tradeoff that reads like a press release. The entire value of
the site is that it respects them: every claim is traceable to a first-party
engineering blog, every tradeoff is honest, every artifact teaches a real
mechanism. The moment we publish something shallow or made-up, we've become
the aggregators we're better than.

This document is the blueprint so that a second author — human or agent — can
produce work indistinguishable in quality from the first five. If we ever run
a team of authoring agents, this is the shared spine they calibrate against.

The reference articles, in rough order of how well they embody the bar:
`discord-trillions-message-search` and `uber-intelligent-load-management` are
the high bar; `netflix-prioritized-load-shedding`,
`airbnb-monitoring-reliably-at-scale`, and `skipper-workflow-engine` are strong;
`stripe-idempotency` is the lean-but-honest baseline. When in doubt, read those
before authoring — and their artifacts, which are the interaction bar.

---

## 1. The first principle: quality over everything, always

Every other rule in this document is downstream of one commitment: **we would
rather publish two excellent articles a week than three with drift.** Cadence
is a target, never a justification. If hitting a number would mean a generic
tradeoff, a decorative artifact, or a placeholder pattern note, miss the
number.

Drift is the real enemy, and it's gradual: tradeoffs slowly becoming generic,
artifacts slowly becoming illustrative, pattern notes slowly becoming
placeholders. None of these fail loudly. The defense is to re-read the high-bar
articles before each new one and ask the single governing question:

> **Would the engineer who built this system nod in recognition when reading
> our dissection — and would the staff engineer reading it learn something
> real they could deploy in their own thinking?**

If either answer is no, it's not ready.

---

## 2. Source discipline (non-negotiable)

**First-party official engineering blogs only.** Uber Engineering, Stripe
Engineering, Discord Engineering, Netflix Tech Blog, Cloudflare, Meta, and the
like. Not personal blogs, not Substacks, not conference recaps, not third-party
explainers, not aggregator summaries — *even when they cover the same material
and even when they're excellent.*

This is the rule that the seed Stripe article violated and we had to repair:
its richest content (atomic phases, recovery points) came from the author's
*personal* blog series, imported under the official post's attribution. The
lesson is permanent and it has two parts:

1. **Dissect the cited post and only the cited post.** If the official post is
   thin, the dissection is honestly thin (see Stripe — lean, true, two
   patterns). Narrower and accurate beats richer and misattributed. That's the
   whole thesis of the site in one sentence.
2. **When a post references a prior post** (Discord's 2025 → 2017, Uber's
   companion Cinnamon/PID posts), the convention is: dissect the newest post as
   the canonical source, and reference the earlier ones in prose with
   hyperlinks. Their content is supporting context, never folded in under the
   newer post's attribution.

Every figure, component name, and mechanism in the article must trace to a
sentence in the source. Before publishing, do a source-fidelity pass: anything
you can't point to a sentence for is either cut or explicitly flagged as
interpretation (and interpretation belongs in tradeoffs, never in the
problem/solution description of what the system *is*).

**The recurring failure modes, all caught in the sprint, all from generation
that didn't read the source carefully:** wrong publication dates (three of five
articles had them), invented example figures ("cross 15ms → shed 50%", a
"10ms P90 target" — neither in Uber's post), a fabricated mechanism (Skipper's
"idempotency key derived from instance ID + sequence number" — not in the
post), a component that didn't exist ("Helix" for Uber — it's Schemaless),
wrong storage backends ("DynamoDB" as Skipper's state store — it's MySQL/UDS),
and manufactured counts ("four circular dependencies" — the Airbnb post never
counts them). Read the source. Then read it again for the numbers.

**Source-bar clarifications (rounds 12–18):**
- **The depth floor.** A very short post (Shopify pods, a 3-minute
  read) can carry a dissection IF it is complete — problem, mechanism,
  operations all stated — and the article pads nowhere. The depth gets
  an explicit owner-attention flag in the decision log; the owner may
  veto the round on depth grounds. Developer-education and
  API-documentation posts fail the bar outright, even from great
  companies (a Square idempotency explainer was rejected on this
  rule); book chapters (Google SRE) are a source-TYPE precedent
  requiring an owner call before pitching.
- **Multi-post incidents.** Pick ONE primary post for the dissection;
  scope siblings as secondary first-party for specific fact classes
  (incident evidence, outcome numbers — never mechanism), with the
  scoping recorded in the decision log (Datadog's three-post deep
  dive; DoorDash's May-12 postmortem). Figures with
  secondary-provenance outside the company's own posts (earnings
  calls, press) stay out entirely.
- **Date provenance.** Distrust platform-migration metadata for
  `publishedAt` (a Medium migration stamped 2017 on a 2015 post);
  prefer the display date corroborated by a contemporaneous external
  (the HN thread). Verify that migrated/archived source URLs render
  for readers at publish time.

---

## 3. The article: structure and voice

The structure is fixed (summary, problem, solution, tradeoffs, patterns,
optional relatedArticles, artifact); the substance must be particular to each
system. Consistent skeleton, distinct flesh.

### Summary
2–4 sentences. What the system is, the shape of the solution, and — where the
post supports it — the headline result. The Discord summary is the model: it
names the preserved decision and the replaced components in one breath, so the
reader knows the article's spine before reading it.

### Problem
Multiple paragraphs. Establish the constraint the team actually faced, at the
scale they faced it, in their terms. Resist the urge to make the problem sound
universal — make it sound *real*. Uber's problem isn't "rate limiting is hard";
it's "tens of millions of requests per second across thousands of clusters,
where a single noisy tenant degrades everyone and mass rejection feeds retry
storms." Specificity here is what earns the reader's attention for the
solution.

When a post documents an *evolution* (Discord, Uber's three phases), the
problem section is where you establish that the original design was **correct
for its scale** before describing the limits it reached. This is the
charitable-reading principle (§5) operationalized.

### Solution
The heart. Walk the actual mechanism — the specific components, the specific
data flow, the specific tradeoffs the team made — at a depth where a staff
engineer could sketch the architecture afterward. Name things precisely: not
"a custom routing layer" but "a Rust+tokio service spawning one task per
(cluster, index) destination." When the post gives a number, use it. When it
doesn't, characterize the *shape* of the effect ("substantial tail-latency
reduction") rather than inventing a magnitude.

If a mechanism's behavior is implementation-dependent and the post says so, say
so (Stripe's mid-flight recovery is "heavily implementation-dependent" — the
article says exactly that rather than papering over it). Honesty about what the
source doesn't fully resolve is itself a quality signal.

### Tradeoffs (where behindscale earns its keep)
Aim for 4–6, each a **full paragraph**, never a one-liner. Each names: the
specific cost, who feels it, when it becomes visible, and what the team accepts
in exchange. The test of a good tradeoff is that it costs the team something
*real and specific*:

> Generic (bad): "There's some operational overhead."
> behindscale (good): "Running forty smaller clusters instead of two large
> ones means roughly twenty times more cluster-management surface area — the
> team must monitor forty masters and debug forty potential failure modes,
> in exchange for no single cluster's coordination overhead growing past what
> its master node can handle."

Most engineering posts under-describe their costs because the team is proud of
what they built. Our job is to surface those costs honestly — *not* to
manufacture criticism. Where the post is genuinely balanced, paraphrase its
balance. Where it's one-sided, add the other side in language that respects the
team's reasoning. If a tradeoff is your interpretation rather than the post's
statement, that's allowed (it's what the section is for) — but know which is
which, and flag the interpretive ones on review.

A worked example of getting this right under pressure: the Uber "PID tuning"
tradeoff originally claimed the team described ongoing per-workload
calibration. The source claims the *opposite* — no per-service tuning is
Cinnamon's headline feature. The fix wasn't to delete the tradeoff; it was to
find the honest cost hiding in the correction: the tuning burden didn't vanish,
it *moved* to the platform team, paid once centrally. Better tradeoff, and
true.

### Voice
Restrained, specific, charitable, honest. No hype, no rhetorical questions, no
engagement-bait. Don't punch up the prose to be "engaging" — the specificity
*is* the engagement for this reader. Avoid the tic of summarizing the system in
adjectives ("elegant," "powerful," "robust"); show the mechanism and let the
reader supply the adjective.

### The crux (required, §3.5)

Every article names its **crux**: the one non-obvious hard problem the system
actually exists to solve, in two to four sentences, surfaced prominently near
the top (after the summary, styled as a distinct "THE CRUX" block in the
reading-shell idiom). This is the field a staff engineer scans first to decide
whether the article is worth their time — and it's what separates a dissection
from a description.

The rule: the crux is the **bottleneck**, not the summary and not the solution.
Most systems look standard until they hit a specific operational ceiling; the
crux names that ceiling, in near-source language. Discord's crux is not
"search at scale" — it's that blast radius scaled with cluster size (one bad
node failing ~40% of bulk operations was one symptom of bigness among five).
Uber's is not "load management" — it's priority-blind shedding spending the
drop budget on rides to protect batch jobs. Stripe's is
ambiguous-failure-under-retry. State it so the engineer who built the system
would say "yes, that was the hard part."

Each crux also carries a `cruxTag` — a short kebab slug naming the *reusable
bottleneck class*. cruxTags are a **second recurring-knowledge axis alongside
patterns** — patterns name solutions, cruxTags name problems — and they map to
how a staff engineer actually searches: "how do teams handle X?" When
authoring, **reuse an existing cruxTag if the bottleneck matches**; that's how
the second taxonomy compounds, and it's the move that made the first two
two-company tags: `ambiguous-failure-under-retry` (Stripe ↔ Shopify) and
`priority-blind-load-shedding` (Uber ↔ Netflix).

The ratified taxonomy (2026-07-15, twenty articles, eleven tags — check
the article JSONs for the current state before minting a new tag):
`ambiguous-failure-under-retry` (Stripe, Shopify) ·
`priority-blind-load-shedding` (Uber, Netflix) ·
`partial-completion-under-crashes` (Skipper, Cadence) ·
`single-table-scaling-ceiling` (Figma, Notion — match, not
rhyme: Figma is RDS IOPS ceiling; Notion is VACUUM stall with
TXID wraparound behind it) ·
`buffer-degrades-under-backlog` (Meta, Slack — match, not
rhyme at different terminal points: FOQS's substrate slows
under backlog (O(history-list) MVCC scan cost); Slack's Redis
seizes (dequeuing requires free memory, so a full queue
cannot drain at all). Distinct from the scaling-ceiling tags —
those name capacity limits; this names a buffer's speed
degrading with its fill level) ·
`single-cluster-scaling-ceiling` (GitHub, Airbnb — deliberately
parallel to `single-table-scaling-ceiling`, sibling ladder step:
cluster ceiling → vertical partitioning; table ceiling →
horizontal sharding. GitHub↔Airbnb are the two ends of the
same wall — a decade of virtual-before-physical schema
discipline vs two weeks + 7.5 minutes downtime) ·
`observer-shares-fate-with-observed` (Airbnb, Roblox — same
conclusion reached across a 400x difference in outage
duration: Airbnb from a smaller blast radius after their
monitoring redesign; Roblox from 73 hours of triage with the
telemetry that would have exposed Consul's pathologies
depending on the failing Consul cluster itself) ·
`blast-radius-scales-with-cluster-size` (Discord, AWS —
same class, two geometries of cell: Discord's blast came
from bulk operations fanning out across one large cluster,
answered with many small physical cells because search
queries must land where the data lives; AWS's shuffle
sharding designs the blast radius away combinatorially with
virtual, overlapping cells because any worker can serve any
request. When state pins work to nodes, the cells must be
real; when it doesn't, they can be virtual and the
arithmetic goes 100% → 25% → 1/28th on the same eight
machines) ·
`gray-failure-defeats-automatic-detection` (Slack,
Cloudflare — same class, different automation-failure
modes: Slack's automation STALLED (drain button never
fired autonomously; human drained the AZ); Cloudflare's
MISFIRED (automatic primary promotion acted on six
minutes of etcd ambiguity and humans undid it via manual
load-shed and traffic-steering). Detection under partial
failure is unreliable by nature; what the automation
does when it can't disambiguate is the axis) ·
`retry-amplified-overload` (AWS — deliberately distinct from
`ambiguous-failure-under-retry`; this is the other retry pathology,
amplification and correlation) ·
`mitigation-scoped-narrower-than-failure` (DoorDash — minted
2026-07-15 on the taxonomy-authoring insight that retry storms
are one transmission mode of a broader class: a failure
propagates through interactions across components while each
defense measures and acts only within one component. Sibling
boundary vs `retry-amplified-overload` drawn tightly inside the
definition: retry amplification is one specific transmission
mechanism with a client-local fix; this class is about the scope
mismatch between defense and failure whatever the transmission).
Nine tags are two-company as of the 2026-07-14 Cloudflare
Byzantine-failure publication (Cloudflare joining Slack on
`gray-failure-defeats-automatic-detection`, the fifth
audit-flagged singleton converted to two-company via
recurrence-driven sourcing — five fills in a row: Slack,
Airbnb, Roblox, AWS, Cloudflare); two audit-flagged
singletons remain as of the 2026-07-15 DoorDash Aperture
landing (AWS retry-amplified — same author, Colm MacCárthaigh,
as the shuffle-sharding article, already lateral-linked via
shuffle's second tradeoff — and the newly-minted
`mitigation-scoped-narrower-than-failure`, DoorDash's own
sole occupant). The DoorDash landing is the first round since
the 2026-07-08 registry seed to mint a cruxTag rather than
fill an audit singleton: the full source read reclassified
retry storms as one transmission mode of a broader class,
owner signed off at pitch, and the sibling boundary is drawn
inside the new definition. The Skipper↔Cadence
pair remains the first same-crux/opposite-solution pair in
the library (embedded-library vs central-platform durable
execution).
Earlier drafts of this document used speculative example tags
(`fan-out-failure-amplification`, `cliff-shedding-and-retry-amplification`);
those were superseded by the ratified set above — do not reintroduce them.

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

**Readability doctrine (2026-07-19)** — distilled from the two-pass
audit of the 23 live articles (rubric pass over every article;
three-persona Chrome pass over an 8-article sample; one calibration
correction folded in). These rules are the floor from the fix wave
onward: new articles are born compliant, and the fix wave's edits
are the reference implementations.

- **The entry surfaces are the contract.** Summary, cruxSummary, the
  problem's opening, and the artifact context block are where
  readers decide to stay. They get the strictest application of
  every rule below; tradeoffs and deep solution prose get latitude.
- **Stacking, not counting, is the failure.** The audit's one
  calibration miss taught this: isolated technical terms inside
  short, well-staged prose barely register (airbnb-monitoring,
  scored best-in-set with the same terms the rubric flagged), while
  three or more unglossed terms in a single entry-surface sentence
  reliably lose the reader (roblox's BoltDB/Raft sentence drew the
  audit's only genuine quit points). Never stack three unglossed
  terms in one sentence on an entry surface.
- **The summary carries its own glosses.** A summary may not use a
  term the body glosses later — the compression that creates
  summaries is exactly what strips the glosses out, and the reader
  meets the bare term first. If the summary needs the term, the
  summary carries the gloss; if it can't afford the gloss, it can't
  afford the term.
- **Assumable tech is a short list.** Kafka, Redis, Postgres, MySQL,
  Kubernetes may be used bare at staff level across domains.
  Everything else that feels universal from inside distributed
  systems — etcd, Consul, Vitess, Envoy, CoDel, BoltDB, Patroni,
  PGBouncer — is not, and takes a three-to-six-word role gloss at
  first use ("etcd, the cluster's consensus store").
- **Company nomenclature is always explained** — codenames, tier
  systems (T0–T5), internal acronyms — at first use, every article.
  The audit found this hygiene already uniformly good for codenames;
  the rule exists so it stays true, and because tier systems and
  acronyms (BYOS) were the leaks.
- **Hook first.** The summary's first sentence carries the payoff or
  the trap — "seized and stayed seized," "delay, not loss" — and a
  machinery list never precedes it. The skimmer's stay/leave calls
  turned on this alone.
- **Long solutions separate lesson from operation.** The committed
  reader loses the thread when transferable mechanisms and
  operational detail interleave for paragraphs (the prepper could
  not restate meta-foqs's dequeue path). Give the two or three
  transferable mechanisms their own clearly-marked ground.
- **Context blocks pass the standalone test** — THE PROBLEM and
  THE MOVE readable with zero article context, no term in them that
  a cold arrival can't parse ("k-way-merged by a prefetch buffer"
  was the canonical failure).
- **Glossing is the fix; deletion is not.** Technical precision and
  the house's long-sentence voice stay. Every fix in the wave was a
  gloss, a de-stack, or a reorder — no substance was removed, and
  none may be in the name of this doctrine.

**Round 26 (Meta silent data corruption): BOARD COMPLETION — no
2-company classes remain.** `gray-failure` +Meta closes the last
pair: every multi-member class now holds 3+ companies. Caveat
doctrine: SILICON GRAY — the class's purest face (correctness
corrupted with no trace in any log) forces its logic to the end:
where no passive signal can exist, evidence is MANUFACTURED
(known-answer interrogation at two depths). Precedents set: the
FIRST ONE-CHIP ROUND, declared rather than padded — a
single-lesson-deep post earns one honest mint
(`known-answer-testing`, keeping crypto's own name per the coinage
rule) with rejected chip candidates logged; and PRESS-FACT
OMISSION discipline — mechanics that exist only in secondary press
paraphrases (quarantine details) stay out of article facts even
when the rendering wants them, with the artifact's illustrative
use footer-labeled. Deployment shapes fold INTO a mint's
definition when they are the pattern's form, not a sibling pattern
(the shallow-constant/deep-rare tiers live inside
known-answer-testing).
Same discipline as everything else: the crux is traced to the source, never
invented to sound deep.

**`cruxSummary` — the browse-surface one-liner (2026-07-08).** Alongside
the full `crux` (2-4 sentences, reading-arc callout), every article now
carries a single-line **cruxSummary** — ~10-16 words compressing the crux
into what a catalog card, a landing-preview row, or a search result
should show. It is a *compression* of the crux, not an alternate framing:
same taxonomy, same near-source register, same fidelity discipline. The
card-vs-callout split is by surface, not by tone. A cruxSummary that
restates the title, hints at the solution, or drifts into marketing copy
is a bug; when the crux changes, the cruxSummary changes with it. The
validator warns at >20 words (the card assumes one line at desktop
widths); errors on missing/empty.

---

## 4. Patterns: the durable layer

Articles document systems that will themselves evolve; patterns are the
abstractions that recur and persist. The pattern library is what makes
behindscale *compounding* rather than merely additive — and it is, increasingly,
the product's front door for the interview-prep reader.

### The generality test (the one rule that keeps the library meaningful)
> **A pattern's name and definition must make sense without naming any company,
> product, or specific technology. If you can only define it by describing one
> article's use of it, it's an instance, not a pattern.**

This is the test that retired `pid-controlled-adaptive-thresholds` (PID is an
implementation) and `byos-platform-design` (BYOS is Uber's jargon), merging
them into `feedback-controlled-load-management` — a name that survives without
PID or Uber in it, definable across TCP congestion control, CoDel, Netflix's
adaptive concurrency limits, and Cinnamon. The company-specific detail didn't
disappear; it moved to the per-article `note` where it belongs.

Practical corollaries:
- **The note is where specificity lives.** Pattern definition = the general
  shape, written across multiple nameable systems. Article's pattern `note` =
  "here's how *this* system instantiates it," 1–2 sentences, specific to the
  article-pattern pair. This division means patterns stay general without
  losing the concrete.
- **Bar for adding a new pattern:** recognizable in 2–3 other systems you can
  name, clear tradeoffs, a 3–4 paragraph definition that doesn't require
  quoting the current article. `retry-with-backoff-and-jitter` cleared this
  (Ethernet CSMA/CD, TCP, AWS SDKs, gRPC/Envoy); a one-article-only idea does
  not.
- **2–6 patterns per article**, no padding. If an article genuinely embodies 3
  patterns, referencing 5 dilutes the abstraction. For dense articles, pick the
  3–5 most transferable.
- **Categories are locked:** `resilience`, `consistency`, `throughput`,
  `observability`. Three slots are reserved for future deliberate additions via
  documented decision — never by quietly adding a pattern that doesn't fit the
  four.
- **Watch singletons.** A pattern referenced by one article is a glossary
  entry; a pattern referenced by four companies is an insight. Patterns still
  at frequency 1 once the library is larger get a fold-or-keep review. This is
  also the argument for **recurrence-driven sourcing**: choose new articles
  partly to make existing patterns recur across a second and third company —
  that's when the library proves its thesis on screen rather than asserting it.
  **This is now proven, not theoretical.** The Netflix article (#6) was chosen
  precisely to recur two Uber-only singletons — `priority-aware-load-shedding`
  and `feedback-controlled-load-management` — and both are now two-company
  patterns whose detail pages show Uber and Netflix side by side. That
  side-by-side is the single most valuable thing a pattern page can show a
  staff reader, and it only exists because the article was sourced *for the
  recurrence*. Default posture for new articles: prefer a source that makes an
  existing pattern (or cruxTag) recur over one that introduces only new ones,
  unless the new system is exceptional. When two companies solve one problem
  differently, that divergence is itself the teaching material (and the seed
  of the interview bridge's "how two teams diverge" contrast, §7.5).

### Pattern discipline, sharpened (rounds 12–18)

- **Check the retired-names record before any mint.** This section
  retired `byos-platform-design` as Uber jargon — and a later round
  re-minted that exact name for DoorDash's Aperture without checking,
  requiring a retraction (chip removed, JSON deleted, content folded
  into the `feedback-controlled-load-management` note where it
  belongs). Retired names so far: `pid-controlled-adaptive-thresholds`,
  `byos-platform-design`. A mint's pre-flight now includes: the live
  library, the in-flight round folders, and this retired list.
- **The cameo rule.** A pattern chip requires the pattern to be a
  LESSON of the post; a one-line stance (Pinterest's "even today we
  don't use auto-failover") goes into tradeoffs prose with an explicit
  cross-reference and an owner-may-promote note — never a chip.
- **Canonical two-company mints.** When a new post and an existing
  article both carry the same untagged lesson, mint at two companies
  and file a back-tag agent task for the classmate
  (`master-only-reads`: Pinterest + Orpheus's replica-lag double
  charge). This is the mint-side mirror of recurrence-driven sourcing.
- **The conditional-mint protocol.** When a pattern's live existence
  is itself unverifiable from the authoring seat, ship the mint JSON
  plus a pattern note written to read correctly under both outcomes,
  plus explicit merge-or-discard instructions in the decision log
  (`independent-observability`, `cell-architecture`). Never reference
  a pattern as existing without seeing its chip on a live article or
  its JSON in a round folder — the phantom-slug guard.
- **Categories remain locked** (`resilience`, `consistency`,
  `throughput`, `observability`). The rounds 12–18 mints are assigned
  within the four (e.g. `independent-observability` → observability;
  `id-encoded-placement`, `single-writer-ownership` → throughput);
  where a mint strains the four (`choreography-vs-orchestration`,
  filed under resilience), that strain is flagged for the owner as a
  possible use of a reserved slot — never resolved by quietly
  inventing a fifth category (a first draft did exactly that and was
  corrected).
- **Company concentration follows recurrence value, not a headcount
  cap.** The test for "should this article come from a company already
  at N?" is the recurrence-driven sourcing rule above — does the
  article make an existing pattern or cruxTag recur, or extend a class
  to a new depth? — not a cap on N. But when a landing crosses prior
  precedent for a company (e.g., 4→5 articles), the round's
  `DECISIONS.md` carries an explicit sentence naming which pattern or
  cruxTag recurrence this article delivers that a comparable article
  from a new company would not. Concentration is legible; drift toward
  "always company X next" would not be without the note. First applied
  when Airbnb landed as the first four-article company (Orpheus, round
  12, 2026-07-15) — owner-approved precedent; the recurrence value
  named at pitch was taking `ambiguous-failure-under-retry` from
  two-company to three-company as the deepest server-side idempotency
  treatment on the site.

---

## 5. Charitable reading (the epistemic foundation)

Engineering teams making real decisions under real constraints rarely "make
mistakes." They make choices that were correct given what they knew, that
accumulated implications they couldn't fully anticipate, that they then adapted
to. behindscale treats them as serious people doing hard work — always.

This matters most for **evolution posts** ("we revisited this 5 years later").
The original architecture wasn't wrong; it was correct at its original scale
and reached the boundaries of its design as the system grew. The redesign is
the next iteration, not a correction. Frame evolutions this way consistently —
the Discord article and its EvolutionDiff artifact are built entirely on this:
"reaching a design's boundary is not the same as having chosen wrong, and the
choices that preserve your freedom to change are the ones worth getting right
early." That framing *is* the staff-level lesson; it's why the article matters
more than a feature list.

The test again: would the engineer who built this nod in recognition? If your
draft would make them feel patronized or second-guessed, rewrite it.

---

## 6. Artifacts: interactive, not illustrative

This is the craft that nobody else in the space does, and it's worth getting
exactly right.

### 6.0 The two idioms — a visual law, easy to get wrong

behindscale has **two distinct visual environments, and content must be built
in the correct one.** This is not a stylistic preference; it's a structural
law, and violating it is the single most common look-and-feel mistake.

- **Reading shell — light, editorial.** Everything that is *text to be read*:
  the article index, summaries, problem/solution/tradeoffs, the crux block,
  pattern pages, and the interview bridge. Warm off-white background
  (`--bg-base` `#FBFAF8`, never pure white), Inter at 16px / line-height 1.7,
  high-contrast text (`--text-primary` `#1A1A1F`), blue accent
  (`--accent-primary` `#2563EB`), monospace reserved for code/tags/eyebrows.
  Reference feel: Stripe docs, Linear blog, Mintlify. Reading comfort is the
  priority.
- **Artifact surface — dark, technical.** *Only* the interactive artifacts
  embedded per article, rendered in a dark rounded frame like a dashboard
  embedded in documentation. Background `#08090D`, monospace throughout, one
  accent over neutral grayscale. The dark/light contrast is deliberate — it
  signals "interactive exploration zone."

The trap: because artifacts are the most fun thing to build, it's natural to
reach for the dark-monospace idiom for *everything*. But a pattern page's
interview bridge is reading-shell content and must be light; building it dark
is "putting a terminal in the middle of a magazine article." **Decide first
which surface a thing lives on, then use that surface's idiom.** If it's page
content (crux, bridge, any prose), it's light. If it's an embedded interactive
artifact in an iframe, it's dark. When unsure, it's probably light.

Tokens are CSS variables (see the UI context doc). In `src/`, consume the
variables via Tailwind — **no raw hex in component files.** Artifact bundles
are self-contained iframes and inline their own values, but should mirror the
dark token palette for continuity.

### The governing rule
> **A static diagram is not an artifact. An artifact lets the reader *do*
> something — click, toggle, simulate, scrub, crash, step — and that
> interactivity must reveal something the prose can't show easily. If the prose
> section explaining the same concept would lose nothing without the artifact,
> the artifact isn't earning its keep. Cut it or redesign it.**

The clearest way to internalize this: the worst artifacts we shipped were
**code-reveal toggles and parasitic charts** — a button that shows a static
code block (old Skipper "Replay" tab), or a comparison line that's computed
from the very system it claims to contrast against rather than simulated
independently (old Uber PID chart, where the "static threshold" line was
derived from the PID system's own latency, so it asserted the comparison
instead of demonstrating it). Both *looked* interactive and taught nothing the
prose didn't.

### What an earning-its-keep artifact looks like (the six, as a ladder)
- **Stripe — "anatomy of a retry":** the same charge crashed at each of the
  three network-failure points, run with and without an idempotency key, with
  a live server-side key table. The signature move is the *toggle that flips
  the verdict* — "response lost" goes from double-charge to "the retry was a
  read." Plus a thundering-herd sim where jitter on/off visibly spreads
  synchronized retries.
- **Uber — the PID simulator:** two *independently simulated* systems (static
  vs PID) under identical traffic *with retry feedback*, so the static one
  oscillates for the real reason (its own shed traffic returning as a herd)
  while PID converges. Real P/I/D math with a bounded, leaky integral
  (anti-windup). The high bar of the library.
- **Airbnb — the failure matrix:** break shared-K8s / Istio / the
  observability stack itself, in both the before and after architectures, with
  a binary "ON-CALL PAGED / NO ONE IS PAGED" verdict. The load-bearing cell is
  the one that shows *why the Dead Man's Switch must exist*: even isolated, the
  stack can die — and silence is what catches it.
- **Skipper — crash-and-replay:** step the workflow, crash anywhere, watch
  replay skip checkpointed actions; a split state panel makes durable state
  (survives) versus in-memory state (lost) legible; hibernate-and-signal shows
  the zero-compute wait.
- **Discord — the EvolutionDiff:** a per-component before/after ledger with an
  era lens, each row showing correct-then / limit-reached / replaced-by, and
  the one PRESERVED row carrying the whole article's thesis.
- **Netflix — failure injection + the two shedding curves:** inject 2s latency
  into pre-fetch and watch the verdict flip (baseline drops both request types;
  prioritized holds playback at 100% while pre-fetch absorbs the hit — the
  post's own FIT experiment). A secondary view renders both *real* shedding
  curves side by side (the gateway cubic vs the service-level CPU staircase),
  deliberately rhyming with the Uber artifact so the cross-company pattern
  thread reads clearly.

Notice the common shape: **the artifact's central interaction IS the article's
thesis.** Not a side illustration — the single most important idea, made
manipulable. Decide the thesis first, then design the one interaction that lets
the reader feel it.

### Look and feel (the visual contract)
- **Dark theme**, background `#08090D`, primary text `#C8CDD8`, panels around
  `#111118`, borders around `#2a2a3a`.
- **Monospace throughout** (JetBrains Mono / Fira Code / SF Mono stack). The
  monospace is part of the identity — it signals "this is engineering, read it
  precisely."
- **One accent color per artifact**, chosen to suit the content and not clash
  with the library's existing accents (Stripe indigo `#6366F1`, Skipper green
  `#22C55E`, Airbnb cyan `#06B6D4`, Uber orange `#F97316`, Discord brand indigo
  `#5865F2`, Netflix red `#E50914`, Shopify lime `#84CC16`, Figma purple
  `#A259FF`, GitHub blue `#58A6FF`, Cadence teal `#2DD4BF`, Slack gold
  `#ECB22E` for slack-cellular / Slack cyan `#36C5F0` for
  slack-scaling-job-queue, AWS orange `#FF9900`, Notion terracotta
  `#DE8A5A`, Meta blue `#0866FF`, Airbnb brand coral `#FF5A5F` for
  airbnb-partitioning-main-database — flagged as proximate to
  semantic red `#ef4444` and used only for chrome, never verdict —
  and Roblox blue `#00A2FF` for roblox-return-to-service — flagged
  against GitHub `#58A6FF` periwinkle and Slack `#36C5F0` cyan-teal
  as blues getting crowded, distinguishable but a swap candidate
  at in-situ review — and Cloudflare orange `#F6821F` for
  cloudflare-byzantine-failure — flagged against AWS `#FF9900` and
  the resilience-chip page-chrome `#EA580C` as three oranges now
  crowded; violet `#9b8cf0` used in-artifact for automation accents
  is on standby as a swap candidate, owner in-situ call required —
  and Aperture-controller violet `#9b8cf0` for doordash-aperture-
  global-failure-mitigation, chosen after DoorDash brand red
  `#FF3008` was REJECTED for colliding with semantic red `#ef4444`;
  distinct hue family from all existing accents, nearest neighbors
  are the three blues, no swap candidate needed). The accent is for *wayfinding* — tabs,
  active states, key callouts, the one number that matters. **~80% of the
  artifact is neutral grayscale.** Bright decorative color is a smell.
- Semantic color only where it means something: green = healthy/committed/good
  outcome, red = failure/crash/bad outcome, amber = degraded/waiting. Don't
  spend these on decoration.
- **Text in artifacts is captions, labels, and callouts — never paragraphs.**
  If you're writing prose inside the artifact, it belongs in the article.

### Accent registry additions (rounds 12–18, 2026-07-15)

Airbnb coral `#FF5A5F` for airbnb-orpheus-idempotent-payments (matches
the partitioning-main-database coral precedent; same constraint —
chrome only, never verdict) · Netflix red `#E50914` for
netflix-conductor-microservices-orchestrator (company match with
netflix-prioritized-load-shedding CONFIRMED against this registry;
standing semantic-red caveat applies) · Stripe indigo `#6366F1` for
stripe-rate-limiters (CORRECTED from brand blurple `#635BFF` to match
the live stripe-idempotency accent — company consistency outranks
brand fidelity) · Pinterest red `#E60023` for pinterest-sharding-mysql
(HIGH-RISK: semantic red AND Netflix red; original teal swap candidate
WITHDRAWN — Cadence owns teal `#2DD4BF` — new candidate magenta
`#D946EF`; owner in-situ call required) · Segment green `#52BD94` for
segment-centrifuge-database-queue (FLAG: nearest neighbor is Skipper
green `#22C55E`, which is also semantic green; teal swap withdrawn per
Cadence; owner call) · Datadog purple `#632CA6` for
datadog-incident-response-observer-fate (purple corridor now
three-deep with violet `#9b8cf0` and Figma `#A259FF`; darker and more
saturated than both) · Shopify lime `#84CC16` for
shopify-pods-architecture (CORRECTED from brand green `#96BF48` to
match the live Shopify accent). Standing item: an **owner registry
pass** over the crowded corridors — oranges (AWS/Cloudflare/Uber/
resilience-chip), greens (Skipper/semantic/Segment/Shopify-lime),
purples (violet/Figma/Datadog/Discord-indigo/Stripe-indigo), reds
(semantic/Netflix/Pinterest/coral).

### Craft moves that earned their place (rounds 10–18)

- **Make the class name literal** where possible: blast-radius-scales-
  with-cluster-size became a draggable fleet slider showing the u^N
  availability product decay live — the strongest form of "the reader
  causes the crux."
- **Pick-your-poison:** when the source enumerates bad options, make
  each individually choosable with its own cost meter (delay / 429s /
  terabytes) — and let the solution architecture's teaching beat be
  that the poison menu never activates (Centrifuge).
- **Non-interchangeable scenarios:** give the reader two disasters
  that need different tools, so arming the wrong layer is possible and
  instructive (Stripe's flood vs slowdown).
- **Renunciations are playable:** when an architecture forbids an
  operation, give the reader the button and return a refusal verdict
  (informational violet), instead of omitting the button (Shopify's
  with_each_shard under pods).
- **The reader owns the ambiguity** where the crux is epistemic
  (Orpheus's scissors, Conductor's WHAT REMAINS, Cloudflare's
  promotion slider).
- **Counterfactual branches are labeled IN the artifact** — verdict
  text and control sublabel, not just the footer (Datadog's
  fate-shared-only detection branch). The reader must never mistake an
  illustrative branch for sourced history.
- **Persistent cross-run scoreboards** (orders lost, charge-capacity
  lost) make configurations comparable after the fact.
- **Success-story manifestations:** a class can be joined by an
  article where the canonical mitigation WORKED; the caveat names
  which side of the lesson the classmate carries (designs it /
  suffers its absence / exercises it).

### The stage-machine-vs-interval law and the verification gate (required)

Sequences — incidents, request lifecycles, workflows, migrations — are
pure stage machines with zero intervals. Dynamics the reader must FEEL
— metastable loops, flapping, absorb-then-drain — are interval sims
whose entire state advances through a pure `step()` applied via
functional `setState`; refs are banned by construction, which retires
the stale-closure bug class. Write `step()` and its constants so they
can be extracted into a node harness, because the gate below is
mandatory before any handoff:

1. esbuild JSX parse; 2. the comma-operator grep (`\},\s*\{\s*\};`);
3. JSON validation; 4. **headless behavioral verification of every
teaching beat** — run the sim's scenarios in node and assert the
verdicts' preconditions. When a beat under-performs (a flap that
converges instead of oscillating; a detection gated on the wrong
threshold), **fix the mechanic — never soften the verdict text to
match a weak sim.** When the artifact contains real arithmetic from
the source, verify it against the source's own worked example
(Pinterest's Pin `241294492511762325` → shard 3429 / type 1 / row
7075733). Verdict strings used by assertions stay verdict-only —
absent from footer and context block.

### The standalone-visitor contract (required, 2026-07-05)

Artifacts have shareable standalone URLs and are routinely encountered
without their article — a Slack paste, an HN comment, a scroll straight past
the prose. Every artifact therefore includes two elements:

1. A **context block** between the header and the controls — three labeled
   lines, **THE PROBLEM / THE MOVE / TRY**, expanded by default with a
   HIDE / SHOW CONTEXT toggle. THE PROBLEM is the article's crux compressed;
   THE MOVE names the article's answer *as this artifact exercises it* — name
   the actual toggles, stages, or scenarios, not the full post; TRY states the
   reading rule the interaction assumes (e.g. "verdicts are judged from the
   buyer's side of the checkout"). The block introduces **no claims that do
   not already exist in the article** — it is a compression, never a second
   source of truth, so corrections to the article never strand the block.
   Teaser-truth applies at block level: promise only what the interaction
   delivers, and when an artifact's interaction changes, its TRY line changes
   in the same commit.
2. A **footer backlink** to the article route
   (`https://behindscale.com/articles/<slug>`, `target="_blank"` so it works
   inside the sandboxed embed iframe).

Expanded-by-default serves the cold visitor — the regular reader pays one
glance and a dismiss click — and the sandbox's storage denial means the
dismissal can't persist anyway, which conveniently forces the honest default.

### Site-level artifact exemption (2026-07-08)

The **hero artifact on the landing page (`content/artifacts/_hero.jsx`) is
exempt from the standalone-visitor contract above**: no context block, no
article backlink. This is a deliberate named exemption, not an omission —
a future authoring pass should not "fix" the hero by adding a context
block it shouldn't have.

Rationale: a site-level artifact's context lives in its **page**, not its
iframe. The landing page around the hero already carries the crux concept
in the H1, the crux compressed in the lede, and a mono caption bar
(`● LIVE ARTIFACT · PRIORITY-BLIND LOAD SHEDDING` + a one-line hint)
immediately above the iframe. Duplicating that inside the bundle would be
noise; and a "back to the article" link has no target — there isn't one.
The isolation guarantee is unchanged (a broken hero still fails without
breaking the landing page); only the standalone-visitor UI inside the
iframe is dropped.

The signal for "site-level, contract-exempt" is the **`_hero` underscore
prefix** on the source filename (and therefore the output path
`/artifacts/_hero/`). Any future site-level artifacts (a taxonomy
overview, a pattern-recurrence chart) would use the same convention.
Per-article artifacts have no underscore prefix and stay on the
contract.

### Technical contract (the sandbox is strict)
- **Single self-contained `.jsx` file.** React primitives only (`useState`,
  `useEffect`, `useRef`, `useMemo`). No external libraries, no charting deps —
  hand-roll SVG/divs. All twenty article artifacts use nothing but React.
- **Inline styles only.** No Tailwind, no external CSS — they don't exist in
  the sandbox.
- **No `fetch`, no `localStorage`, no `window`/`document` at module scope.**
  The iframe is sandboxed with `allow-scripts` and an *opaque origin* — the
  parent cannot read into it, and it can't reach out. Interaction telemetry
  goes through `postMessage` to the parent (the shared entryStub handles this);
  never assume same-origin access.
- **Sized for embed:** ~880–960px max width, reflows at phone width (test that
  flex-wrap actually wraps), roughly 600–800px tall.
- **Determinism for sims:** if a simulation uses randomness (jitter, noise),
  seed it with a small PRNG so re-runs are reproducible and demos are stable.
- **Numbers come from the source.** A simulator needs concrete constants to
  run; when those constants aren't published (Uber's internal PID targets),
  label them *illustrative* on screen and state that the sourced content is
  the mechanism, not the magnitudes. Never present an invented number as if it
  were the team's.
- **Compile-verify before handoff:** the artifact must bundle clean through the
  repo's esbuild step (`--loader:.jsx=jsx --jsx=automatic`). A broken artifact
  fails in isolation by design, but shipping one that fails is sloppy.
- **Hydration safety** (post-SSG): the artifact is an iframe, so it's mostly
  insulated — but any article-side component must render identically server and
  client (pure functions of the JSON; effects in `useEffect` only).
- **Literal characters in JSX text, never `\u` escapes.** A `\u2019` written
  between JSX tags renders as the raw string `\u2019` on screen (it only decodes
  inside a JS string literal). Write real apostrophes and dashes in JSX text.
  This bit us once ("If you\u2019re the candidate" shipping literally); don't
  repeat it.

---

## 7. The teaser and the stats (small surfaces, real discipline)

- **Teaser** (the hook card near the top of the article): one line describing
  what the reader can *do* in the artifact, and it must be *true to the actual
  interaction*. "Break each monitoring layer" was once written for an artifact
  that only broke one — the teaser had to be sharpened until the artifact could
  honor it, then re-broadened when the artifact was rebuilt to deliver. A vague
  or over-promising teaser is worse than none.
- **Stats** (the pull-callouts): 0–3 per article, and **zero is a fine number**
  (Stripe has none — its source has no figures, and a weak stat is worse than
  no stat). Every stat value must already appear in the article's own prose —
  stats are a *lift from the body*, never a new source of numbers. The variance
  across the library (Stripe 0, Skipper 1, Airbnb 1, Discord 3, Uber 3,
  Netflix 3) is correct: it tracks how number-rich each source actually was.
  Uniform decoration would be a lie about the sources.
- **Production numbers go in the body prose, not only the summary.** A stat
  value must appear in the problem/solution/tradeoffs text (the validator's
  value-in-prose check enforces this). A recurring authoring slip — caught
  twice, on Skipper and Netflix — is putting the headline result ("12x spike,"
  ">99.4% held") in the summary and stat field but forgetting the body. The
  fix is never to weaken the stat to pass the check; it's to put the number
  where the callout points. Production-incident results usually *improve* the
  solution section anyway — they're the strongest proof the design worked, and
  they shouldn't be buried in the summary. Write them into the body first.

### 7.5 The interview bridge (a distinct content type)

The interview bridge is the layer that turns behindscale's real-world depth
into interview value — the paid surface the product is building toward. It
attaches to a **pattern** (not an article) as an optional `interviewBridge`
block, and it exists because the staff-engineer reader's real question isn't
"what did company X build" but "how do I deploy this pattern under interview
pressure, and how would an interviewer probe me on it." It is authored to the
same source-fidelity bar as everything else.

**It is reading-shell content — light idiom (§6.0), not a dark artifact.** The
interactive version is a light disclosure/drill, never a dark console.

Structure (one content block, from which multiple presentation forms render):
- **Deploy line** — the one sentence that names the pattern as the real-world
  answer to a class of interview push.
- **Candidate side** — how to say it, plus a *depth ladder* (surface → mid →
  staff) the candidate climbs only as far as the interviewer pushes. The staff
  rung must be genuinely staff-level: signal-to-bottleneck fit, the paired
  patterns, the failure mode named.
- **Interviewer side** — escalating *probes* with "what a staff answer covers,"
  and red flags. The probes must test *real tradeoffs from the sourced
  material*, not trivia. The strongest form is a **commit-then-compare drill**:
  the reader picks a move before seeing the read, so there's a beat of real
  thinking with stakes (a flashcard reveals; a drill makes you commit first).
  Distractors must be *instructively flawed* — plausible answers that fail for
  a nameable reason — never strawmen.
- **How two teams diverge** — a contrast table, available only when the pattern
  is **two-company** (this is why recurrence-driven sourcing feeds the bridge:
  the Uber-PID-vs-Netflix-gradient divergence is the exact "show me you
  understand the design space" signal staff interviews reward).

Tiering (the monetization shape): the **pure-prose form is free** on every
pattern page — indexable, SEO-valuable, genuinely useful, builds trust. The
**interactive drill is the gated/premium form** — most defensible (an
interaction can't be scraped as text) and most "worth paying for." Both render
from one content block, so authoring a pattern's bridge once feeds both.

The authoring bar for a bridge: every probe tests a real tradeoff traceable to
a source; the depth ladder genuinely escalates (the staff rung is not just the
mid rung with more words); distractors are instructively flawed; divergence
claims trace to the two sources. A bridge that fails these is worse than no
bridge — it teaches confident wrongness to a reader who will be tested on it.
Do not let an AI-generated "gotcha" into a bridge unless it traces to source;
the whole reason our drill beats a generic "AI inquisitor" is that ours can't
hallucinate a wrong follow-up.

---

## 8. Cross-linking and compounding

`relatedArticles` is for genuine intellectual threads, not "also from this
company." The two seeded so far: Stripe ↔ Uber (the thundering herd from both
ends — client-side jitter vs server-side smooth shedding) and Discord ↔ Airbnb
(fault isolation at different layers). A cross-link should make the reader
understand something *new* by seeing the two together. Seed these deliberately;
they're a quiet part of what makes the library more than a list.

---

## 9. The authoring workflow (how a piece actually gets made)

The established division of labor, which a new author should slot into:
1. **Read the source post in full.** Both posts, for evolution articles. Then
   re-read for every number and component name.
2. **Find the thesis** — the one sentence the whole piece turns on. It becomes
   the spine of the summary, the framing of the problem, and the central
   interaction of the artifact.
3. **Draft the article JSON** to the structure and voice above. Trace every
   claim to the source as you go; flag interpretation explicitly.
4. **Check patterns** against the existing library (the generality test).
   Reference what genuinely fits (2–6), write specific per-article notes,
   propose a new pattern only if it clears the bar, never pad.
5. **Design the artifact's one central interaction** to be the thesis made
   manipulable. Build it to the visual + technical contract. Compile-verify.
6. **Self-audit before handoff:** source-fidelity pass (every number/component
   traceable), tradeoff specificity pass (none generic), artifact-earns-keep
   pass (would the prose lose nothing without it?), teaser-truth pass.
7. **Run the verification gate** (§6): esbuild parse, comma-operator
   grep, JSON validation, headless beat verification, worked-example
   arithmetic checks. Package the round as the standard handoff folder
   — `DECISIONS.md` + `content/articles/<slug>.json` +
   `content/patterns/<slug>.json` (mints only; registry additions as
   `content/cruxtags.addition.json`) + `artifacts/<slug>/artifact.jsx`
   — with every unresolved check written as an explicit AGENT CHECK
   and every unverifiable slug marked as a placeholder, never guessed
   silently.
8. **Hand the editorial assets to implementation** (the Claude Code agent
   handles validation, build, commit, prod-verify). Editorial decides and
   reviews; implementation builds and verifies; the human owner reads source,
   reviews drafts, makes product calls.

The author's output is the editorial artifacts plus the judgment behind them —
not commit messages or shell commands.

---

## 10. When to push back

A good author (human or agent) pushes back, with reasoning, on requests that
would compromise the bar:
- A non-first-party source → explain §2, ask if an official post covers the
  same material.
- Padding pattern references to look thorough → dilutes the abstraction.
- Skipping or thinning the tradeoffs section because the article is short →
  it's where we earn our keep.
- An artifact that just illustrates the prose → push toward a real interaction
  or cut it.
- A "more engaging / punchier" voice → the voice is deliberate; specificity is
  the engagement.

Pushback is collaboration, not refusal: explain the reasoning, offer an
alternative, let the owner decide. If overridden with context you didn't have,
follow the override — and consider whether this document should be updated to
reflect it.

---

## 11. The one-paragraph version (for an agent's working memory)

> behindscale dissects first-party engineering blog posts for senior/staff
> engineers who want real system-design depth. Source discipline is absolute:
> official posts only, every claim traceable, no invented numbers or
> mechanisms. Articles follow a fixed structure (summary / crux / problem /
> solution / 4–6 paragraph tradeoffs / 2–6 general patterns) in a restrained,
> specific, charitable voice — teams made correct choices that reached their
> boundaries, never "mistakes." The crux names the one hard bottleneck the
> system is really about; patterns and cruxTags are two recurring-knowledge
> axes that must be definable without naming any company or technology, with
> the company-specific detail in per-article notes. Prefer sourcing new
> articles to make an existing pattern or cruxTag recur across a second company
> — that divergence is the payoff. Every article has one artifact whose single
> central interaction IS the article's thesis made manipulable — dark,
> monospace, self-contained, React-primitives-only, sourced numbers
> (illustrative ones labeled). Two idioms, and don't cross them: page content
> (crux, prose, pattern pages, interview bridge) is the light editorial reading
> shell; only embedded artifacts are the dark surface. Every artifact opens
> with a collapsible THE PROBLEM / THE MOVE / TRY context block (the crux
> compressed — no new claims) and ends with a backlink to its article, because
> artifact URLs travel without their articles. Production numbers live
> in body prose, not just the summary. Quality over cadence, always: two
> excellent beats three with drift. Every artifact's teaching beats are
> headless-verified before handoff — fix the mechanic, never soften the
> verdict. The test for everything: would the engineer
> who built this nod, and would the staff engineer reading it learn something
> real?