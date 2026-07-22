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

### 1. Registry-def amendment: `buffer-degrades-under-backlog`

- **Source:** round 16 (Segment Centrifuge), 2026-07-19. DECISIONS
  proposed conditionally appending a semantics clause to the
  registry definition.
- **What's needed:** one-line edit to `content/cruxtags.json`.
  Proposed new text: `A buffer that stops absorbing exactly when the
  backlog it exists for arrives — whether the buffer's substrate
  degrades under the backlog, or its access semantics let the
  backlog capture the buffer.`
- **Recommended:** A (apply). Same shape as the
  `partial-completion-under-crashes` amendment you signed off on
  2026-07-19 as commit `5f8d0da`. The clause is generalizable across
  all three current classmates (Meta = substrate; Slack = substrate;
  Segment = semantics), and the manifestation caveat is already
  carried in article-level prose, so registry text catching up is
  the symmetric move.
- **Reply:** A (apply) / B (decline).

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
- **Cost of waiting:** rounds 17-18 in the pipeline may lift the
  count to 10-11. Preview vertical footprint grows linearly.
- **Reply:** direction (a/b/c/other) or "wait" if you want to defer.

### 3. Accent registry: three unresolved conflicts

- **Source:** rounds 10, 15, 16. All landed as author-chose per
  prior-round posture; all flagged in the accent-registry section
  of taste doc v3 §6.
- **The three:**
  - **Cloudflare `#F6821F`** (round 10) — third orange in the corridor
    (AWS `#FF9900`, Uber `#F97316`, resilience-chip `#EA580C`).
  - **Pinterest `#E60023`** (round 15) — collides with semantic red
    `#ef4444` AND Netflix `#E50914`. Teal swap-candidate WITHDRAWN
    (Cadence owns teal). Standby proposal: magenta `#D946EF`.
  - **Segment `#52BD94`** (round 16) — same hue family as semantic
    green `#22c55e` AND Skipper green `#22C55E`. Teal swap-candidate
    WITHDRAWN (Cadence). No standby proposed.
- **What's needed:** in-situ visual review (best done against a
  deployed build with all three artifacts side-by-side), then either
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
  pipeline pending deploy". Live is 25 articles, 11 tags, 5
  three-company.
- **What's needed:** owner-authored batch refresh of the count line
  and pipeline-status paragraph. Cosmetic; self-heals when the batch
  finishes landing.
- **State:** taste doc is owner-owned; agent does not edit these
  narrative sections unsolicited.

---

## Recently resolved

Items resolved in the last full round, kept for provenance. Rolls
off after one round passes.

### `partial-completion-under-crashes` registry amendment
- **Resolved:** 2026-07-19 as commit `5f8d0da`, owner replied A.
- **Effect:** clause `— and, at scale, often no way even to
  enumerate which steps remain.` appended. Registry-def now covers
  the illegibility face Conductor introduced.

### Company-concentration doctrine (round 12 watch-rule)
- **Resolved:** 2026-07-19 as commit `c085fd1`. Owner elected the
  recurrence-value framing over a headcount cap; taste doc v3 §4
  now records the doctrine.
- **Effect:** no cap on N; when a landing crosses prior precedent,
  the round's DECISIONS.md carries the recurrence-value justification.
