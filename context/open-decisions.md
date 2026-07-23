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
- **Cost of waiting:** rounds-12-18 batch now complete at 9
  rows (7 three-company + 2 two-company + 2 one-company). Next
  landings will lift the count further; preview vertical
  footprint grows linearly.
- **Reply:** direction (a/b/c/other) or "wait" if you want to defer.

### 3. Accent registry: four unresolved conflicts

- **Source:** rounds 10, 15, 16, 17. All landed as author-chose per
  prior-round posture; all flagged in the accent-registry section
  of taste doc v3 §6.
- **The four:**
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
- **What's needed:** in-situ visual review (best done against a
  deployed build with all four artifacts side-by-side), then either
  keep or swap. Owner may do a corridor-wide pass and pick new hues
  for one or more.
- **Reply:** per accent — keep / swap-to-[hex] / defer.

---

## Lower priority

### 4. `conservative-auto-remediation` cameo promotion

- **Source:** round 15 (Pinterest). "Even today we don't use
  auto-failover" is a strong cameo but left in tradeoff prose per
  the r13 cameo rule (taste doc v3 §4).
- **What's needed:** decide whether the 2-company recurrence
  (Cloudflare + Pinterest) is worth relaxing the cameo rule for this
  specific pattern chip.
- **Recommended:** no strong opinion. The Pinterest line is a
  one-clause stance; promoting it would take the pattern from
  1-company to 2-company but with a thin second instance.
- **Reply:** promote / keep-as-cameo.

### 5. `retry-amplified-overload` last singleton

- **Source:** flagged since round 11 (DoorDash Aperture). DoorDash
  June 2021 postmortem is shelved as a candidate fill; depth
  assessment needed.
- **What's needed:** owner call on whether to pursue the DoorDash
  postmortem as a dedicated article, or leave the class as a
  singleton anchored by AWS.
- **State:** no urgency; the class is well-anchored by the AWS
  timeouts-retries-backoff-jitter article.

### 6. Taste doc count sync

- **Source:** ongoing since round 12. Doc still reads "twenty
  articles, eleven tags" and "rounds 12–18 authored 2026-07-15,
  pipeline pending deploy". Live is 30 articles, 11 tags,
  1 five-company + 1 four-company + 5 three-company
  (as of r21 Segment exactly-once — first five-company
  cruxTag; idempotency-keys becomes first five-company
  pattern).
- **What's needed:** owner-authored batch refresh of the count line
  and pipeline-status paragraph. Cosmetic; self-heals when the batch
  finishes landing.
- **State:** taste doc is owner-owned; agent does not edit these
  narrative sections unsolicited.

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

### Idempotency 5-company backlink symmetry (item 11)
- **Resolved:** 2026-07-23, owner said apply.
- **Effect:** five missing edges added across four files
  (Stripe→Shopify; Shopify→Segment; Airbnb-Orpheus→Segment;
  Segment→Shopify+Airbnb-Orpheus). Idempotency 5-company
  graph now fully connected. Retires items 9 and 11 in one
  motion, since the r20 Uber↔Meta FOQS asymmetry (item 9)
  was covered by the same rule; `meta-foqs-priority-queue`
  added to `uber-kafka-consumer-proxy.relatedArticles`
  retroactively.

### Third backlink to Shopify from AWS idempotency
- **Resolved:** 2026-07-22, owner said add.
- **Effect:** `shopify-resilient-payments` added to
  `aws-idempotent-apis.relatedArticles`; symmetric backlink
  added to `shopify-resilient-payments.relatedArticles`.
  Idempotency four-company graph now fully connected.

_(Older resolutions rolled off after their round:
buffer-degrades-under-backlog registry amendment 2026-07-22 as
`f2fad03`; partial-completion registry amendment 2026-07-19 as
`5f8d0da`; company-concentration doctrine 2026-07-19 as `c085fd1`.)_
