# Open Decisions

Running index of owner-facing decisions surfaced across rounds and
sessions. Every item is a specific ask, not a status report — if it
lives here it needs the owner's input to resolve.

## How this is maintained

- **After every round or session**, the agent appends new open items
  and updates statuses on existing ones.
- **When the owner resolves an item**, the agent moves it to Recently
  Resolved (with commit hash) and removes it after one full round has
  passed.
- **Do not** put made decisions here — those go in
  `progress-tracker.md` under Architecture Decisions. This file is
  for *pending* input.
- **Do not** duplicate per-round narrative — the crux of each item
  should fit in a paragraph; link back to the source round if more
  context is needed.

## Priority ladder

- **Blocker** — should be resolved before the next article lands
  (usually because a landing amplifies the issue or the next round
  depends on the answer).
- **Worth resolving** — has been open one or more rounds; not
  blocking, but the cost of postponement is compounding.
- **Lower-priority** — no compounding cost; resolve when convenient.

---

## Blocker

_None._

---

## Worth resolving

### 2. Landing preview: show-all vs cap-and-signal

- **Source:** flagged since round 10 (Cloudflare) when count crossed
  6 to 7. Still 9 rows across four rounds now.
- **What's needed:** design-pass decision, not a text edit. Options:
  (a) keep show-all (current, per prior "show all recurring
  bottlenecks" feedback); (b) cap at N and add a "see all →" link;
  (c) split preview into "3-company" and "2-company" bands.
- **State:** kept at show-all per prior feedback. `Landing.tsx` doc
  comment still says "revisit at 6+".
- **Cost of waiting:** r29 crossed to 11 rows (r28 added
  `degraded-state-outlives-its-trigger`, r29 added
  `unrecorded-config-outlives-its-authors` — two
  consecutive new-class mints as singleton rows). Preview
  vertical footprint grew linearly as predicted;
  `Landing.tsx`'s "revisit at 6+" comment is now
  significantly overdue.
- **Reply:** direction (a/b/c/other) or "wait" if you want to defer.

### 3. Accent registry: ten unresolved conflicts (owner pass overdue per Fable)

- **Source:** rounds 10, 15, 16, 17, 22, 23, 25, 28, 29, 30.
  All landed as author-chose per prior-round posture; all
  flagged in the accent-registry section of taste doc v3 §6.
- **The ten:**
  - **Cloudflare `#F6821F`** (round 10) — third orange in the corridor
    (AWS `#FF9900`, Uber `#F97316`, resilience-chip `#EA580C`).
  - **Pinterest `#E60023`** (round 15) — collides with semantic red
    `#ef4444` AND Netflix `#E50914`. Teal swap-candidate WITHDRAWN
    (Cadence owns teal). Standby proposal: magenta `#D946EF`.
  - **Segment `#52BD94`** (round 16) — same hue family as semantic
    green `#22c55e` AND Skipper green `#22C55E`. Teal swap-candidate
    WITHDRAWN (Cadence). No standby proposed.
  - **Datadog `#632CA6`** (round 17) — third purple in the corridor
    (DoorDash violet `#9b8cf0`, Stripe blurple `#6366F1`). Notably
    darker and more saturated than both; likely distinguishable
    in-situ but the purple corridor is now as crowded as the
    orange one. No standby proposed.
  - **Slack `#E01E5A`** (round 22) — magenta-shifted red, but the
    reds corridor is crowded (semantic red `#ef4444`, Netflix
    `#E50914`, Pinterest `#E60023`). Third Slack accent after
    gold `#ECB22E` (r6) and cyan `#36C5F0` (r?); per-article
    accents Airbnb-precedented. No standby proposed.
  - **Canva `#00C4CC`** (round 23) — teal-cyan, most-crowded
    corridor at the time (Slack cyan `#36C5F0`, Roblox
    `#00A2FF`, Airbnb cyan `#06B6D4`, Cadence teal `#2DD4BF`).
    Alternative Canva purple `#8B3DFF` collides with Figma
    `#A259FF`. No non-colliding standby proposed.
  - **GitLab `#FC6D26`** (round 25) — fourth orange in a
    now-oversaturated orange corridor (AWS `#FF9900`,
    Cloudflare `#F6821F`, Uber `#F97316`). Alternative
    GitLab purple `#6E49CB` lands in the equally crowded
    purple corridor. No non-colliding standby proposed.
  - **Slack `#2EB67D`** (round 28) — Slack's FOURTH accent
    (after gold `#ECB22E`, cyan `#36C5F0`, magenta-red
    `#E01E5A`). Sits in the greens corridor with Segment
    `#52BD94` and semantic `#22c55e`. Per-article accents
    are Airbnb-precedented; chrome-only discipline
    observed.
  - **Reddit `#FF4500`** (round 29) — orange-red; joins
    the reds corridor (semantic `#ef4444`, Netflix
    `#E50914`, Pinterest `#E60023`, Slack `#E01E5A`).
    Chrome-only discipline observed. The reds corridor
    is now as dense as oranges and cyans.
  - **Google `#4285F4`** (round 30) — Google blue. Blue
    corridor (Slack cyan `#36C5F0`, GitHub `#58A6FF`,
    Meta `#0866FF`, Discord blurple `#5865F2`).
    Chrome-only discipline observed.
- **What's needed:** in-situ visual review (best done against a
  deployed build with all ten artifacts side-by-side), then
  either keep or swap. Owner may do a corridor-wide pass and pick
  new hues for one or more.
- **Reply:** per accent — keep / swap-to-[hex] / defer.

---

## Lower priority

### 4. `conservative-auto-remediation` Pinterest cameo promotion

- **Source:** round 15 (Pinterest). "Even today we don't use
  auto-failover" is a strong cameo but left in tradeoff prose per
  the r13 cameo rule (taste doc v3 §4).
- **State update (r28):** r28 Slack 2-22-22 chipped the pattern
  as an anti-instance (Mcrib retirement story), so the pattern
  is now at 2 articles / 2 companies (Cloudflare + Slack) via a
  different path than Pinterest. Promoting the Pinterest cameo
  would push to 3 companies.
- **What's needed:** decide whether to add Pinterest as a chip
  now that the pattern has real recurrence, or leave the cameo
  in prose.
- **Recommended:** still no strong opinion. Recurrence urgency
  has decreased; the pattern is well-instantiated now.
- **Reply:** promote / keep-as-cameo.

### 5. `retry-amplified-overload` singleton candidate fill

- **Source:** flagged since round 11 (DoorDash Aperture). DoorDash
  June 2021 postmortem is shelved as a candidate fill; depth
  assessment needed.
- **State update (r28/r29):** no longer "last singleton" — r28
  and r29 minted two consecutive new singleton classes
  (degraded-state, unrecorded-config), so `retry-amplified` is
  now one of FOUR one-company classes rather than a standout.
  Filling it is optional cleanup, not board-completion work.
- **What's needed:** owner call on whether to pursue the
  DoorDash postmortem (or another candidate) as a dedicated
  article. Class remains well-anchored by AWS timeouts.

### 6. Taste-doc / board-doc separation follow-up

- **Source:** ongoing since round 12; reframed 2026-07-25 after
  the owner split live counts out of the taste doc into
  `behindscale-board.md`. The taste-doc side has been
  cleaned (ratified-taxonomy paragraph, "twenty article
  artifacts" line, and version-5 changelog no longer carry
  count claims). Board-doc side is now Fable-maintained per
  the ledger's own protocol: the implementation agent's
  expanded backfill was reverted (2026-07-25) in favor of
  Fable's canonical structure with AGENT CHECK markers
  preserved for the fields Fable wants filled per-round.
- **What's still owner-owned:** the taste doc header
  (version narrative) and the board doc's format. The
  2026-07-27 board-doc audit (owner-prompted) closed the
  remaining AGENT CHECK gaps that had actionable data:
  status fields synced to LIVE across all rounds, source
  count corrected from phantom 24 to actual 22, retired-
  names filled, per-company article-count table filled,
  round-log ≤27 row reworded, and the r24 pattern slug
  corrected from Fable's guess `prioritized-load-shedding`
  to the live `priority-aware-load-shedding`. Remaining
  AGENT CHECK: pre-r12 per-article accent registry (rows
  27 pre-r12 articles that aren't in Fable's accent
  table). Leave-as-is fine unless owner wants completion.
- **Reply:** further-refactor / leave-as-is / do-backfill.

### 8. Primary-vs-newest source convention

- **Source:** round 20 (Uber Kafka Consumer Proxy) DECISIONS §2.
  Fable applied the taste doc's "dissect the newest" convention
  and CONSCIOUSLY overruled it here: the 2021 mechanism post is
  the primary; the Feb 2026 uForwarder post is a
  productionization sequel (hardware efficiency, context-aware
  routing, delay processing) that PRESUMES the 2021 mechanics
  rather than restating them. Scoped secondary first-party use
  of the 2026 post (1,000+ services, uForwarder open-source
  name) is inside the article body/footer.
- **What's needed:** confirm the ruling class ("dissect the
  newest UNLESS the newer piece is a sequel that presumes the
  older's mechanics"). If confirmed, taste doc §2 could carry
  the refinement as a bullet under the primary-source rule.
- **Recommended:** confirm and formalize. The distinction
  (mechanism vs sequel) is clean and will recur — anytime a
  company writes both a mechanism paper and a productionization
  follow-up.
- **Reply:** confirm-ruling / dissect-2026-instead / defer.

### 10. `bounded-guarantee-degradation` promotion?

- **Source:** round 21 (Segment exactly-once) DECISIONS §4.
  Segment's size-bound RocksDB window shrinks under load
  rather than falling over — and the shrink pages on-call
  when it dips under 24h. That's a pattern shape: a
  guarantee that has a degradation lever (window narrowing)
  and a signal that names when the lever has been pulled
  hard enough. Currently carried in tradeoff #4 of the
  Segment article with an owner-may-promote note; other
  library candidates likely (Netflix/Uber shed traffic
  before dropping order; retry-with-jitter as a bounded
  quality-of-service dance).
- **What's needed:** owner call on whether to mint this as
  a pattern now (1-company launch anchored by Segment,
  waiting for a second company) or wait for a natural
  second instance to force the mint.
- **Recommended:** wait. The pattern shape is real but
  Fable's own instinct was "carry in tradeoff, promote if
  another instance shows up." Same posture the library has
  taken on cameo-first mints since r13.
- **Reply:** mint-now / wait-for-second-company / dismiss.

### 12. `fault-isolation` chip on Slack Vitess?

- **Source:** round 22 DECISIONS §4. The workload-isolation
  desire (isolate second-tier workloads from message sending;
  shard outage = full Slack outage for those customers) is
  named as one motivation bullet in the post, delivered by
  keyspaces after Vitess, but not mechanically developed as a
  first-class solution. Currently carried in tradeoffs prose
  with owner-may-promote note.
- **Recommended:** promote. `fault-isolation` is our most-
  recurring pattern (13 articles pre-r22) and the Slack
  keyspaces case is a real instance — one motivation bullet
  is enough when the pattern is this well-established. Same
  bar as the r15 back-tag decision on `master-only-reads`.
- **Reply:** promote / keep-in-prose.

### 13. `dark-read-verification` mint?

- **Source:** round 22 DECISIONS §4. Slack's parallel double-
  read diffing (running the query against both old and new
  path, comparing results) is one sentence in the post,
  folded into `universal-staged-rollout`'s note and tradeoff
  #5. The pattern shape is real (dark reads with diffing are
  a durable migration technique).
- **Recommended:** wait for a second natural instance to
  force the mint — same posture as item 10 (bounded-
  guarantee-degradation). Notion's sharding migration and
  Figma's rehearsal are candidates; if either surfaces this
  explicitly, the mint becomes 2-company from the start.
- **Reply:** mint-now / wait-for-second-company / dismiss.

### 14. Vendor-case-study source bar → taste doc?

- **Source:** round 24 (AWS load shedding) DECISIONS §Selection.
  Fable rejected a Coinbase/Temporal partial-completion 4th-
  company candidate this round on source bar — the
  substantive account exists only as a temporal.io VENDOR
  CASE STUDY, not first-party Coinbase engineering. Fable
  flagged this as the first explicit rejection on the
  vendor-case-study line and asked whether to formalize.
- **Recommended:** confirm and formalize into taste doc §2
  (source discipline) as a bullet under the first-party
  rule: "Vendor-hosted customer stories fail the bar
  regardless of technical content — the substantive account
  must be published by the company that operates the
  system, not by a vendor telling the customer's story."
- **Reply:** formalize / defer.

### 15. `bounded-queue-age` mint?

- **Source:** round 24 (AWS load shedding) DECISIONS §4.
  The post's queue-age-bounding section is substantive and
  distinct from `deadline-propagation` (server-local
  staleness vs client-declared budget — the two compose).
  Fable minted deadline-propagation and named bounded-
  queue-age in its boundary, deferring the sibling mint
  per the one-mint-per-round posture. Second-instance
  candidates: Netflix's SLO-based enqueue-timeout logic;
  Stripe's rate-limiter half-open buckets; internal
  Cadence timeouts.
- **Recommended:** wait for a second natural instance to
  force the mint — same posture as items 10 and 13.
  Boundary is drawn inside deadline-propagation's
  definition already, so the concept is recoverable
  whenever a second article surfaces it.
- **Reply:** mint-now / wait-for-second-company / dismiss.

### 16. `violation-ratchet` category-strain ruling

- **Source:** round 25 (GitLab decomposition) DECISIONS §2.
  Fable minted `violation-ratchet` in the `consistency`
  category with an explicit category-strain flag: unlike
  every other pattern in the library, this one is an
  engineering-PROCESS pattern enforced via CI (detect →
  allowlist → fail-new → burn down), not a runtime
  mechanism. Precedent it invokes: choreography-vs-
  orchestration's reserved-slot handling.
- **What's needed:** ruling on whether to accept process-
  patterns into the library's runtime taxonomy (keep in
  `consistency`), reserve a separate category (`process`
  or `governance`), or reject the mint and fold the
  content back into `universal-staged-rollout`'s
  migration-craft note.
- **Recommended:** keep in `consistency` for now. The
  ratchet's actual output is consistency between what the
  application asserts and what it does; the process
  machinery is the how, not the what. If a second process-
  pattern shows up we can revisit; a category rename would
  affect the chip ramp.
- **Reply:** keep-in-consistency / new-category / reject-mint.

### 17. `universal-staged-rollout` note ordering curation

- **Source:** round 25 (GitLab decomposition) DECISIONS §3.
  Fable's agent note: the pattern page is becoming the
  migration-craft hub, and the notes are accumulating in
  landing-order rather than teaching-order.
- **State update (r29):** pattern now at 6 articles / 6
  companies (Datadog r17 mint; Slack r22; Canva r23; GitLab
  r25; DoorDash r27; Reddit r29). Two consecutive datastore
  migrations (Canva, GitLab) followed by two consecutive
  application migrations (DoorDash, Reddit). Curation urgency
  has grown accordingly.
- **What's needed:** owner-authored review of the
  `universal-staged-rollout` pattern page notes — decide
  whether to reorder them by teaching progression
  (introduce the pattern → increasing stakes → the largest
  case) instead of chronological landing order. Chip note
  authoring is agent-owned; pattern-page composition and
  ordering is owner-owned per the taste doc.
- **Recommended:** worth a curation pass. Suggested order:
  Datadog (why staged rollouts save security-patch fleets)
  → DoorDash (staged application migration with reversible
  feature flags) → Reddit (staged READMISSION under load,
  the direction nobody practices) → Canva (the "hot-data-
  first" application to a datastore migration) → Slack
  (three-year version at datastore scale) → GitLab (seven-
  phase + seven-rehearsal ceremony as the fullest
  articulation).
- **Reply:** reorder / keep-chronological / defer.

### 18. Invariant-8 vs one-chip article intent

- **Source:** round 26 (Meta SDC) DECISIONS §2 + validation
  result. Fable declared this an intentional ONE-CHIP round
  (single-lesson piece; candidate second chips rejected as
  forced) — the first time the round-folder format has done
  so explicitly. The invariant-8 check (`minimum-pattern-
  coverage`) rejected the article at first pass. Fable's
  AGENT OPTION clause anticipated this: "if live classmates
  share a taggable class pattern, agent may add that recur
  with a note mirroring the crux caveat." Agent added
  `fault-isolation` under that clause; the article now
  ships with 2 chips (known-answer-testing + fault-
  isolation) and validates. But the deeper question was
  surfaced.
- **What's needed:** ruling on whether the invariant should
  stay hard (Fable always authors ≥2 grounded chips; the
  one-chip AGENT OPTION becomes the routine fallback) OR
  whether the library formalizes a "one-chip case study"
  article type with its own architectural carve-out.
- **Recommended:** keep the invariant hard. The AGENT
  OPTION clause is a good escape valve for genuinely single-
  lesson pieces (Fable's judgment is trustable) and the
  invariant-8 rationale in architecture.md still holds
  (single-pattern articles are case studies, not library
  entries). The Meta SDC case worked cleanly: the
  classmate-shared pattern was gettable at a real angle
  (test-blast-radius containment), and the note articulated
  the class-response inversion honestly.
- **Reply:** keep-invariant / formalize-case-study-type /
  loosen-invariant.

### 19. "Chips assert USE; absences are prose" rule → taste doc?

- **Source:** round 27 (DoorDash RabbitMQ→Kafka) DECISIONS
  §3. Fable drafted a `dead-letter-queue` chip as a
  "present by conspicuous absence" cross-reference and
  REMOVED it before packaging on the reasoning that tagging
  an article with a pattern it deliberately does NOT use
  would falsely list DoorDash on that pattern's back-link
  page. The absence-contrast lives in the mint's boundary
  and tradeoff prose instead.
- **What's needed:** ruling on whether to formalize the
  proposed rule as a taste doc §4 (Patterns) bullet:
  "Chips assert USE; absences are prose. If a pattern's
  absence is a load-bearing choice, articulate the
  contrast in the crux/tradeoffs/pattern-mint-boundary,
  not by chip-tagging."
- **Recommended:** formalize. The rule is small,
  self-explanatory, and the reasoning is architectural
  (pattern back-links must reflect real embodiment or the
  library's cross-reference contract breaks). Same class
  as the counterfactual-labeling rule that landed via
  Fable and item 4b was subsequently retired.
- **Reply:** formalize / defer.


---

## Standing rules

Rules the owner has signed off across rounds that now stand
as agent defaults, so future landings don't re-surface the
same class of question.

### Symmetric-linking rule (4/5-company clusters)

- **Established:** 2026-07-23, after r19 Shopify (single
  edge), r20 Uber↔Meta FOQS (bump to 3 forwards), and r21
  idempotency (all-pairs across 5) all resolved the same
  way.
- **Rule:** any cruxTag cluster of 4 or more companies
  gets a fully-connected `relatedArticles` graph. When a
  new article joins a 4+ cluster, agent adds all sibling
  slugs as forward links AND writes the reciprocal
  backlink on every sibling in the same commit.
- **Applies to:** cruxTag clusters. Pattern-level
  clustering is not covered — patterns already surface
  siblings through the pattern index page.

## Recently resolved

Items resolved in the last full round, kept for provenance. Rolls
off after one round passes.

_None this round._

_(Older resolutions rolled off after their round: Idempotency
5-company backlink symmetry 2026-07-23 as `89a3d98` (retired
items 9 and 11); Third backlink to Shopify from AWS
idempotency 2026-07-22 as `c59d141`; buffer-degrades-under-
backlog registry amendment 2026-07-22 as `f2fad03`; partial-
completion registry amendment 2026-07-19 as `5f8d0da`;
company-concentration doctrine 2026-07-19 as `c085fd1`.)_
