# behindscale — The Taste Document

*A running blueprint for authoring articles and artifacts, and the editorial
spine for any Fable agent working on the project. It captures the judgment that
makes a piece feel like behindscale rather than a generic dissection — the part
that lives in neither the schema nor the architecture. Update it as the taste
sharpens; treat contradictions between this and an older instruction as this
winning.*

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

The ratified taxonomy (2026-07-14, nineteen articles, ten tags — check
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
amplification and correlation).
Nine tags are two-company as of the 2026-07-14 Cloudflare
Byzantine-failure publication (Cloudflare joining Slack on
`gray-failure-defeats-automatic-detection`, the fifth
audit-flagged singleton converted to two-company via
recurrence-driven sourcing — five fills in a row: Slack,
Airbnb, Roblox, AWS, Cloudflare); only one audit-flagged
singleton remains (AWS retry-amplified — same author, Colm
MacCárthaigh, as the shuffle-sharding article; the shuffle
article's second tradeoff already draws the lateral to
retry-amplified-overload since shuffle sharding quietly
depends on caller retries). The Skipper↔Cadence
pair remains the first same-crux/opposite-solution pair in
the library (embedded-library vs central-platform durable
execution).
Earlier drafts of this document used speculative example tags
(`fan-out-failure-amplification`, `cliff-shedding-and-retry-amplification`);
those were superseded by the ratified set above — do not reintroduce them.
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
  is on standby as a swap candidate, owner in-situ call required). The accent is for *wayfinding* — tabs,
  active states, key callouts, the one number that matters. **~80% of the
  artifact is neutral grayscale.** Bright decorative color is a smell.
- Semantic color only where it means something: green = healthy/committed/good
  outcome, red = failure/crash/bad outcome, amber = degraded/waiting. Don't
  spend these on decoration.
- **Text in artifacts is captions, labels, and callouts — never paragraphs.**
  If you're writing prose inside the artifact, it belongs in the article.

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
  hand-roll SVG/divs. All nineteen article artifacts use nothing but React.
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
7. **Hand the editorial assets to implementation** (the Claude Code agent
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
> excellent beats three with drift. The test for everything: would the engineer
> who built this nod, and would the staff engineer reading it learn something
> real?
