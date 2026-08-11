# behindscale — Corrections Log & Readability Principles

A running document. Every article review appends an entry: what we found,
what we changed, and what generalizes. The **Principles** section is the
distilled output — read it before writing or reviewing any article. The
**Checklist** is the pre-publish gate.

Audience calibration for everything below: the reader is a staff-level
engineer reading the article for the first time. Technical language is
fine; *undefined* language is not. The reader brings Kafka-level baseline
vocabulary (partitions, offsets, gRPC, P99) and nothing article-specific.

---

## Principles (distilled from all rounds so far)

### Prose

1. **Mechanism before conclusion.** Never state a consequence whose causal
   chain isn't on the page before or beside it. "Autocommit trades blockage
   for data loss on restart" fails; "autocommit marks messages done on
   arrival instead of after processing, so a restarted consumer skips past
   messages that were never handled" passes. If a sentence asserts something
   the reader must take on faith, the chain is missing.

2. **Every number carries its premise.** "Ten messages per second" is
   arbitrary until the sentence says "at 100 ms per charge." A figure whose
   arithmetic isn't visible in (or immediately beside) the sentence reads as
   noise.

3. **Gloss every coined or load-bearing term at first use — including our
   own.** Watermark, backpressure, rebalance, KIP, bounded consumption,
   head-of-line blocking: one plain-words clause at first appearance
   ("acts like a watermark, a line marking how far everything is
   finished"), then the bare term freely afterwards. Our own metaphors are
   jargon too: "the log," "escape hatches," "hot-spotting," "partition
   budget," "priced honestly" all forced decoding and all got replaced or
   glossed.

4. **One image per article, introduced explicitly, reused consistently.**
   The checkout-lane image is set up once in the lede ("each partition
   works like a single checkout lane: one worker, one message at a time,
   in order") and then "lane" carries through crux, problem, and the
   artifact. Two competing metaphors, or one metaphor never introduced,
   both fail.

5. **One idea per sentence; no arithmetic inside parentheses inside
   lists.** The original lede put a four-quantity calculation inside a
   subordinate clause. If a sentence requires re-reading to recover its
   spine, split it.

6. **Say each thing once per depth level.** Lede = feel the problem
   (conclusions only), crux = the thesis, problem = the numbers and the
   full argument. Repetition across the three must deepen, not restate.
   The original repeated the Visa example three times at the same depth.

7. **Concrete referents until wordplay is earned.** The lede says "built
   on top of Kafka rather than replacing it"; only the crux, after the
   setup, gets "kept Kafka's log and built a second ledger above it."
   Title metaphors pay off late, not early.

8. **Plant early, pay off late.** The lede's "all messages up to here are
   done" is the plain-words version of the committed offset; when
   "watermark" arrives in the solution it lands on prepared ground, and
   the crux's closing line reuses the planted phrase.

9. **No internal taxonomy in reader-facing text.** "The second
   semantics-face instance alongside Segment" means nothing to a visitor.
   Cross-references are written in reader terms ("Segment hit the same
   wall and replaced the queue with a database").

10. **Claims need sources the page can show.** The "1,000+ services on
    uForwarder" figure wasn't in the cited post and was cut. If a fact
    isn't in the primary source, it either gets a citation the schema can
    carry or it goes.

11. **Steal the register of the best text on the page.** The artifact
    teaser ("watch Mastercard's charges starve behind it") was concrete,
    plain, and vivid while the body was ornate. When one surface reads
    better, the others should sound like it — and instructional rewrites
    of evocative text are a downgrade once the UI itself is discoverable.

21. **Gloss an acronym or named technique by what it IS, not only what it
    resembles.** A behavioral analogy alone ("a PID controller, the same
    kind of feedback loop as a thermostat") tells the reader how it acts
    but leaves the term itself opaque. When a name is an acronym, the
    letters usually ARE the explanation: PID = proportional (how far off
    now) + integral (how long it's been off) + derivative (which way it's
    heading), summed into one correction. Give the plain unpacking first,
    then the analogy as reinforcement. Owner ruling, 2026-07-31: the
    thermostat line alone wasn't enough. Applies to any lettered or coined
    technique (CoDel, BYOS, PID, SACK) where the reader would otherwise
    nod without understanding.

22. **Artifact values must move perceptibly, not snap.** When a control
    toggles and a simulated quantity jumps to its new value in a single
    frame, the viewer sees the result but never the mechanism - they can't
    watch charges fall under a flood or recover when a protection is armed.
    Ease the DISPLAYED values toward their computed targets over a few
    ticks (a simple lerp, ~40% of the gap per tick) and add a CSS
    transition on any bar width or color. Critically, ease only the
    display layer - the true simulation values stay exact and are what all
    verdict/logic reads, so the pedagogy animates without the model
    drifting. (Stripe artifact, owner ruling 2026-07-31: 'have some timeout
    so the user can perceive it.')

23. **A control must explain itself at first sight, in the artifact.** The
    reader meets a toggle in the artifact with no article beside it, so a
    name alone ('FLAP MODE') that assumes the reader already knows the term
    fails. The button's own subtitle, and any TRY/context text, must say
    what the control does and why it matters before it's clicked - 'make
    the shedder react instantly instead of slowly, so it drops and restores
    traffic over and over' - not just label it. Same spirit as P3 (gloss at
    first use), applied to interactive controls. Owner ruling 2026-07-31.

24. **Merge near-duplicate patterns, and merge them in the library too.**
    When one article carries two pattern notes that are really the same
    lesson (Roblox had independent-observability and circular-dependency-
    avoidance: same observer-must-not-depend-on-observed point, same
    sibling, same remediation quote), collapse them into one note. Crucially,
    extend the merge to the pattern LIBRARY files, not just the article -
    leaving two near-identical pattern pages in the catalog is the same
    duplication one level up. Keep the more specific or positive slug as
    primary and fold the general one in as the broader anti-pattern it
    instances (independent-observability absorbed circular-dependency-
    avoidance, gaining its general form and domain examples). Leave a
    catalog redirect from the retired slug. Owner ruling, 2026-07-31.

### Formatting

12. **Use spaced hyphens ( - ), not em-dashes ( — ), throughout.** Owner
    ruling, 2026-07-31: the em-dash glyph renders as a double hyphen and
    reads as a typo to readers, so the "budget one earned em-dash per
    section" guidance is superseded — just convert every em-dash to a
    spaced hyphen everywhere (article text, teaser, stat labels, titles,
    AND the artifact's verdict/label strings so the sim matches the
    article). This is one unambiguous rule instead of a per-dash judgment
    call. Applies retroactively: Kafka and Meta JSON still carry a few
    "earned" em-dashes that should also be swept if those articles are
    touched again. Asides still become parentheses, definitions colons,
    consequences their own sentences where that reads better — the point
    is fewer interruptions, and the hyphen is the fallback glyph when a
    dash is genuinely wanted.

13. **Paragraphs are units of one topic — split by topic count, never to
    a target.** A block with several separable moves reads better split
    (the Kafka crux had three: the trap / the failed workarounds / the
    answer; its solution had five); a block that is one sustained
    argument is right as one paragraph (the Meta crux). There is NO
    required paragraph count for any field — one paragraph is correct
    when there is one topic. Owner ruling, 2026-07-31: do not turn
    "cruxes should be three paragraphs" into a rule; it depends on the
    article. The only hard part is "don't run two distinct topics
    together in one wall."

14. **Character bands are a readability ally, not just a gate.** The
    dedupe and de-ornamentation cuts were exactly the cuts that brought
    over-band fields into band. If a field fights its band, the prose
    usually has a repetition or decoration problem.

### Artifacts

15. **State is shown by fill, never by visibility or brightness.** The
    trouble toggles were invisible when off (off-state background matched
    the page background) — the artifact's two core interactions could not
    be discovered at all. Toggles carry their signal color permanently;
    ON adds fill.

16. **Labels stay glued to their controls.** A single wrapping flex row
    let the TROUBLE label orphan onto the end of the MODE line. Each
    control group gets its own row.

17. **Meters must agree with verdicts.** The PROGRESS meter said "moving"
    forever in naive+poison while the verdict said the window jammed,
    because the movement check counted messages the mode's own barrier
    could never dispatch. Any derived indicator must respect the same
    rules as the simulation it summarizes.

18. **Verify by simulation, not by reading.** The meter bug and its fix
    were both confirmed by running the step function headless through
    every mode × trouble combination. Artifacts with state machines get a
    scenario table, and each scenario gets executed.

19. **Pattern notes read in the article's voice, not the registry's.**
    The pattern/crux vocabulary we use internally — "minted," "the
    class's shared response shape," "epistemology," "test-blast-radius
    containment," "Nth in the class" — is authoring machinery, meaningless
    to a reader arriving from a shared link. Rewrite every pattern note in
    the same plain-but-technical voice as the article body: state what the
    pattern *is* and does in ordinary words, and write cross-article
    links as plain comparisons ("the other gray-failure articles here,
    Slack and Cloudflare, contain the damage; this one contains the cost
    of detection"). Same rule as P9, applied to the pattern surface.
    (Resolves the open item carried from the Kafka round: yes,
    pattern-note register must match article register.)

20. **Source product names: lead with the role, demote the brand to one
    parenthetical.** When an article adopts a source's internal tool or
    product names (Fleetscanner, Ripple, Consumer Proxy), the descriptive
    role is usually the transferable lesson and the brand is just a
    traceability handle. Lead with the descriptive term throughout ("the
    deep test," "the shallow test"), bind the brand once at first mention
    in a parenthetical ("the deep test (Meta calls its tool Fleetscanner)"),
    and never make the reader carry a meaningless proper noun through the
    whole piece. Keep tradeoffs consistent with the same descriptive term
    so a reader who jumps straight there isn't met with an unexplained
    name. Owner ruling, 2026-07-31.

---

## Pre-publish checklist (run on every article)

- [ ] Cold-read as a first-time staff engineer: circle every term not in
      baseline vocabulary; each circled term has a gloss at first use
- [ ] Every consequence has its mechanism on the page; every number has
      its premise
- [ ] Lede / crux / problem each say the shared material at a different
      depth (no same-depth repetition)
- [ ] One governing image, introduced explicitly, used consistently
      across article and artifact
- [ ] Em-dashes ≤ ~1 per section; no internal taxonomy terms; no
      unsourced claims
- [ ] Pattern notes read in the article's plain voice, not registry
      vocabulary; source product names lead with the descriptive role
      (brand demoted to one parenthetical)
- [ ] All fields in band (summary 550–1050 · crux 400–1100 · problem
      1300–3000 · solution 2400–4500 · cruxSummary 12–16 words); list
      every GENUINE tradeoff, no target count (owner ruling 2026-07-31:
      not 6, not any fixed number — could be 2, could be 8; the test is
      whether each is a real tradeoff the source earns, and whether any
      genuine one is missing)
- [ ] Artifact: all interactive controls visible in their default state;
      labels glued to control groups; meters consistent with verdicts;
      scenario table executed headless
- [ ] Teaser and TRY text kept evocative (the UI, not the copy, does the
      instructing)

---

---

25. **In tradeoffs, prefer plain cause-and-effect over the quotable
    aphorism.** The recurring drift the owner catches in drafts is the
    clever compressed one-liner, especially at the end of a tradeoff
    ("paid for in blast radius," "the ledger stays open," "the benchmark
    you didn't run is the regime your rollout finds for you"). The
    compression that makes a line memorable is the same thing that makes
    it opaque on first read. Write the mechanism as cause and effect
    instead: what happens, and what that leads to. An earned plain summary
    is fine; a metaphor stacked on a metaphor is not. This is the single
    most frequent note across the review rounds. Owner rulings, 2026-07.

26. **In deep-systems / incident articles, every infrastructure term gets
    a plain first-mention gloss.** The generator writes these for a reader
    who already knows the vocabulary, so terms arrive cold - control plane,
    RAFT, LACP, NUMA, service discovery, Go channel, IOPS, transaction-ID
    wraparound all showed up used-before-introduced. The target reader is a
    staff engineer who knows THEIR stack, not necessarily etcd's or
    Consul's or Postgres's internals. Gloss each load-bearing term the
    first time it appears, as deep as the band budget allows, and prefer
    explaining WHY a mechanism does what it does (wraparound halts writes
    because the transaction counter is finite) over just naming it. Ground
    recurring nouns ("the switch") before leaning on them. Owner rulings,
    Roblox / Cloudflare / Notion rounds, 2026-07.

27. **A readability pass touches PROSE ONLY - never structural fields.**
    Editable in a readability round: summary, crux, problem, solution,
    tradeoffs, cruxSummary, and pattern NOTES. Frozen byte-for-byte:
    slug, source, cruxTag, patterns[].slug, relatedArticles, stats
    values, and any other id/reference field. NEVER rename a
    patterns[].slug - even a "typo fix" like idempotency-keys ->
    idempotency-key breaks the reference (validation flags it as an
    [orphan-pattern-slug]) and can silently re-pattern the article. Diff
    every structural field before vs after each round and confirm they
    are identical.

    If, during review, an article seems to DESERVE a pattern change -
    it earns a NEW pattern not in the library, an existing pattern
    should be REMOVED, or one behindscale pattern should REPLACE
    another - do NOT make that change in the readability pass. FLAG IT
    TO THE OWNER as a separate catalog decision, with the article, the
    current pattern, and what you think it should be. Minting, removing,
    or swapping a library pattern has cross-article consequences (back-
    references, catalog entries) and is the owner's call, never a side
    effect of revising one article's prose. Owner ruling, 2026-08 (after
    a slug-rename slip on aws-idempotent-apis and segment-exactly-once-
    delivery that a downstream validation + the implementation agent
    caught; the aws case had also silently shifted a pattern's concept).

28. **Max sentence length: keep prose sentences at or under ~40 words.**
    Long sentences are the most common readability complaint after
    jargon - a reader loses the thread across many clauses even when
    every word is plain. In a readability pass, flag any prose sentence
    over ~40 words and split it into shorter ones (usually at a colon,
    semicolon, or " - and"/" - so" seam). 40 is a soft ceiling, not a
    hard gate like the char bands: an occasional 45-word sentence with
    a clear parallel structure can stay, but a 50+ word sentence almost
    always reads better split, and anything over ~60 must be broken up.
    Splitting rarely changes the char count much, so it does not
    threaten the bands. Applies to summary, crux, problem, solution,
    tradeoffs, and pattern notes. Owner ruling, 2026-08 (raised during
    the stripe-idempotency round, where a 73-word solution sentence and
    several 45-57 word sentences survived an earlier pass). Practical
    check: split each prose field on sentence boundaries, count words,
    and rewrite any that exceed the ceiling before shipping.

## Systemic findings (recur across articles — fix at the source, not per-article)

These have now appeared in 2+ consecutive rounds. They are properties of
the generation prompt or the shared artifact component, not one article's
mistakes — so the durable fix is upstream (change the writer's defaults /
the shared component), with per-article correction as the stopgap.

- **Over-stuffed summary.** The lede reflexively carries every headline
  number. Fix at generation: ledes state the shape of the problem and
  answer; numbers live in problem/solution. (Kafka r1, Meta r1.)
- **Em-dash overrun.** ~30–40 em-dashes per article as a default register.
  (Kafka 41, Meta 28.)
- **Taxonomy-first crux.** Cruxes for articles in a class open with
  "Nth company in the class" / cross-article comparison before the
  article's own thesis. Siblings belong at the END of the crux. (Meta r1
  most severe; Kafka had the milder "semantics-face" leak.)
- **Invisible off-state toggles.** The shared artifact button style renders
  off-state controls background-on-background (#2a2a3a border, #0c0d13 fill
  on a #08090D page). Every artifact using it hides its own controls until
  toggled. Fix the shared component once. (Kafka trouble toggles, Meta
  regime toggles.)

## Round entries

### 2026-07-31 — uber-kafka-consumer-proxy (article + artifact)

**Reviewers:** owner (Akhil) + Claude, joint first readability round.

**Article findings → changes**
- Lede/crux/problem repeated the same argument at the same depth →
  redistributed: lede feels, crux argues, problem proves (P6).
- ~120-word lede sentence with arithmetic inside a parenthesis → split;
  arithmetic moved to Problem (P2, P5).
- Undefined at first use: watermark, rebalance, KIP-415/429, tracker
  size, bounded consumption, head-of-line blocking, backpressure,
  at-least-once→dedup chain → all glossed (P3).
- Our own coinages forced decoding: "the log," "escape hatches,"
  "hot-spotting," "partition budget," "priced honestly," "organizational
  physics," "semantics-face" → replaced with plain versions; taxonomy
  term removed (P3, P9).
- "Single-file lane" upgraded to an explicitly introduced checkout-lane
  image, used consistently across article and artifact (P4).
- Missing load-bearing fact restored: each partition is still read by
  exactly one proxy node (Kafka's view unchanged; freedom lives above).
- Unsourced "1,000+ services on uForwarder" cut; open-sourcing mention
  kept (P10).
- Owner-supplied wording adopted verbatim: "running the message-queue
  workload on the streaming system's rules."
- Formatting: em-dashes 41 → ~2; crux → 3 paragraphs; solution → 5;
  all bands verified by script (P12–P14).
- Tradeoffs simplified: triad unpacked in plain words in #1; "contiguous
  watermark" → "the done-up-to-here line" in #2; pacing mechanism
  explained before the mitigation list in #4; toll stated concretely
  in #5.

**Artifact findings → changes**
- BUG: naive+poison — PROGRESS meter read "moving" forever while the
  verdict said jammed; movement check now barrier-aware (P17, P18).
- Trouble toggles invisible when off (background-on-background), found
  by the owner failing to locate them → permanent signal-color borders,
  state by fill (P15).
- TROUBLE label orphaned from its buttons at wrapped widths → MODE and
  TROUBLE split into dedicated rows (P16).
- Neutral off-state border lightened (#2a2a3a → #4a4f60) so inactive
  buttons read as controls.
- Teaser and TRY text reverted to original evocative wording after the
  visibility fix made instructional copy unnecessary (P11).

**Open items**
- Pattern notes still carry the old dense register ("launder healthy
  messages," "TCP SACK's exact shape") — untouched this round; decide
  whether pattern-note register should match article register.
- AGENT CHECK: does the article renderer split `crux` on \n\n paragraph
  breaks (like problem/solution), or render it flat? The revised crux
  has 3 paragraphs.
- AGENT CHECK: does the schema support a secondary citation (needed if
  the uForwarder open-sourcing mention should be sourced to Uber's repo)?
- Parked artifact upgrades (owner call): ticks-to-drain metric, visible
  tracker-window bracket on the lane, state carry-over on the
  oooack→dlq switch, per-mode "done"/"ack" cell labels, explicit
  NACK→DLQ button.
- Toggle-visibility and label-orphaning likely affect other artifacts
  sharing the same inline-style conventions — audit the set.


### 2026-07-31 — meta-silent-data-corruption (article + artifact)

**Reviewers:** owner (Akhil) + Claude, second readability round. Ran the
checklist against the article *before* reading — the gate predicted three
of the findings (over-band summary, em-dash overrun, taxonomy-first crux),
which is the doc working as intended.

**Article findings → changes**
- Summary 1,398 → 1,028: it was carrying every headline number (68M, 4B,
  2.5B, 1000×, 70/15/6mo/23%). Stats returned to problem/solution; lede
  keeps only the shape of the answer (P1, P6).
- Crux 1,232 → 1,088, and REORDERED: it opened with the Slack/Cloudflare
  class taxonomy ("third company in the class") before landing Meta's own
  thesis — the P9 violation, as the crux's first move. Fixed by leading
  with Meta's own problem, landing the thesis, and moving the sibling
  comparison to the END of the crux. Owner ruling: siblings go last, not
  first (P9). Crux kept as ONE paragraph — see P13; it is a single
  sustained argument.
- Glossed at first use: "gray failure" (machine neither up nor down but
  wrong), "datapath dependencies" (rephrased to "the way data flows
  through specific circuits"), "fleet-seconds/machine-seconds" (cumulative
  test time across the fleet), and "SDC" spelled out at the coverage
  switch (P3).
- Em-dashes 28 → 12 (P12).
- Owner ruling on P13: paragraph count is never a target; one paragraph is
  correct when there is one topic. Struck the "cruxes should be three
  paragraphs" reading that had crept in from the Kafka round.

**Artifact findings → changes (both bugs confirmed by headless trace)**
- BUG 1 (breaks the marquee lesson): rare-mode defect + ripple armed was
  caught by ripple — the exact thing ripple is supposed to be blind to,
  and what the teaser promises only the deep test can see. Guard fixed so
  ripple never quarantines a rare defect; verified rare/both now falls to
  fleetscanner at exp=24, rare/ripple-only never quarantines (P17, P18).
- BUG 2 (misleading latency): deep-test detection fired on absolute clock
  (t % 24), so exposure depended on when the user clicked — planting near
  a boundary made fleetscanner look instant and killed the
  "months of exposure" lesson. Now measured from a plantedAt, one full
  interval after planting; verified plant@0 and plant@17 both give exp=24
  (P18).
- Toggle/plant buttons used the same background-matching off-state as the
  Kafka artifact (confirming the cross-artifact audit item) → neutral
  border lightened; FLEETSCANNER (amber) and RIPPLE (green) get permanent
  signal-color borders, state by fill (P15).

**Systemic pattern (promoted — see note below the principles):** the
over-stuffed summary, em-dash overrun, taxonomy-first crux, and
invisible off-state toggles all recurred from the Kafka round. These are
house-style defaults of the generator/shared component, not per-article
slips.

**Follow-up fixes (same session, after owner re-read)**
- Product names Fleetscanner/Ripple demoted to descriptive "deep test /
  shallow test" throughout, brand kept as one parenthetical each → new P20.
- Tradeoffs stripped of remaining em-dashes (several each → 0); whole
  article now at 2 em-dashes total, both earned (crux coda, problem
  example).
- "The constant test has to be a polite guest" metaphor unpacked to plain
  language (P3).
- Both pattern notes rewritten out of registry vocabulary into the
  article's plain voice → new P19, which RESOLVES the standing pattern-note
  register question (answer: yes, must match).
- Confirmed with owner: the source post gives NO concrete test example
  (no sample bit pattern/benchmark); our abstraction level faithfully
  matches the source. Detail, if wanted, lives in the arXiv paper
  (2203.08989) — a different source under the first-party-blog policy.

**Open items**
- AGENT CHECK: crux renders with 1 paragraph here; confirm renderer
  handles single-paragraph and multi-paragraph crux identically.
- AGENT CHECK (repeat): does the crux renderer split on \n\n? (Kafka's
  crux is 3 paragraphs; Meta's is 1 — both need to render right.)
- Related-article slugs (slack-cellular-architecture,
  cloudflare-byzantine-failure) and their titles in the "Also solving
  this" block are my guesses from the JSON — verify against the live
  catalog before shipping the page copy.


### 2026-07-31 — slack-scaling-job-queue (article + artifact)

**Reviewers:** owner (Akhil) + Claude, third readability round. Checklist
run cold before reading. This one scored differently from the first two —
see the three-for-three note below.

**Checklist result on arrival:** all four fields already in band (summary
901, crux 615, problem 2232, solution 3115); crux opens with Slack's own
failure, NOT class taxonomy; **artifact sim has no logic bug** (first clean
sim of the three — traced every state including the lock-stays-after-fix
anticlimax and manual-intervention release). So a light pass: em-dashes,
four glosses, pattern notes, toggle visibility.

**Article findings → changes**
- Em-dashes 25 → 7 (all 7 earned: example-list intros and glosses at
  natural pauses) (P12).
- Glossed at first use: "complete bipartite graph" → plain "every enqueuer
  had to track every Redis instance, a full mesh growing on both sides";
  "unclean leader election" → "force Kafka to promote a broker that might
  be missing recent writes"; "leader-only acknowledgment" → one plain
  sentence on Kafka's copy-to-several-brokers model and what waiting only
  for the leader trades; "poison job" leaned on plain description (P3).
- "Minimum viable change" kept (load-bearing thesis) but landed in plain
  words at first use: "the smallest change that removed the failure mode
  rather than a ground-up rewrite" (P3).
- Product names Kafkagate/JQRelay KEPT (owner ruling: more load-bearing
  than Fleetscanner/Ripple — the gateway-vs-relay roles genuinely matter)
  but each bound to its role at first mention: "The gateway, Kafkagate,
  ..." / "The relay, JQRelay, ..." (P20, applied with the keep-both
  variation).
- Both pattern notes rewritten out of registry voice ("The post's central
  move, stated as its first goal"; "Third company, with an honest edge";
  "Discord's and Meta's property") into plain description; direct quotes
  from the post paraphrased (P19; consistency with paraphrase-first).
- cruxSummary reworded to drop the em-dash (16 words, in band).

**Artifact findings → changes**
- NO sim bug (verified headless). Left the logic untouched.
- Toggle visibility: same background-matching off-state as Kafka/Meta →
  neutral border lightened, DOWNSTREAM SLOWDOWN toggle given a permanent
  red border, state by fill (P15).
- Noted and KEPT as-is: the intervene button (disabled until the lock
  engages) is the anticlimax made tactile — excellent, untouched. The
  useRef/force manual-render pattern is unusual but correct — flagged so a
  future reviewer doesn't "fix" it.

**Three-for-three systemic scorecard**
- Em-dash overrun: PRESENT (25). 3/3 — confirmed house-style default.
- Invisible off-state toggles: PRESENT. 3/3 — confirmed shared-component
  default.
- Registry jargon in pattern notes: PRESENT. 3/3 — confirmed.
- Over-stuffed summary: ABSENT here (in band). 2/3 — a tendency, not baked
  in.
- Taxonomy-first crux: ABSENT here (crux is exemplary). 2/3 — a tendency.
  → Conclusion: three defects are confirmed systemic (fix at source: the
  three em-dash / toggle-component / pattern-note-generation points). Two
  are intermittent (prompt-level nudges, not hard fixes).

**Follow-up fixes (same session, after owner re-reads)**
- Owner asked for single spaced hyphens over em-dashes; converted ALL
  em-dashes to " - " across the Slack JSON, the artifact JSX, and the
  sample page (article prose, teaser, stat labels, title, and sim verdict
  strings). This established the new P12 rule (see above), which
  supersedes the "em-dashes 25 to 7, all earned" note in this entry.
- Second reader pass, targeted fixes: the confusing "O(queue length)" stat
  rewritten to value "Grows with length" with a label that states the
  cost-grows-with-length relationship; "sliver of free memory" to "a
  little free memory"; "bracket the new tier" to "sit on either side of";
  the overloaded synchronous-write sentence split in two; Consul glossed
  at first mention ("a coordination service the fleet uses to agree on who
  holds what"). Five phrases owner flagged were defended and left as
  standard staff vocabulary / earned payoff lines, pending owner's word.
- Artifact pacing: owner found Redis filled and locked in under 5s.
  Lowered the enqueue rate (30 to 14) so the OLD/slow queue now takes ~9s
  to seize — slow enough to read the meters, still clearly headed for the
  lock. Model otherwise untouched; healthy drain and NEW-system behavior
  verified unchanged headless.

**Open items**
- Related-article slugs/titles in "Also solving this" are guesses from the
  JSON — verify against live catalog before shipping page copy.
- AGENT CHECK (repeat, still open): crux renderer must handle 1-paragraph
  (Meta) and multi-paragraph (Kafka) crux; Slack's is 1 paragraph.
- Pattern-note quote paraphrasing: confirm the article schema / live
  renderer doesn't expect the exact sourced quote strings anywhere.


### 2026-07-31 - uber-intelligent-load-management (article + artifact)

**Reviewers:** owner (Akhil) + Claude, fourth readability round. NOTE: this
article is dated 2026-04-20, AFTER Claude's training cutoff, and covers a
Uber system (Cinnamon) Claude has no reliable prior knowledge of. Per the
no-guessing rule, the review was grounded in a fresh fetch of the source
post, not memory. Every figure checked against source: accurate (+80%,
3.1s->1.0s, 150K->10K goroutines, 5,400 vs 3,000 QPS, t0-t5, CoDel/
Scorecard/Regulators/BYOS). No fabrication.

**Checklist on arrival:** all 4 fields in band; crux opens with the problem
(not taxonomy). Two structural findings: only 4 tradeoffs (see owner ruling
below), and the crux was the thinnest of any article (422, deepened to 807).

**Owner ruling on tradeoff count:** drop "6 is the standard" entirely.
List every GENUINE tradeoff, no target number - could be 2, could be 8.
The test is whether each is a real tradeoff the source earns, and whether
any genuine one is MISSING. (Checklist updated.) For this article that
meant ADDING two the source genuinely earns but the draft omitted:
(a) fail-fast/LIFO throws away work already partly paid for, and
(b) placing control at the storage layer couples overload protection to
the storage engine - the exact mirror of why the quota-layer design
failed, and why this can't be a reusable layer above many systems. 4 -> 6,
because they're genuine, not to hit a number.

**Article findings -> changes**
- Crux deepened (422 -> 807): added the "surviving overload vs surviving it
  well are different problems" framing that names why the class is hard.
- Glossed: split-brain (two controllers making opposite decisions about the
  same traffic at once), follower commit lag (a leader waiting for its
  backup copies to catch up), LIFO spelled as last-in-first-out. PID and
  CoDel glosses from the draft kept (both good).
- Em-dashes swept to spaced hyphens (P12): article 15 + notes 3 -> 0.
- Both pattern notes rewritten out of registry voice ("the canonical
  implementation," "Cinnamon is the worked instance") into plain
  description (P19).
- BYOS paragraph un-nested (had a parenthetical inside a parenthetical) and
  expanded for readability; brought solution back into band.

**Artifact findings -> changes**
- BUG (breaks the core lesson, like Meta's rare-defect bug): T1 AVAILABILITY
  displayed ~100% in CoDel-batch while the verdict right beside it said
  "Rides paid to protect pipelines." Cause: CoDel bulk-shed incremented
  shed[k] without decrementing acc[k], so acceptedCum double-counted dropped
  requests. Fixed (subtract from acc); verified headless: CoDel batch now
  shows t1=77% (matching its verdict), Cinnamon shows t1=100% with all drops
  from t5. The phase-2->phase-3 contrast, the whole point of the artifact,
  is now truthful on screen. Drop counters were always right; only the
  availability metric the verdict pointed at was wrong (P17, P18).
- BYOS toggle used the invisible background-matching off-state; it drives the
  entire lag lesson (lag stabilizes only with it ON), so given a permanent
  orange border, state by fill. Neutral selector off-border lightened (P15).
- Em-dashes in JSX swept to hyphens (35 -> 0).
- Sample page built by running the ACTUAL shipping .jsx via inline Babel
  (React CDN) rather than hand-porting to vanilla JS - so the preview cannot
  diverge from what ships. (Needs internet to render the artifact; the
  article text renders regardless.)

**Four-for-four systemic scorecard**
- Em-dash overrun: PRESENT. 4/4.
- Invisible off-state toggles: PRESENT (BYOS). 4/4.
- Registry jargon in pattern notes: PRESENT. 4/4.
  -> All three now confirmed across every article reviewed. The case for
  fixing at source (generator prompt + shared toggle component +
  pattern-note generation) is as strong as it gets.
- Over-stuffed summary: BORDERLINE (in band, crams all result numbers in
  the last sentence). ~3/5.
- Taxonomy-first crux: ABSENT (crux opens with the problem). 2/5.

**Open items**
- Related-article slugs/titles in "Also solving this" are guesses - verify
  against live catalog before shipping page copy.
- AGENT CHECK (repeat): crux renderer must handle 1-paragraph (this one is
  1) and multi-paragraph crux.
- This article has an updatedAt (2026-06-12) after its addedAt - suggests it
  was revised post-add; worth confirming the JSON we have is the current
  live version before overwriting.


### 2026-07-31 - aws-load-shedding (article + artifact)

**Reviewers:** owner (Akhil) + Claude, fifth readability round. AWS
Builders' Library (David Yanacek), after-cutoff (updated May 2026) -
reviewed against a fresh source fetch, not memory. Accurate, no
fabrication.

**THE ONLY ARTICLE TO FIRE ALL FIVE SYSTEMIC DEFECTS AT ONCE:**
- Summary 1,573 (523 over) - worst of all five articles.
- Crux 1,445 (345 over).
- Em-dashes 39 in prose + 3 in notes - most of any article.
- Taxonomy-first crux: opened "Same class as Uber, Netflix, and Stripe,
  joining from the opposite direction" as the literal first six words.
- Registry jargon in all three pattern notes ("class doctrine stated as a
  field manual," "Minted from," "Second company").
This is the generator at its most florid, and the strongest single case
for fixing the systemic defects upstream rather than per-article.

**Article findings -> changes (heaviest pass of the five)**
- Summary + crux rebuilt into band; crux de-taxonomized (leads with AWS's
  own overload problem, siblings moved to the end, per the Meta rule).
- Deepest plain-language pass yet on an unusually ornate register (the
  footer alone was a 120-word single sentence; the body leaned on "the
  drop budget," "decays into wrong," "manufactured from half-completed
  sagas").
- Glossed: goodput vs throughput (the central term, defined at first use),
  brownout (up but too degraded to be useful), Universal Scalability Law
  (adding work helps less and less because the un-parallelizable parts
  bottleneck). PID-style acronym-by-what-it-is treatment (P21).
- All em-dashes -> spaced hyphens (P12).
- All three pattern notes rewritten out of registry voice into plain
  description (P19).

**Artifact findings -> changes**
- IMPORTANT PROCESS NOTE: Claude's FIRST sim trace used wrong constants
  recalled from reading (PER_SERVER=60, HUMAN=140) and wrongly reported a
  "surge trigger trap" - claiming the blind-shed fleet-shrink lesson
  needed SURGE+CRAWLER. Re-tracing with the ACTUAL file constants
  (PER_SERVER=30, HUMAN=80) showed the sim is CORRECT: mode-2 blind
  shedding shrinks the fleet 4->1 on SURGE alone, and every mode behaves
  as taught. There was no bug and no trap. This is a live demonstration of
  exactly why the standing rule is "verify against the real file, never
  reason from memory" - the correction came from re-reading the constants,
  not from the first confident read.
- Only real fix needed: toggle visibility. surge/crawler/storm toggles used
  the invisible background-matching off-state; given permanent amber/red
  borders, state by fill (P15). Em-dashes in JSX swept (20 -> 0).
- Sample page built via inline Babel running the real shipping .jsx (as
  with Cinnamon), so preview can't diverge from ship.

**Five-for-five scorecard**
- Em-dash overrun: PRESENT. 5/5.
- Invisible off-state toggles: PRESENT. 5/5.
- Registry jargon in pattern notes: PRESENT. 5/5.
  -> Three hard systemic defects now confirmed in every article. Fix at
  source: generator prompt, shared toggle component, pattern-note
  generation.
- Over-stuffed summary: PRESENT (worst yet). 4/5.
- Taxonomy-first crux: PRESENT. 3/5. Both now recur often enough that even
  the "intermittent" two deserve prompt-level nudges.

**Open items**
- Related-article slugs/titles in "Also solving this" are guesses - verify
  against live catalog.
- This article's source has an updated_time of 2026-05-27; confirm the JSON
  we revised matches the current live article before overwriting.


### 2026-07-31 - stripe-rate-limiters (article + artifact)

**Reviewers:** owner (Akhil) + Claude, sixth readability round. Stripe
Engineering (Paul Tarjan, 2017). Primary post wasn't directly fetchable;
grounded in source snippets (four limiters, token bucket, 20% reservation /
503, four scenarios, "identical to the concurrent limiter" detail) - all
match. Accurate.

**Checklist on arrival:** all 4 fields in band, crux opens with the problem
(not taxonomy), stats present. Second CLEAN sim of the six (after Slack):
traced every scenario - flood dilutes charges to 55% (crux), rate limiter
fixes flood but is useless vs a legit incident (55%, same as none = the
"pacing fairness stops being the right question" lesson), fleet reservation
and worker ladder both hold charges at 100%, flap mode oscillates 0,3,0,3
vs damped climb-and-hold. No logic bug. Best interactive beat of the six is
the flap-mode "I brought it back! Everything is awful!" tuning lesson.

**Article findings -> changes (lighter pass; the article was already strong)**
- Em-dashes swept to hyphens across JSON + JSX + page (including the stats
  labels, which the first sweep missed - watch the stats array, it's a
  recurring last-place em-dash hideout).
- Glossed: concurrent-requests limiter (caps requests in flight at once vs
  the rate limiter's per-second cap), 503 vs 429 (503 = server shedding
  load, 429 = one user being paced). Token bucket gloss kept + refined.
- All 3 pattern notes rewritten out of the heaviest registry voice of any
  article ("FOURTH company," "chronologically the earliest instance on the
  site (2017)," "minted from its own taxonomy," "under-damped control by
  another name," "AIMD") into plain description. OWNER RULING applied: KEEP
  the sibling cross-references where they add value, but write them for a
  reader who hasn't read the siblings ("Uber, Netflix, and DoorDash each
  solve the same problem differently, with tiers and controllers, playback
  protection, and priority headers respectively").
- cruxSummary de-em-dashed.

**Artifact findings -> changes**
- NO sim bug (verified headless). Logic untouched.
- Toggle visibility: scenario faults (flood/incident) given permanent amber
  borders, FLAP given clean permanent-red tog style (it had a partial
  red-when-on fix already; off-state still vanished), neutral off-border
  lightened (P15). Sim re-verified identical after the style edits.
- Sample page via inline Babel running the real shipping .jsx.

**Note on scope:** article describes 4 limiters; artifact exposes 3 toggles
(rate / fleet / worker). The concurrent-requests limiter is folded out
because its mechanism is identical to the fleet shedder (the source itself
says so). Reasonable simplification, not a gap.

**Six-for-six scorecard**
- Em-dash overrun: PRESENT. 6/6.
- Invisible off-state toggles: PRESENT. 6/6.
- Registry jargon in pattern notes: PRESENT (worst instance - "FOURTH
  company" opened two of three notes). 6/6.
  -> All three hard defects now confirmed in every one of the six articles
  reviewed, no exceptions. The upstream-fix case (generator prompt + shared
  toggle component + pattern-note generation) is complete.
- Over-stuffed summary: borderline (in band). 4/6.
- Taxonomy-first crux: ABSENT. 3/6.

**Open items**
- "Also solving this" slugs are guesses - verify against live catalog.
- Primary Stripe post wasn't directly fetchable this session; if a fetchable
  canonical URL exists, re-verify the one or two paraphrased figures
  (12,000/month concurrent-limiter, 100/month worker-shedder) against it.


### 2026-07-31 - netflix-prioritized-load-shedding (article + artifact)

**Reviewers:** owner (Akhil) + Claude, seventh readability round. Netflix
TechBlog, 2024-06-25, after-cutoff. Medium blocks direct fetch (ROBOTS_
DISALLOWED); grounded in multiple mirrors + Netflix reposts + InfoQ. Every
checkable claim accurate: two partitions (user-initiated 100% / pre-fetch
excess), the "steal" mechanism, Servlet filter reading X-Netflix.Request-
Name without body-parse, four buckets after Linux tc-prio, writes-over-reads
Data Gateway, and all three incident numbers (12x / >99.4% / 20%). No
fabrication.

**Checklist on arrival:** one band violation - solution 4,660 (160 over),
the longest of any article because this piece packs the most mechanisms
(partitioned limiter + 2018 adaptive substrate + 4 buckets + CPU/latency/
storage signals + 2 anti-patterns + incident). Owner ruling: COMPRESS, don't
cut mechanisms - trimmed the storage-SLO explanation and dropped the tc-prio
aside, solution 4,660 -> 4,443, every mechanism kept. Crux problem-first,
cruxSummary 14 words, 6 genuine tradeoffs, stats present.

**THIRD CLEAN SIM of the seven (after Slack, Stripe).** Most elaborate
artifact yet - THREE views: (1) two-instance availability comparison, (2)
side-by-side shedding curves (2020 gateway cubic vs 2024 service staircase),
(3) a RUNNABLE adaptive-concurrency saw-tooth with a mid-run capacity shift.
Traced all three headless: adaptive loop produces correct probe-and-back-off
and tracks capacity 60->35->75; staircase enforces the cascade invariant
exactly (each bucket fully shed before the next, CRITICAL only past 84%);
cubic gateway anchors match the post (~35->95, ~80->~50, ~95->~10). No logic
bug. Best single interactive element across all seven is the runnable
saw-tooth.

**Article findings -> changes**
- Solution trimmed into band (see above).
- Glossed: concurrency limiter (a cap on how many requests are processed at
  once, vs per-second - same gloss as Stripe), gradient (best-case latency
  / current latency, grow when fast / shrink when slow), tc-prio (cut the
  bare acronym, kept "Linux's traffic-priority levels" in the pattern note),
  ChAP -> "live A/B experiments" (cut the product name).
- Em-dashes swept to hyphens (JSON + JSX + page incl stats labels).
- All 3 pattern notes rewritten out of registry voice ("The canonical
  multi-tier instance," "textbook feedback loop") into plain description.
  Owner ruling applied: KEPT the Uber cross-references (same-principle-
  different-layer is genuinely illuminating) but written for a reader who
  hasn't read the Uber piece.

**Artifact findings -> changes**
- NO sim bug. Logic untouched.
- Pill toggle visibility: the inject-latency toggle (drives view 1) used the
  invisible #2a2a3a off-border. Added a signal=true mode to Pill giving fault
  toggles a permanent colored border, state by fill; neutral off-border
  lightened for all other pills (P15). Models re-verified identical after.
- Sample page via inline Babel running the real 3-view shipping .jsx.

**Seven-for-seven scorecard**
- Em-dash overrun: PRESENT. 7/7.
- Invisible off-state toggles: PRESENT. 7/7.
- Registry jargon in pattern notes: PRESENT. 7/7.
  -> All three hard defects now in every one of the seven articles reviewed.
- Over-stuffed summary: ABSENT (599 chars). 4/7.
- Taxonomy-first crux: ABSENT (crux problem-first). 3/7.

**Open items**
- "Also solving this" slugs are guesses - verify against live catalog.
- Medium source not directly fetchable; if Netflix's own netflixtechblog.com
  mirror is fetchable later, re-confirm the exact CPU-threshold numbers used
  in the staircase (the artifact's 60/66/72/84 bucket boundaries are
  illustrative, labeled as such in the footer).


### 2026-07-31 - roblox-return-to-service (article + artifact + pattern merge)

**Reviewers:** owner (Akhil) + Claude, eighth readability round. Roblox Blog,
2022-01-20. First article OUTSIDE the load-shedding class - this is an
observability / circular-dependency incident (the 73-hour Consul outage).
Source fetched in full and the article is EXCEPTIONALLY accurate: every
number (73h, 18k servers/170k containers, KV p50 300ms->2s, 128-core
dual-socket NUMA, 7.8MB freelist / 4.2GB file / 489MB data / 16kB append,
1B req/s cache, ~10% DNS increments), both root causes, the four-theory
sequence, and all three remediation grains check out. No fabrication.

**Checklist on arrival:** all bands OK, crux opens with the technical failure
(not taxonomy). FOURTH CLEAN SIM of the eight (after Slack, Stripe, Netflix).
Artifact is a STATE-MACHINE FLOW, not a numeric sim - traced every path:
gating correct (leaders blocked before streaming off, admit blocked before
Consul healthy), clock arithmetic correct, and the core teaching contrast
works - burning all four theories blind costs ~67 simulated hours vs ~15 if
you flip INDEPENDENT TELEMETRY on first (the 73h-vs-hours lesson made
playable). Best conceptual hook of the eight: dashboards literally go dark
(blurred NO DATA gauges) until you sever the telemetry dependency. No logic
bug.

**Article findings -> changes (heaviest gloss load of the eight - deep-systems post-mortem)**
- Em-dashes swept to hyphens (JSON + JSX + page incl stats labels).
- Glossed, fitting the deeper terms in budget per owner: service discovery
  (how one service finds another's address), Go channel (the queue-like pipe
  Go's lightweight threads use to hand off work), NUMA (two-processor
  machines where each reaches its own memory faster than the other's), Raft
  (the consensus algorithm keeping every copy of cluster state in agreement)
  + Raft log, TCP zero window (receiver telling sender to stop, buffer full).
  BoltDB freelist mechanism kept (already well explained).
- Register de-ornamented throughout (the source is plain; the article had
  drifted florid - "went spelunking," "the ledger stays open," "priced in
  blast radius").

**PATTERN MERGE (owner ruling): 4 notes -> 3.** independent-observability and
circular-dependency-avoidance were near-duplicates (same observer-must-not-
depend-on-observed lesson, same Airbnb sibling, same remediation quote).
Merged into ONE article note under independent-observability, folding the
circular-dependency framing in as the general anti-pattern it's an instance
of. ALSO merged the two PATTERN LIBRARY FILES: independent-observability.json
now absorbs circular-dependency-avoidance.json (definition gains the circular-
dependency general form + domain examples: deploy/secrets/DNS/CA loops;
whenItApplies 3->6, tradeoffs 3->6). circular-dependency-avoidance.json is
RETIRED - flag for catalog: any pattern chip / relatedPattern pointing to
'circular-dependency-avoidance' should redirect to 'independent-observability'.
All 3 surviving notes rewritten to plain voice (dropped "absence-cost
instance," "canonical statement," "Second company").

**Artifact findings -> changes**
- NO sim bug. State-machine logic untouched.
- Toggle visibility: INDEPENDENT TELEMETRY (the pivot switch) given a
  permanent-blue tog border, neutral off-border lightened (P15).
- Sample page via inline Babel running the real shipping .jsx.

**Eight-for-eight scorecard**
- Em-dash overrun: PRESENT. 8/8.
- Invisible off-state toggles: PRESENT. 8/8.
- Registry jargon in pattern notes: PRESENT. 8/8.
  -> All three hard defects now in every one of eight articles across TWO
  different pattern classes (load-shedding x7 + observability x1). The
  defects are class-independent = definitively house-style/component, not
  topic-specific. Upstream-fix case is now airtight.
- Over-stuffed summary: ABSENT. 4/8. Taxonomy-first crux: ABSENT. 3/8.

**New finding worth a principle (P24 candidate):** near-duplicate pattern
notes on one article (two patterns that are really one lesson) should be
merged, and the merge should extend to the pattern library files themselves,
not just the article - otherwise the catalog keeps two near-identical pattern
pages. When merging, keep the more specific/positive slug as primary and fold
the general one in as the anti-pattern it instances.

**Open items**
- Catalog redirect: circular-dependency-avoidance -> independent-observability
  (retired this round).
- "Also solving this" slugs (airbnb-monitoring, datadog-observer-fate,
  reddit-piday) are guesses - verify against live catalog.


### 2026-07-31 - cloudflare-byzantine-failure (article + artifact)

**Reviewers:** owner (Akhil) + Claude, ninth readability round. Cloudflare
Blog, 2020-11-27 (Lianza/Snook). Source fetched in full - the article is
accurate AND careful: it already carries Cloudflare's own postscript
correction (this was an omission fault, not a true Byzantine fault), in both
the article body and the artifact footer. Every figure checks (6h33m, 75%,
80x, six-minute switch recovery, three-node etcd split, promotion-forces-
rebuild defect, 21:20 recovery). Second "healthy-but-wrong" / redundancy-
failure article (with Roblox), not load-shedding.

**Checklist on arrival:** one violation - cruxSummary 17 words (band 12-16),
trimmed to 15. Bands otherwise OK, crux problem-first, 6 tradeoffs, stats
present. FIFTH CLEAN SIM of the nine (after Slack, Stripe, Netflix, Roblox).
State-machine artifact, elegant: kill the switch dead (failover shrugs),
degrade it half-alive (cascade fires), and - the killer beat - set the
promotion trigger PAST six minutes and watch the whole incident evaporate as
a near-miss (literally Cloudflare's post-incident fix made playable). Traced
every path headless: all correct. No logic bug. shed/steer mitigation
tradeoff (helping API hurts dashboard) faithful.

**Article findings -> changes**
- Em-dashes swept to hyphens (JSON + JSX + page incl stats labels).
- OMISSION-FAULT NUANCE (owner said go with my lean): kept the Byzantine
  framing (Cloudflare's title, the recognizable hook) but surfaced the
  omission-fault correction EARLIER, in the crux, instead of leaving it only
  as the closing footnote. "The post named this Byzantine, then corrected it
  to an omission fault: not a node lying, just one unreachable on a single
  path."
- Glosses as deep as budget allows (owner ruling): crash-stop (component is
  up or down, tells truth or says nothing), LACP (bundles physical links so
  they act as one, spreading traffic - which is WHY the partial failure hid),
  BGP (announces which routes the switch can carry), vPC (makes a switch pair
  look like one), RAFT (algorithm that keeps a cluster agreed on one leader),
  synchronous vs asynchronous replica (in step with the primary vs lagging
  slightly). etcd gloss from summary kept.
- Register left mostly intact - this article was already fairly plain and
  the omission-fault handling is genuinely well-written ("The title
  overclaimed; the postscript said so").

**Artifact findings -> changes**
- NO sim bug. State-machine logic untouched.
- Toggle visibility: KILL DEAD (violet) and DEGRADE (red) fault toggles given
  permanent-color tog borders, neutral off-border lightened (P15). State
  machine re-verified identical after.
- Sample page via inline Babel running the real shipping .jsx.

**Nine-for-nine scorecard**
- Em-dash overrun: PRESENT. 9/9.
- Invisible off-state toggles: PRESENT. 9/9.
- Registry jargon in pattern notes: PRESENT. 9/9.
  -> All three hard defects now in every one of nine articles across the
  load-shedding class (x7) AND the redundancy/observability class (Roblox,
  Cloudflare). Class-independent, definitively house-style/component.
- Over-stuffed summary: ABSENT. 4/9. Taxonomy-first crux: ABSENT. 3/9.

**Note for the catalog:** this article's crux-tag and "Also solving this"
point to a 'partial-failure-defeats-redundancy' class (siblings Roblox, Meta
SDC, Datadog) - distinct from the load-shedding 'priority-blind' class.
Confirm that class/term exists in the live catalog or is being minted.

**Open items**
- "Also solving this" slugs (roblox, meta-sdc, datadog) are guesses - verify
  against live catalog.
- A concurrent surface built r36 (stripe-docdb) on this library today; no
  conflict with this readability round, but if pattern files or the board
  were touched, re-check before the next round.


### 2026-07-31 - notion-sharding-postgres (article + artifact)

**Reviewers:** owner (Akhil) + Claude, tenth readability round. Notion Blog
(Garrett Fidalgo, 2021-10-06). Source fetched in full - HIGHLY accurate,
every mechanism/number checks out incl the verbatim Cookie Clicker quote and
the exact 480-factors / 512-would-double reasoning. NEW CLASS: single-table-
scaling-ceiling / database sharding (first non-load-shedding, non-observability
article; siblings Figma/Pinterest/Canva).

**Checklist on arrival:** all bands OK, crux problem-first, cruxSummary in
band, stats present. Only 2 pattern notes (most articles have 3). SIXTH CLEAN
SIM of the ten (after Slack, Stripe, Netflix, Roblox, Cloudflare) and one of
the best - 5-stage migration flow. Traced every path: the VERIFICATION TRUTH
TABLE is exactly right (only version-compare-OFF + same-author yields a false
pass that ships corruption; two independent authors CATCH the dirty backfill
= the post's sharpest lesson made playable), and the 512-vs-480 shard-growth
explorer is correct (480 grows even to 40/48 hosts, 512 forces doubling to
64). Wraparound risk meter runs throughout as an existential clock. No logic
bug.

**Article findings -> changes**
- Em-dashes swept to hyphens (JSON + JSX + page incl stats labels).
- Glossed (P26, deep-systems): transaction-ID wraparound WITH THE WHY (the
  txn counter is finite, DB halts writes rather than risk reuse+corruption),
  dead rows (old row versions no query can see), IOPS (disk ops per second),
  logical replication (built-in feature streaming changes between databases),
  "catalog-only migrations" -> "schema changes." VACUUM gloss kept.
- ALL SIX tradeoff aphorisms plainened (P25, owner ruling "plainen all"):
  "the tools shrink in proportion to how overdue it is" -> "the longer you
  wait, the fewer migration tools you can still afford"; "correlated errors
  not missing checks" -> "the same blind spot showing up in both the
  migration and the check"; "downtime windows are engineering variables not
  fixed ceremonies" kept but unpacked; etc. Kept the earned plain summaries,
  killed the metaphor-stacked ones, all within band.
- 2 pattern notes -> plain voice, KEPT the Discord/Figma/Notion three-company
  application-level-sharding comparison written for a non-reader (owner
  ruling), dropped "Third company in the library."

**Artifact findings -> changes**
- NO sim bug. 5-stage flow logic untouched.
- Toggle visibility: the 3 double-write strategy choices and the 480/512
  selectors given permanent-accent tog borders (selection controls, state by
  fill), neutral off-border lightened (P15). Both sim lessons re-verified
  identical after.
- Sample page via inline Babel running the real 5-stage shipping .jsx.

**Ten-for-ten scorecard**
- Em-dash overrun: PRESENT. 10/10.
- Invisible off-state toggles: PRESENT. 10/10.
- Registry jargon in pattern notes: PRESENT. 10/10.
  -> All three hard defects now in every one of TEN articles across THREE
  distinct classes (load-shedding x7, redundancy/observability x2, database
  sharding x1). Overwhelmingly class-independent = house-style/component.
- Over-stuffed summary: ABSENT. 4/10. Taxonomy-first crux: ABSENT. 3/10.

**Two principles finally added this round (both long-pending):**
- P25: in tradeoffs, prefer plain cause-and-effect over the quotable
  aphorism (the single most frequent note across all ten rounds).
- P26: in deep-systems/incident articles, every infrastructure term gets a
  plain first-mention gloss, explaining WHY over just naming.

**Sim tally across ten:** 6 clean (Slack, Stripe, Netflix, Roblox,
Cloudflare, Notion), 4 with exactly one bug each (all in numeric sims; 2 of
those broke the article's central lesson). Every state-machine/flow artifact
came through clean. The case for a mandatory headless-trace gate before
publish, concentrated on numeric sims, is now ten rounds strong.

**Open items**
- "Also solving this" slugs (figma, pinterest, canva) are guesses - verify
  against live catalog.


### 2026-07-31 - aws-idempotent-apis (article + artifact)

**Reviewers:** owner (Akhil) + Claude, eleventh readability round. AWS
Builders' Library (Malcolm Featonby). Source fetched in full - HIGHLY
accurate, every mechanism checks out incl the verbatim DynamoDB-vs-EC2 intent
contrast, the ClientToken/CloudTrail/DescribeInstances details, ACID all-or-
nothing, ResourceAlreadyExists-has-a-client-side-effect argument, the
pending->running->terminated CLI example, late-arriving least-astonishment,
retention, changed-params validation. NEW CLASS: ambiguous-failure-under-
retry / idempotency (client-side siblings Stripe/Shopify/Airbnb; AWS is the
PROVIDER-side view completing the set).

**Note on upload:** JSX arrived on the second attempt (first upload was the
JSON twice). Full four-file round.

**Checklist on arrival:** summary 23 over (1,073) - trimmed. STATS EMPTY and
LEFT EMPTY - this article is conceptual with no headline figures (no "73
hours" equivalent); manufacturing weak stats would be worse than none. Crux
problem-first, cruxSummary was 13 (fine) but the rewrite pushed it to 17 ->
trimmed back to 15. SEVENTH CLEAN SIM of the eleven (after Slack, Stripe,
Netflix, Roblox, Cloudflare, Notion). State-machine, SEVEN teaching paths,
all traced correct: no-contract retry = 2 instances (dilemma), token retry =
replay/1 (fix), synthetic-hash want-two = wrongly deduped real intent,
atomicity-off + crash = duplicate DESPITE token (ACID lesson, shows crashGap
warning then the retry duplicates live), terminate + late retry = deadReplay
(least astonishment), changed-params = mismatch, retention-expire = processes
as new. No logic bug. Paths 4/7 correctly fall through to "TWO INSTANCES, ONE
INTENT" after the retry - that IS the intended lesson.

**Article findings -> changes**
- Summary trimmed into band; em-dashes swept (JSON + JSX + page).
- Glossed (P26): idempotent/idempotency (a call can be repeated with no extra
  effect) at first use in summary AND crux, ACID (a database guarantee that a
  set of changes either all take effect or none do), least astonishment (the
  least surprising behavior). Singleton/ClientToken/reconciliation already
  well-handled in the source-faithful draft.
- ALL SIX tradeoff aphorisms plainened (P25, owner ruling plainen all within
  budget): "a changed request is a changed intent," "the contract quietly
  protecting users from its own preconditions," "a clock nobody sees" all
  unpacked to plain cause-and-effect, earned summaries kept.
- 3 pattern notes -> plain voice, dropped the WORST registry framing of any
  article ("Fifth article on the pattern, completing four company
  perspectives," "Second company" x2). KEPT the Stripe/Shopify/Airbnb lineage
  written for a non-reader, framed as AWS being the provider-side view (owner
  ruling).

**Artifact findings -> changes**
- NO sim bug. 7-path state-machine logic untouched.
- Toggle visibility: the 3 dedup-mode selectors (NO CONTRACT / SYNTHETIC HASH
  / CLIENT TOKEN) given permanent-accent tog borders, neutral off-border
  lightened (P15). Sim re-verified identical after.
- Sample page via inline Babel running the real 7-path shipping .jsx.

**Eleven-for-eleven scorecard**
- Em-dash overrun: PRESENT. 11/11.
- Invisible off-state toggles: PRESENT. 11/11.
- Registry jargon in pattern notes: PRESENT (worst instance). 11/11.
  -> All three hard defects in every one of eleven articles across FOUR
  distinct classes (load-shedding x7, redundancy/observability x2, db-sharding
  x1, idempotency x1). Conclusively class-independent house-style/component.
- Over-stuffed summary: PRESENT. 5/11. Taxonomy-first crux: ABSENT. 3/11.

**Sim tally across eleven:** 7 clean, 4 one-bug-each (all numeric sims; 2
broke the central lesson). Every state-machine/flow artifact (Roblox,
Cloudflare, Notion, AWS-idempotency, plus Slack) came through clean. The
headless-trace gate case, concentrated on numeric sims, is now eleven rounds
strong.

**Open items**
- "Also solving this" slugs (stripe/shopify/airbnb idempotency) are guesses -
  verify against live catalog; confirm the ambiguous-failure-under-retry
  class/term exists live or is being minted.


### 2026-07-31 - segment-exactly-once-delivery (article + artifact)

**Reviewers:** owner (Akhil) + Claude, twelfth readability round. Segment
Blog (Amir Abu Shareb, 2017; now hosted on Twilio). Source fetched in full -
HIGHLY accurate, every mechanism and number checks (0.6%/4-week, HotelTonight
bus/tunnel, UUIDv4-over-vector-clocks, Kafka-partition-by-messageId, RocksDB-
on-EBS replacing Memcached, LSM/bloom/SSTable/compaction, MultiGet batching,
size-bound deletion via sequence-number index + sub-24h paging, output-topic-
as-source-of-truth with the "aside from Kafka failures" caveat, EBS snapshots,
1.5TB/60B/200B/100x). FIFTH and FINAL member of the ambiguous-failure-under-
retry class (Stripe/Shopify/Airbnb/AWS/Segment) - and the most interesting
placement: the other four resolve ambiguity AT a request/response boundary;
Segment CAN'T (anonymous mobile SDKs) so duplicates flow through and settle
DOWNSTREAM in a ledger. 0.6% = first empirical measure of the class's cost.

**Checklist on arrival:** THREE hits - summary 203 over (1,253, WORST summary
overrun of any article), crux 25 over, cruxSummary 11 words (one UNDER band,
rare direction). Crux problem-first. EIGHTH CLEAN SIM of the twelve, and the
FIRST CLEAN LIVE-TICK sim (auto-advancing clock, most bug-prone type; all
prior clean sims were state-machines/flows). Traced 5 paths headless: tunnel-
no-ledger delivers 8 dups (0.6% baseline), tunnel+ledger discards 8 zero
delivered, load-spike cap=1 ages 7 keys + pages under 24h, crash-after-publish
diverges ledger from output then recover repairs, aged-out resend = duplicate
through the door (honest edge). No logic bug.

**Article findings -> changes**
- Summary COMPRESSED hard (203 over -> in band): dropped the RocksDB-internals
  enumeration and 1.5TB detail from the summary (body carries them).
- BIGGEST P26 GLOSS PASS YET (most jargon-dense article): at-least-once (never
  zero, sometimes more than once), bloom filter (small in-memory structure,
  'definitely not seen'/'possibly seen', common case skips disk), embedded
  (runs inside the worker process not a separate server = the cost win),
  LSM/log-structured-merge-tree (turns writes into fast sequential appends),
  Kafka topic (named durable stream on disk, replayable), UUIDv4 (random ID
  any language can make), EBS snapshots (point-in-time disk copies), TTL/expiry
  timer, vector-clocks/sequence-numbers (more complex ID schemes). Compressed
  the memtable/SSTable/compaction detail to what the 3-query-patterns lesson
  needs.
- ALL SIX tradeoff aphorisms plainened (P25, plainen-all within budget);
  KEPT the genuinely-useful plain definition "'exactly once' is really
  shorthand for at-least-once plus a bounded memory of the seen."
- 3 pattern notes -> plain voice, dropped heaviest-yet registry framing
  ("FIFTH company," "Minted here," "Second article same company"). KEPT the
  five-company SPECTRUM (contract/Stripe -> client-discipline/Shopify ->
  server-interior/Airbnb -> platform-default/AWS -> pure-infrastructure/Segment,
  "one idea seen from five distances") = the payoff of the whole class, plus
  the Centrifuge same-company single-writer tie (owner ruling).

**Artifact findings -> changes**
- NO sim bug. Live-tick logic untouched.
- Toggle visibility: TUNNEL (amber) + LEDGER (green) given permanent-color tog
  borders, neutral off-border lightened (P15). 5 paths re-verified identical.
- Sample page via inline Babel running the real live-tick shipping .jsx.

**Twelve-for-twelve scorecard**
- Em-dash overrun: PRESENT. 12/12.
- Invisible off-state toggles: PRESENT. 12/12.
- Registry jargon in pattern notes: PRESENT (heaviest yet). 12/12.
  -> All three hard defects in every one of TWELVE articles across FOUR
  classes (load-shedding x7, redundancy/observability x2, db-sharding x1,
  idempotency/ambiguous-retry x2). Class-independent house-style/component,
  fully conclusive.
- Over-stuffed summary: PRESENT (worst). 6/12. Taxonomy-first crux: ABSENT. 3/12.

**Sim tally across twelve:** 8 clean, 4 one-bug-each (all numeric sims; 2 broke
central lesson). Every state-machine/flow sim clean, AND now the first live-
tick sim clean too. Headless-trace-gate case (concentrated on numeric sims) is
twelve rounds strong.

**Open items**
- "Also solving this" slugs (aws-idempotent-apis exists; stripe/airbnb
  idempotency slugs are guesses) - verify against live catalog.


### 2026-08-05 - airbnb-orpheus-idempotent-payments (article + artifact)

**Reviewers:** owner (Akhil) + Claude, thirteenth readability round, and the
FIRST round run under P27 from the start. Airbnb Tech Blog (Jon Chew / Ninad
Khisti). Medium blocks direct fetch (as with Netflix) - grounded in mirrors
(Packlink book club, systemdesignblueprint, alvaroduran, mayankraj,
geeksforgeeks). HIGHLY accurate: three-phase Pre-RPC/RPC/Post-RPC, both ground
rules (no network in transactions / no DB in RPC, learned via connection-pool
exhaustion), single enclosing DB transactions per phase, Java lambdas,
retryable/non-retryable classification + double-payment danger of a mislabel,
full client-responsibilities list, row-lock lease, standalone-service
rejected (latency + "inherits the disease"), master-only-reads rationale.
FOURTH member of ambiguous-failure-under-retry class (Stripe=API-contract,
Shopify=volume, AWS=provider, Segment=pipeline, Airbnb=deepest server-INTERIOR
view).

**Checklist on arrival:** one band violation - problem 25 UNDER floor (1,275
vs 1,300), the RARE expansion direction. Fixed by faithfully expanding the
connection-pool-exhaustion origin + the four failure modes (all source-backed),
problem now 1,640. Crux problem-first, cruxSummary 16 words, 6 tradeoffs, stats
present. NINTH CLEAN SIM of the thirteen, SECOND clean live-tick (after
Segment) - replication-queue sim, 5 paths traced correct: OFF+retry=double
(baseline), ON+master+same-key=replay/no-double, ON+replica+FAST-retry=double
(the post's own replica-lag wound, by the user's hand), ON+replica+WAIT=replay
works once caught up (proves WHY master-only), ON+new-key=double (client's half
of the contract). No logic bug.

**Article findings -> changes (PROSE ONLY, per P27)**
- Problem EXPANDED into band (rare direction) from source-faithful material.
- Em-dashes swept (JSON + JSX + page).
- Glossed (P26): SOA/service-oriented architecture (one big app split into many
  small services), distributed transaction, idempotent (repeat = same as once),
  RPC (a call across the network to another service), master/replica (master =
  authoritative copy taking writes; replica = trailing read copy), connection-
  pool exhaustion (why no-network-in-transactions), backoff+jitter (spaced +
  randomized retries vs thundering herd), five-nines (99.999% = all but 1 in
  100k). Summary trimmed after glosses.
- All 6 tradeoff aphorisms plainened (P25) keeping earned summaries.
- 5 pattern notes (MOST of any article) -> plain voice, dropped heavy registry
  framing ("Canonical two-company mint," "Fourth/Third/Second company"). KEPT
  the four-company idempotency lineage, the Skipper two-altitudes atomic-phases
  comparison, and the Pinterest master-only-reads classmate, all written for a
  non-reader.

**Artifact findings -> changes**
- NO sim bug. Live-tick + replication-queue logic UNTOUCHED.
- Toggle visibility: ORPHEUS (accent) + READ SOURCE (amber, the replica-risk
  pivot) given permanent-color tog borders, neutral off-border lightened (P15).
  5 paths re-verified identical after.
- Sample page via inline Babel running the real live-tick shipping .jsx.

**P27 COMPLIANCE (first full round under the rule):**
- Snapshotted all structural fields BEFORE (slug, source, cruxTag,
  relatedArticles, the 5 pattern slugs, stats values), diffed AFTER: ALL SIX
  IDENTICAL, byte-for-byte. Only prose changed. This is the check that would
  have caught the aws/segment slip; now standard every round.
- Pattern notes rewritten by SLUG (mapped by slug, not position) so no slug
  could drift. The 5 frozen slugs: idempotency-keys, retry-with-backoff-and-
  jitter, atomic-phases, retryable-error-classification, master-only-reads.

**Thirteen-for-thirteen scorecard**
- Em-dash overrun: PRESENT. 13/13.
- Invisible off-state toggles: PRESENT. 13/13.
- Registry jargon in pattern notes: PRESENT (5 notes, most of any). 13/13.
  -> All three hard defects in all thirteen articles across FOUR classes.
  Conclusive house-style/component.
- Over-stuffed summary: ABSENT (6/13). Taxonomy-first crux: ABSENT (3/13).

**Sim tally across thirteen:** 9 clean, 4 one-bug-each (all numeric sims; 2
broke central lesson). Every state-machine/flow sim clean; both live-tick sims
(Segment, Airbnb) clean. Headless-trace-gate case 13 rounds strong.

**Open items**
- Medium-sourced: article uses the canonical Medium URL; source grounded via
  mirrors, all claims verified.


### 2026-08-05 - stripe-idempotency (article + artifact)

**Reviewers:** owner (Akhil) + Claude, fourteenth readability round, under P27.
Stripe Engineering (Brandur Leach, 2017) - the ORIGINAL api-contract member of
the ambiguous-failure-under-retry class, the article every other class member
cross-references as the pattern's source. Source fetched in full (Stripe blog
directly fetchable). HIGHLY accurate: three failure modes (first unambiguous),
DNS/CNAME PUT example, RFC 7231 PUT/DELETE idempotency, Idempotency-Key header
on POST, the three failure-case resolutions (process fresh / carry through with
the ACID-rollback caveat / replay cached result), "as few as two computers"
framing, exponential backoff (2^n), jitter, thundering herd, Ruby library ships
it by default. NO headline stat in source -> stats legitimately EMPTY, left
empty (like AWS).

**Checklist on arrival:** TWO band violations, BOTH UNDER (the rare expansion
direction, same as Airbnb last round): problem 102 under (1,198 vs 1,300),
solution 109 under (2,291 vs 2,400). Crux problem-first, cruxSummary 13 words.
updatedAt(2026-06-12) > addedAt - flagged; source re-confirmed current.

**ARTIFACT - THE 4TH NUMERIC-SIM BUG-CLASS FINDING (10th sim, NOT clean).**
Sim is two parts: (1) a scripted 6-scenario walkthrough (3 failure modes x
key/no-key) - authored text + verdicts, all traced CORRECT, safest sim type;
(2) a NUMERIC thundering-herd histogram. The numeric part had a real teaching
weakness (not a crash): with full jitter, ~35 of 36 clients still piled into the
FIRST time-bucket, because attempt-0's wait was rand[0,1)s but buckets are
0.75s wide - so "jitter lets the server absorb the herd" barely showed (peak
only dropped 36->35, both ~7x over capacity=max(3,n/7)=5). CAUGHT by headless
trace - and note the METHOD SAVE: my first trace used GUESSED WINDOW/BUCKET
(32/1) and mis-reported peak=41; re-traced with ACTUAL file constants
(WINDOW=36,BUCKET=0.75) before concluding anything. Owner ruling: retune BOTH
levers. FIX (principled, not eyeballed): BASE=2s interval (was implicit 1s) so
jitter spreads even the first wave; EQUAL JITTER (wait = base/2 + rand*base/2,
the AWS-recommended variant) so waves spread around their center instead of
piling at zero; WINDOW=64 (covers 5 backoff steps); fixed honest CAPACITY=10.
Re-traced final shipping math across 5 seeds: backoff-only peak pinned at 36
(4x over cap, 5 synchronized towers), jitter peak ~19 (=53% of backoff, robust
~0.5 ratio all seeds), first-bucket pileup 35->0, 94% of jitter buckets fit
under capacity. Teaching now lands honestly. Caption updated to match
(equal-jitter wording, honest "mostly stays under" claim).

**Article findings -> changes (PROSE ONLY per P27)**
- Problem EXPANDED into band (102 under -> 1,647): more room for the 3 failure
  modes + why-first-is-safe + ambient-failure-rate framing, all source-faithful.
- Solution EXPANDED into band (109 under -> 2,766): fuller ACID-rollback caveat,
  good-citizen/thundering-herd reasoning, idempotent + RFC-7231 glossed.
- Em-dashes swept (JSON + JSX incl scenario text + page).
- Light P25 plainening on 2 tradeoff tails.
- 2 pattern notes -> plain voice, dropped "canonical form"/"The source of the
  pattern"/"compact statement"; kept the same-key-same-outcome point and the
  Ruby-library-ships-it detail.

**Artifact non-numeric findings**
- Toggle visibility: Pill inactive border #2a2a3a -> #4a4f60, muted text
  lightened (P15). Applies to all pills (scenario tabs, key/jitter toggles).
- Scenario walkthrough logic UNCHANGED (diff = em-dash->hyphen only).
- Sample page via inline Babel running the real component (both sub-widgets).

**P27 COMPLIANCE:** structural snapshot before, diffed after: slug/source/
cruxTag/relatedArticles/2 pattern slugs/stats(empty) ALL IDENTICAL. Prose only.
Pattern notes rewritten by slug.

**FOURTEEN-FOR-FOURTEEN scorecard**
- Em-dash overrun: PRESENT. 14/14.
- Invisible off-state toggles: PRESENT (Pill inactive border). 14/14.
- Registry jargon in pattern notes: PRESENT ("canonical"/"source of pattern").
  14/14. -> all three hard defects in all fourteen across FOUR classes.
- Over-stuffed summary: ABSENT (6/14). Taxonomy-first crux: ABSENT (3/14).
- NEW sub-finding: under-band fields now 3 times (Airbnb problem, Stripe problem
  AND solution) - short-article expansion is a recurring direction for the
  older/shorter foundational posts, not just overrun.

**Sim tally across fourteen:** 9 clean, 5 with an issue - and ALL FIVE are the
numeric sims; the count of clean state-machine/flow/scripted-walkthrough sims is
now unbroken, and both live-tick sims were clean. This 14th is the 5th numeric
sim and the 5th to need a fix. The headless-trace gate, concentrated on numeric
sims specifically, is now as strong a recommendation as the dataset can make:
EVERY numeric sim has needed correction; NO non-numeric sim has.

**Open items**
- Stripe relatedArticles includes uber-intelligent-load-management (a load-mgmt
  article, related but a different crux class); the 4 true class-mates render in
  "Also solving this". Left relatedArticles untouched (structural, frozen).


### 2026-08-05 - shopify-resilient-payments (article + artifact)

**Reviewers:** owner (Akhil) + Claude, fifteenth readability round, under P27+P28.
Shopify Engineering (Bart de Water, 2022), source fetched in full, HIGHLY
accurate (60s Ruby/Net::HTTP defaults, Go/Node no-default-timeout, MAX_
EXECUTION_TIME/pt-kill, 1s/5s starting point, Semian across Net::HTTP/MySQL/
Redis/gRPC, country-code Semian granularity, Little's Law/capacity=throughput
*latency/500rps, 70-80% knee, ULID-vs-UUIDv4 + 50% INSERT win, Mismatch
CaptureStatusAnomaly, four golden signals + both payments refinements,
correlation_id, scriptable load balancer + benchmark gateway, spy/IMOC/SRM/
Service Disruption, Dutch saying). FIFTH and FINAL client-side member of the
ambiguous-failure-under-retry class = the VOLUME-VIEW / operations-onboarding
face (Stripe=contract, AWS=provider, Airbnb=interior, Segment=pipeline,
Shopify=volume-ops). Structurally the odd one: not one system but ten chained
practices, so it legitimately carries THREE patterns (idempotency-keys,
circuit-breaker, fault-isolation).

**Checklist on arrival - THE HEAVIEST PROSE WORKLOAD OF ANY ROUND:**
- solution 2,404 OVER (6,904 vs 4,500 ceiling) = BY FAR the biggest overrun of
  any article. Compressed to 4,495 KEEPING ALL TEN MECHANISMS (owner ruling:
  compress don't cut) - tightened each practice to its load-bearing core.
- crux 42 UNDER (358 vs 400) = expanded modestly to 789.
- 25 SENTENCES OVER 40 WORDS (P28) = the most of any round, incl a 67w and
  several 60w+. All split; longest now 40w.
- 41 em-dashes swept.
- Crux problem-first, cruxSummary 16w, stats = the one real 50%-INSERT figure.

**TENTH CLEAN SIM of the fifteen, THIRD clean live-tick (after Segment,
Airbnb) - and the MOST SOPHISTICATED SIM IN THE SET:** a discrete-event
queueing simulation - log-normal service times (Box-Muller), 12-worker pool,
arrival rate driving saturation, a circuit-breaker state machine, a throttle
waiting-room. Traced all 4 scenarios x each defense headless: slowdown default-
60s explodes queue to 280/204 abandon; +breaker drops queue to 0, 204 fastfail
(fail-fast instead of wait); outage+breaker = queue 0, circuit open; flash 3x =
queue 1,198/682 abandon, +throttle holds admitted queue at 4 while 2,569 wait
in the room. EVERY defense bounds exactly the failure it claims, incl the
honest "timeout alone doesn't fix a persistent slowdown, you need the breaker"
chain. No logic bug.

**Article findings -> changes (PROSE ONLY per P27)**
- Solution compressed 2,404 into band, all ten mechanisms kept.
- Crux expanded; summary + problem rewritten with every long sentence split.
- All 25 P28-over-40w sentences split (longest 67->40).
- 41 em-dashes swept (JSON + JSX + page + labels).
- P26 light (source is itself a plainly-written onboarding doc): b-tree kept
  with its "databases index on" gloss; ULID/golden-signals/correlation-id/
  Little's-Law all already glossed in-line.
- Tradeoff aphorisms already concrete; light P25 touch only.

**FIRST ARTICLE TO ESCAPE A HARD DEFECT: pattern notes were ALREADY plain
voice** - no registry framing to strip (only em-dashes swept). So registry-
jargon-in-notes drops to 14/15, the first miss in the 15-round streak.

**Artifact non-numeric findings**
- Toggle visibility: three defense toggles given permanent signal-color tog
  borders (TIMEOUTS blue / CIRCUIT BREAKER amber / CHECKOUT THROTTLE green),
  neutral off-border lightened (P15). Sim logic UNCHANGED, re-verified.
- Sample page via inline Babel running the real discrete-event .jsx.

**P27 COMPLIANCE:** structural snapshot before, diffed after = slug/source/
cruxTag/relatedArticles/3 pattern slugs/stats value ALL IDENTICAL. Prose only.

**FIFTEEN-FOR-FIFTEEN (two of three) scorecard**
- Em-dash overrun: PRESENT. 15/15.
- Invisible off-state toggles: PRESENT. 15/15.
- Registry jargon in pattern notes: ABSENT this round. Now 14/15 - the streak
  breaks. (Still overwhelmingly systemic; this article's notes happened to
  ship clean.)
- Over-stuffed summary: ABSENT (6/15). Over-stuffed SOLUTION: first extreme
  case (2,404 over) - a new sub-note that the longest, most-mechanism articles
  overrun the SOLUTION band, distinct from the summary-overrun tendency.
  Taxonomy-first crux: ABSENT (3/15).

**Sim tally across fifteen:** 10 clean, 5 with an issue - all five still the
NUMERIC sims; every state-machine/flow/scripted-walkthrough clean, all three
live-tick sims (Segment/Airbnb/Shopify) clean. The ambiguous-failure-under-
retry class is now COMPLETE (all five members reviewed). Headless-trace gate on
numeric sims = 15 rounds strong.

**Open items**
- The ambiguous-failure-under-retry class is fully reviewed (5/5). No class-mate
  "Also solving this" gaps remain for this class.


### 2026-08-06 - meta-foqs-priority-queue (article + artifact)

**Reviewers:** owner (Akhil) + Claude, sixteenth readability round, under
P27+P28. Meta Engineering (Nanavati & Joshi, 2021), source fetched in full
(engineering.fb.com directly fetchable), HIGHLY accurate: item fields
(namespace/topic/32-bit priority lower-is-higher/10Kb payload/deliver_after/
lease/TTL/shard-ID+64-bit-PK), buffered enqueue with promises, circuit breaker
cited by name, enqueue forwarding, dequeue reduce + per-shard in-memory
priority indexes + Prefetch Buffer + k-way merge + delivered-status write,
demand-proportional replenishment, leases with at-least-once/at-most-once,
ack-deletes/nack-updates-deliver_after with backoff+metadata, pull-vs-push
workload census (ms-to-days, 10-to-10M/min, priorities, region affinity),
~1 trillion/day, hundreds-of-billions backlog, checkpointing with exact
history-list mechanism + WHERE clause, disaster readiness (2 regions async +
synchronous binlog to another building, few-ms read-only, global rate limits),
Looking Ahead frontier. No fabrication. FIRST article in the buffer-degrades-
under-backlog class reviewed in this readability series (not an ambiguous-
failure article). Elegant crux: a shock absorber whose own substrate (MySQL's
history list) degrades under exactly the condition it exists to absorb.

**Checklist on arrival:**
- summary 25 OVER (1,075 vs 1,050) -> compressed to 1,014.
- crux/problem/solution in band.
- 41 em-dashes in prose + 1 in a stats LABEL (label is prose, swept; VALUE
  frozen) -> all swept to spaced hyphens.
- 21 SENTENCES OVER 40 WORDS (P28), incl a 90-WORD sentence in the solution
  (the dequeue-reduce) and a 70w in the summary -> all split, longest now 39w.
- crux problem-first, cruxSummary 14w, 6 tradeoffs, 3 patterns, 3 stats
  (~1-trillion + hundreds-of-billions are real headline figures - good).
- Registry jargon in 2 notes ("Second company" x2, "the pattern as a
  product") -> de-registered to plain voice.

**ELEVENTH CLEAN SIM of the sixteen - AND THE FIRST CLEAN *NUMERIC* SIM.**
Live-tick numeric sim (the highest-risk type). Core: scan latency
lat = checkpoint ? 6 : min(320, 6 + backlog*0.55); drain
cap = outage ? 0 : DRAIN*DT*min(1, 40/max(40,lat)); priority drains
lowest-number-first; leases redeliver (AL1) or lose (AM1). Traced every
scenario headless with REAL constants: healthy stays 0/6ms; outage+checkpoint
backlog grows to 796 at flat 6ms; outage+no-checkpoint climbs to 320ms;
crash-AL1 redelivers 1/loses 0; crash-AM1 loses 1/redelivers 0. Verified the
degradation SPIRAL sustains (backlog built -> lat 320 -> drain collapses to
7.5/s -> grows forever) AND the FIX recovers (checkpoint ON -> lat snaps to
6ms -> drain back to 60/s -> backlog drains 922->525 over 18s). No logic bug.
One honest nuance confirmed by trace: from a COLD start, toggling checkpoint
OFF alone can't trigger the spiral because drain(60) > enqueue(40) keeps the
backlog empty - but that is correct physics (an under-loaded queue doesn't
degrade) and the intended path is exactly what the teaser says: kill the
consumers first to build the backlog, then the crux verdict (!checkpoint &&
lat>40) is reachable. METHOD NOTE: traced against the actual file constants,
not memory - my first read suspected the crux was unreachable, the full trace
showed it reachable through the intended flow. SIGNIFICANCE: across sixteen
articles, every prior sim that needed a fix was numeric; this is the FIRST
numeric sim to need none - the numeric-sims-are-where-bugs-live pattern now has
its first clean counterexample, but the tally still says every non-numeric sim
was clean too.

**Article changes (PROSE ONLY per P27)**
- summary compressed into band + 70w/55w sentences split.
- crux 63w sentence split (problem-first order kept).
- problem + solution rewritten with all long sentences split (incl the 90w),
  em-dashes gone, every mechanism kept.
- 6 tradeoffs: em-dashes swept, 52/49/45/43w sentences split, light P25.
- 3 pattern notes -> plain voice, dropped "Second company"/"the pattern as a
  product"; KEPT Discord (guaranteed-delivery) + Shopify (circuit-breaker)
  cross-references written for a non-reader.
- Stats: 3 kept, values FROZEN, one label's em-dash swept.

**Artifact non-numeric findings**
- Toggle visibility: four pivotal toggles given permanent signal-color tog
  borders (OUTAGE red / SHARD-SLOW amber / CHECKPOINTING accent-blue /
  SEMANTICS green), momentary buttons (crash, drain) use lightened btn border
  (P15). Added a subtitle to the SEMANTICS toggle (P23). Sim logic re-verified
  byte-identical.
- Sample page via inline Babel running the real live-tick .jsx.

**P27 COMPLIANCE:** structural snapshot before, diffed after = slug/source/
cruxTag/relatedArticles/3 pattern slugs/3 stats values ALL IDENTICAL. Prose
only.

**SIXTEEN-FOR-SIXTEEN scorecard**
- Em-dash overrun: PRESENT (41+1). 16/16.
- Invisible off-state toggles: PRESENT. 16/16.
- Registry jargon in pattern notes: PRESENT ("Second company" x2). Back to
  15/16 (Shopify was the lone escape at r15).
- Over-stuffed summary: PRESENT (light, 25 over). 7/16.
- Taxonomy-first crux: ABSENT. 3/16.

**Sim tally across sixteen:** 11 clean, 5 with an issue - all five still the
NUMERIC sims from earlier rounds; this sixteenth is a numeric live-tick that
came through CLEAN, the first numeric sim to do so. Every state-machine/flow/
scripted-walkthrough clean; all four live-tick sims (Segment/Airbnb/Shopify/
Meta) clean.

**Open items**
- relatedArticles point to queue/buffering siblings (Discord/Slack/Segment/
  Uber/DoorDash) across more than one crux class; rendered under a neutral
  "Related queue and buffering work" heading rather than a single-class "Also
  solving this", since they aren't all buffer-degrades members. relatedArticles
  left untouched (structural, frozen).


### 2026-08-06 - meta-foqs-priority-queue FOLLOW-UP (owner review of the 16th round)

Owner ran the revised article + artifact and flagged a REAL ARTIFACT BUG plus
a batch of gloss/clarity requests.

**ARTIFACT BUG (owner: "Crash a consumer mid-lease - nothing happens when I
click"):** the crash button pushed a lease that only resolved 2.5s later, with
no immediate feedback, so the click looked dead - and in the healthy state the
single redelivered item vanished instantly. Root cause was VISIBILITY + TIMING,
not sim logic (traced: the lease/redeliver math was correct). FIX (all display-
layer, sim math untouched): (1) crashConsumer now calls force() so the click
re-renders instantly; (2) a new verdict branch fires the moment a lease is
in-flight ("LEASE RUNNING - THE CLOCK DECIDES") before it expires, so the click
has an immediate visible effect; (3) the redundant REDELIVERED metric tile
became a LEASES RUNNING tile that lights accent-blue with the live count the
instant you click, redelivered shown beneath; (4) lease shortened 2.5s->2s for
quicker resolution; (5) button subtitle glosses "mid-lease" ("a consumer took
an item but died before confirming it - watch its lease count down, then
resolve"). Re-traced both modes headless: click shows leases=1 immediately,
resolves to redelivered=1 (AL1) or lost=1 (AM1) at t+2. Confirmed core sim
unchanged (healthy 0/6ms, outage+cp 796/6ms, outage-cp 320ms).

**GLOSSES ADDED (owner couldn't define the terms):**
- "checkpoint" - now glossed at first mention in summary ("keep each scan from
  re-reading old history") AND fully in solution ("A checkpoint is a saved
  marker of the last timestamp already processed").
- "short delivery lease" - glossed in summary ("a countdown a consumer must
  confirm within") and solution ("handed out on a lease, which is just a
  countdown").
- "crash a consumer mid-lease" / "checkpointing's effect on speed" - both
  rewritten plainly in the artifact teaser + crash-button subtitle.
- "binlog" glossed ("MySQL's change log") in solution.

**LANGUAGE SIMPLIFIED (owner flagged as dense/unclear, PROSE ONLY):**
crux "substrate degrades under exactly that condition" -> "the very thing FOQS
is built on gets slower under exactly the condition it exists to handle"; the
priority-promise sentence restructured into short sentences; solution's
topics/namespaces/tier, buffered-worker, delivered-rows, the whole lease +
ack/nack passage, pull-vs-push, and checkpointing all rewritten in plain
language; problem's "items scattered across shards" clarified; tradeoffs' pull
"simple in the middle" line, the lease "loss-prevention working" line, and the
MySQL "storage-engine fit" line all plainened.

**Band discipline:** the glosses run longer than what they replaced, so the
solution pushed ~500 over and needed compression back to 4,495 keeping every
gloss and mechanism (built the final string from scratch, standard band-save
discipline - save only when all bands pass atomically). Summary landed at 1,044
(glosses added, trimmed back into band). Longest sentence 40w, 0 em-dashes
(including one caught in the nested artifact.teaser field, a new last-place
hideout beyond stats labels/cruxSummary).

**P27:** structural diff ALL IDENTICAL again - prose + artifact display only,
no structural field touched. Sim logic byte-identical. Delivered 4 files.


### 2026-08-06 - doordash-rabbitmq-kafka (article + artifact)

**Reviewers:** owner (Akhil) + Claude, seventeenth readability round, under
P27+P28. DoorDash Engineering (Khalilnaji & Kachhara, Sep 2020, "Eliminating
Task Processing Outages by Replacing RabbitMQ with Apache Kafka Without
Downtime"), ORIGINAL source fetched in full from careersatdoordash.com, HIGHLY
accurate: 900+ tasks, four availability sub-issues (countdown/ETA broker load,
Flow-Control degradation resolvable only by bounce, harakiri connection churn
feeding the broker, never-root-caused stuck consumers), vertical ceiling +
HA-mode tradeoff (reduced throughput, 20+min stuck failovers, lost messages),
full five-option decision table with each pro/con, three onboarding principles
+ race-car-fuel-pump line, MVP (FQN + pickled args, @task wrapper w/ feature
flags, compatible-parameter whitelist), 2 weeks to prod + 80% in a week,
double-capacity dual-publishing + dedicated Kubernetes cluster, rank-features-
by-task-count triage, head-of-line blocking + bounded-local-queue fix
(one consumer process feeding a threshold-bounded queue read by multiple
executor processes), deploy-triggered rebalance stalls + incremental
cooperative rebalancing, 80/20 conclusion. No fabrication. FIFTH member of the
buffer-degrades-under-backlog class (with FOQS/Uber/Segment/Slack), and its
rawest case: the buffer itself was the outage.

**Checklist on arrival - HEAVIEST since Shopify:**
- summary 499 OVER (1,549 vs 1,050), incl a 92-WORD sentence -> compressed to
  1,046, all long sentences split (longest now 35w).
- crux 441 OVER (1,541 vs 1,100), incl a 73w sentence AND a taxonomy-first
  opener ("Fifth company in the class, and its purest cascade") -> compressed to
  1,100, REORDERED problem-first (drops the class bookkeeping), sibling
  comparison moved to the END in plain voice, longest now 36w.
- problem/solution in band.
- 45 em-dashes in prose + 2 in stats LABELS + 2 in the artifact TEASER -> all
  swept.
- 15 SENTENCES OVER 40w (P28) incl a 93-WORD solution sentence (the options
  table) -> all split, longest now 39w. The 93w options list was semicolon-
  chained; broke into a lead sentence + short per-option sentences.
- registry jargon in BOTH notes ("Minted from...", "Fifth consecutive
  migration carrying the pattern") -> de-registered to plain voice, KEPT the
  Uber Selective-Acknowledgment cross-reference written for a non-reader.

**TWELFTH CLEAN SIM of the seventeen - AND THE SECOND CLEAN NUMERIC LIVE-TICK IN
A ROW (after FOQS).** Live-tick numeric with MODE PHASES (0 RabbitMQ / 1 +HA /
2 Kafka) and toggles (peak, countdowns, hol, nbWorker). Traced every scenario
headless w/ REAL constants: RMQ+peak fires the full cascade (Flow Control ->
latency climbs to 60 -> crosses harakiri threshold >25 -> churn jumps to 80 ->
feeds back into inflow via churn*0.5 -> backlog past 700 -> outage); bounce
halves backlog + clears outage but re-climbs at peak ("bounce and pray");
HA+peak brings outage SOONER (cap 70 not 100); Kafka+peak drains flat (cap 200
vs inflow 130); HOL blocking dams a partition (partDelay climbs to 60);
nbWorker caps it at 5 (one executor stalls, partition flows); deploy rebalance
pauses consumption. Verified no stuck states (escape-to-Kafka clears the
latched outage + drains), no NaN, churn feedback bounded at 80. No logic bug.
SIGNIFICANCE: two numeric live-ticks in a row now clean (FOQS, DoorDash);
the numeric-sims-are-where-bugs-live rule still holds for the 5 earlier ones but
its two most recent tests both passed.

**Artifact non-numeric findings**
- Toggle visibility: four pivotal toggles given permanent signal-color tog
  borders (PEAK BURST amber / COUNTDOWN TASKS amber / SLOW MESSAGE amber /
  NON-BLOCKING WORKER green), neutral off-border lightened #2a2a3a->#4a4f60
  (mode + momentary buttons) (P15). Replaced a user-facing kill->churn->load
  ARROW chain in the provenance block with plain words (kept the link-arrow
  "->", a UI convention like the down/up-right arrows). Sim logic re-verified
  byte-identical.
- Sample page via inline Babel running the real mode-phase .jsx.

**P27 COMPLIANCE:** structural snapshot before, diffed after = slug/source/
cruxTag/relatedArticles/2 pattern slugs/3 stats values ALL IDENTICAL. Prose +
artifact display only.

**SEVENTEEN-FOR-SEVENTEEN scorecard**
- Em-dash overrun: PRESENT (45+). 17/17.
- Invisible off-state toggles: PRESENT. 17/17.
- Registry jargon in pattern notes: PRESENT ("Minted", "Fifth consecutive").
  16/17 (Shopify r15 the lone escape).
- Taxonomy-first crux: PRESENT and the most blatant yet ("Fifth company in the
  class" as the literal opening words). 4/17.
- Over-stuffed summary: PRESENT (499 over). 8/17.
- Over-stuffed CRUX: first time a crux was the WORSE overrun of the two head
  fields (441 over) - a new sub-note: narrative-heavy class-member articles can
  overrun the CRUX as badly as the summary, especially when they open with
  class bookkeeping instead of the problem.

**Sim tally across seventeen:** 12 clean, 5 with an issue - all five still the
earlier NUMERIC sims; the two most recent numeric live-ticks (FOQS, DoorDash)
both clean; all five live-tick sims (Segment/Airbnb/Shopify/Meta/DoorDash)
clean.

**Open items**
- buffer-degrades-under-backlog class now has 5 reviewed members here
  (DoorDash/FOQS/Uber/Segment/Slack via relatedArticles) - the "Also solving
  this" cross-refs all resolve within the class, unlike FOQS's broader queue
  grouping. relatedArticles left frozen.


### 2026-08-06 - doordash-rabbitmq-kafka FOLLOW-UP (owner review of the 17th round)

Owner ran the revised article + artifact and flagged an ARTIFACT TIMING problem
plus a large batch of gloss/simplify requests and several judgment calls
(remove-this-line / name-the-thing / does-"physics"-mean-limitations).

**ARTIFACT TIMING (owner: after clicking BOUNCE/PEAK the verdict raced through
"900 tasks" -> "queue pushed back" -> "orders halted" too fast to read):**
sim tick slowed 650ms -> 1100ms so each verdict state holds long enough to
read. Per-tick math UNCHANGED, so every scenario still reaches the same
outcome, just at a readable pace (re-traced byte-identical). BOUNCE button got
a subtitle ("restart RabbitMQ to clear the jam - it comes back, then jams again
at peak"). This is the 3rd artifact where the fix was pacing/visibility, not
sim logic (Shopify slow-down, FOQS crash-button, now DoorDash tick) - a
standing sub-finding: live-tick sims that are numerically correct still fail on
READABILITY OF PACE, and the fix is always a display/tick change, never the
math.

**GLOSSES ADDED (owner couldn't define the terms) - in BOTH the JSON prose AND
the artifact:**
- "harakiri" -> "a setting that kills any worker running too long" (summary,
  crux, and the artifact's first user-facing mention + THE PROBLEM context
  line).
- "HA mode" -> "high-availability mode - a synced backup that takes over if the
  primary dies" (summary, crux, artifact HA verdict).
- "broker" -> "the server that holds the queue" (artifact intro).
- "pickled arguments" -> "its arguments (serialized with Python's pickle)"
  (solution).

**SIMPLIFICATIONS + JUDGMENT CALLS (all PROSE ONLY, P27 respected):**
- Named the upstream layer the owner asked about: the crux now says Flow
  Control's throttling is felt by "those publishers - the app servers
  submitting tasks", and the buffer "pushed its trouble onto the app servers
  least able to make sense of it" (was "the layer least able to read it").
- "own physics" / "new physics" -> "new problems" / "its own new problems"
  everywhere (summary, crux, tradeoff 5, teaser, artifact verdicts). Owner
  asked directly "do you mean own limitations?" - yes; plainened.
- "the options table" (assumes the reader saw the original article's table) ->
  "DoorDash weighed five options honestly" / "Weighing the five options"
  (solution + tradeoff 3), so it stands alone.
- CUT the race-car/fuel-pump analogy (owner: adds no value).
- CUT "That is the class thesis as mechanism" (abstract, P25).
- Unpacked the head-of-line fetcher sentence into plain steps ("one process
  pulls messages into a small local queue... several other processes take work
  off it and run it").
- "incumbent's problems" -> "fixing the old broker"; "never-root-caused stuck
  consumers" -> "the stuck consumers they never fully explained".
- Pattern note 1 opener "The fifth migration in a row to carry this pattern"
  (registry bookkeeping a cold reader can't parse) -> a plain statement of what
  the pattern IS ("Roll a big migration out gradually behind a switch").
- Teaser's confusing partition line rewritten plainly.

**BAND DISCIPLINE (recurring lesson, sharper this round):** the plain-language
glosses run LONGER than the compact jargon they replace, so summary and crux
each blew far over band and needed many compression passes. In that churn, my
named-publishers crux briefly got REVERTED (a trim reloaded a pre-edit copy);
the final consistency check caught it via a boolean "app servers named" probe
and I re-applied it. LESSON REINFORCED: when glosses push a field well over
band, BUILD THE FINAL STRING ONCE and verify standalone before moving on -
iterative trimming risks silently reloading the pre-edit file (the same
band-save gotcha, now seen to also lose a GOOD edit, not just fail to save).
Final: summary 1,033, crux 1,100, problem 2,384, solution 3,251, all OK, 0
em-dashes, longest 36w, cruxSummary 12w.

**P27:** structural diff ALL IDENTICAL again - prose + artifact display only.
Sim logic byte-identical (only tick interval + label/verdict text changed).
Delivered 4 files.

## P30 - Enumerations become bulleted lists
When prose enumerates a stated count of items - phrasings like "the requirements come down to three", "three properties make X work", "Architecture one / Architecture two" - render the items as a markdown bulleted list ("- " on its own line), not as a run-on sentence. The reading shell turns a block whose every line starts with "- " into a <ul>. One bullet per item; each item still obeys P28 per sentence. Applies to problem and solution prose. Keep the lead-in sentence ("So the requirements come down to three:") as its own line above the list.


### 2026-08-11 - gitlab-database-decomposition (readability review, then PRODUCE)

Class `single-cluster-scaling-ceiling` (GitLab's CI/Main functional decomposition).
Source: Dylan Griffith, GitLab blog "Decomposing the GitLab backend database"
parts 1 + 2 (both fetched in full). Reviewed cold, verdict SHIP WITH FIXES, then
produced the fixes on owner instruction.

**Source grounding - FULLY CLEAN, zero fabrication.** Verified every number,
mechanism, and quote against parts 1+2: 96-vCPU ceiling + all-writes-to-one-primary;
the write-analysis table (CI 48.98% writes / 35.69% size, Merge Requests 20.40%
writes, webhook logs 22.39% size / 0% reads, Rest 27.80% writes); only three
unprefixed CI tables; the RuboCop-inspired ratchet (cross-join + cross-transaction
analyzers, 1-in-10,000 Prometheus sampling, the ActiveRecord::Base RuboCop rule,
allowlist + fail-on-new); loose foreign keys (on-delete triggers -> queue -> Sidekiq,
callbacks rejected as skippable, the big-cascade dividend); mirroring needed in
exactly two tables + Redis-cursor consistency checking; seven phases + 193 issues;
the zero-downtime plan designed-then-declined on three grounds; the two-hour
CDN-blocked window + three-step rollback; seven rehearsals; 93 minutes; results
(9.2/12.5 TiB freeable of 22TiB, vacuum 80-100%->~15%, >=5x Sidekiq). The three
quoted phrases are faithful. Live behindscale page is script-rendered (won't fetch);
JSON treated as source of truth (updatedAt null, no drift).

**Bands.** summary 1,655 OVER by 605 (over-stuffed lede - carried every mechanism
and number); crux 1,352 OVER by 252 (taxonomy-first). problem/solution/cruxSummary
in band on arrival. Both head fields rewritten into band, each BUILT AS ONE COMPLETE
STRING and validated together before a single write (band-save discipline):
summary -> 1,045, crux -> 1,076. Compression came from moving the mechanism dump out
of the summary (it belongs in solution) and de-taxonomizing the crux, not from
cutting content.

**Taxonomy-first crux.** Opened "Same class as GitHub, Airbnb, and Slack - and with
GitHub, the library's first same-market rivals inside one class ... the same answer
species", plus "the class's purest statement" and "Two distinguishing marks complete
the manifestation." Reordered problem-first (write-path ceiling leads), moved the
GitHub/Airbnb/Slack siblings to the last two sentences in plain voice, and deleted the
registry terms (answer species / manifestation / same-market-rivals-inside-one-class).

**Registry jargon in ALL THREE pattern notes, plus an internal flag left in reader
text (a new variant).** All three opened with authoring machinery ("Minted...", "the
pattern's second face", "Fourth consecutive datastore migration carrying the pattern",
"this instance contributes its sharpest move"). The violation-ratchet note also
carried a reader-facing "CATEGORY-STRAIN FLAG: ... filed under consistency ... pending
owner ruling" - catalog machinery that must never ship on a pattern page. All three
rewritten in plain article voice; the flag text removed and raised to the owner as a
catalog decision (below). New sub-finding: pattern notes can smuggle not just registry
vocabulary (P19) but an entire internal TODO/flag into reader text - grep notes for
"FLAG", "pending", "owner ruling", "category" as well.

**Em-dash overrun.** 73 total: 45 in JSON (incl 2 stats labels + 1 artifact teaser)
+ 28 in JSX verdict/label strings. All swept to spaced hyphens (P12). Plus 9 en-dashes
(80-100%, 1-6, 1-7 ranges) -> hyphens. Arrows (->) and middots kept in the artifact as
UI convention; prose "1->2 migration" rewritten to "one-to-two" (words in prose,
arrows only in the dark surface).

**P28 long-sentence load - heavy (21 sentences over 40w).** summary 3 (incl an 82w),
crux 2, problem 3 (incl 55w), solution 7 (incl 65w + 67w), tradeoffs 3, notes 3. All
split; longest prose sentence now 39w. TOOLING NOTE worth carrying: a naive
`[.!?]\s+` splitter does NOT break at a sentence-final `works.'` (period inside a
closing quote) and merges the next sentence, reporting a false 41w; a fixed-width
lookbehind `(?<=[.!?])['"\u2019\u201d]?\s+` fixes it. Two enumerations with stated
counts (the "three stated grounds"; the analyzer list) were broken into short
sentences (P28/P30).

**Glosses added (P26).** LSN -> "its write position in Postgres's log"; dead tuples ->
"obsolete row versions Postgres must clean up". Both were used cold in a deep-Postgres
article; a staff engineer off Postgres would not have them. Patroni/PGBouncer were
already glossed on arrival.

**Tradeoffs.** Registry phrase in [0] ("The class's purest lesson lives in that
asymmetry") -> "The asymmetry is the whole lesson"; aphorisms plainened per P25 ([4]
"the phase label WAS the deadline" -> a plain because-clause; [5] "instead of
worshipping zero" -> "rather than treating zero downtime as the goal by default").
Em-dashes swept; [2] (59w) and [4] (57w) split.

**Stats labels (values FROZEN).** stat[0] and stat[2] labels carried em-dashes, and
stat[2] an en-dash in "80-100%" - all swept. Values (~49% / 93 min / ~15%) untouched.

**SIM - CLEAN, no logic fix. First scripted-walkthrough-plus-counter of the review
series, and it held the numeric-sims-are-where-bugs-live rule.** Type: scripted state
machine (monolith -> prep -> phases -> cutover -> results) with one numeric element, a
`violations` counter. Traced the REAL reducer headless (not eyeballed): arithmetic
correct (net -35/fix without the ratchet, 193->158->123->88->53->18->0 in 6; -65 with
it, 193->128->63->0 in 3); the ratchet lesson fires (a new cross-join adds 12 before
the ratchet, 0 after = blocked); every stage gate holds; the full happy path reaches
results; newjoin-spam is bounded (peak 253, grinds to 0). Meters agree with verdicts
(P17): PRIMARY 96/96 red -> "2 hosts" green; VACUUM 80-100% red -> ~15% green;
VIOLATIONS count + lock. No logic bug, no stuck state. The one numeric part is a
trivial integer counter, not a continuous model - consistent with every prior
state-machine/scripted sim being clean. Minor teaching note (NOT fixed): a reader can
fix-to-zero and proceed without ever arming the ratchet; the verdict text prompts the
newjoin button, so it is acceptable.

**Artifact non-logic fixes.** (1) P15: neutral off-state button border #2a2a3a ->
#4a4f60 (in the `btn` helper only; the 6 remaining #2a2a3a are page-chrome borders,
not controls). (2) P15/P23: the pivotal "SOMEONE MERGES A NEW CROSS-JOIN" trouble
control - it never toggles on and its role is not self-evident - given a permanent red
signal border plus a faint red fill when active. Both are style-only; the reducer is
proven byte-identical (only two code COMMENTS had em-dashes swept). Em-dash/en-dash
sweep applied across verdict + label strings; arrows kept.

**P27 - structural diff ALL IDENTICAL.** Snapshotted before and confirmed byte-identical
after: slug / source / cruxTag / 3 pattern slugs / relatedArticles(5) / 3 stats values
/ tags / title / url / artifact.path / stats placements. Prose + artifact-display only.

**Preview.** `behindscale-gitlab-database-decomposition-revision.html` built in the
site reading-shell CSS with the ACTUAL shipping .jsx mounted via Babel + React 18 CDN
(import stripped, export -> function, createRoot mount) so the artifact in the preview
cannot diverge from ship; the embedded script esbuild-compiles clean.

**Deliverables:** revised .json, fixed .jsx, preview .html, this entry. NO svg - pure
readability round; a figure is a separate step after owner text approval. My read:
this article probably does not need one - it is a linear timeline the artifact already
walks stage by stage, with no single magnitude or structure a still frame would add
that the sim does not already show live. Will make the case explicitly at approval.

**OWNER FLAG (catalog decision, NOT changed):** violation-ratchet is a process pattern
enforced by CI rather than a runtime systems pattern, currently filed under category
"consistency"; its own note flagged the strain. Whether to recategorize it (or add a
"transition-guard / process" category) is the owner's call. The flag text was removed
from the reader-facing note regardless.

**Review-series scorecard (this round):** em-dash overrun PRESENT (73); faint off-state
toggle border PRESENT (#2a2a3a); registry jargon in pattern notes PRESENT (all 3), plus
the new "internal category-flag left in a note" variant; taxonomy-first crux PRESENT;
over-stuffed summary PRESENT (605 over). The three hard systemic defects all fired
again - the upstream-fix case (generator prompt + shared toggle component + pattern-note
generation) is unchanged.

---

## Review 1 - ROUND 2 follow-up: plain-language pass (2026-08-11)

Owner reviewed the round-1 output and asked for one thing throughout: **simpler
language, with the jargon explained in everyday words.** Specific asks - introduce
Patroni and PGBouncer properly at the start; gloss namespace / top-level namespace /
tenancy boundaries, 96 vCPU, RuboCop rules, ActiveRecord::Base, ActiveRecord callbacks,
Sidekiq worker, LSN, vacuum saturation, and the seven phases; drop the literary
phrasing ("brute honesty", "decanted", "asynchronous convergence", "hit the
application's history", "fixed an old wound", "hold the line with a ratchet"); remove
"in the post's words"; and stop leaning on the coined word "ratchet". This is a prose
+ artifact-string round only; no logic, no structure, no figure.

**Gloss decisions (term -> plain rendering).** Patroni -> "manages a pool of read-only
copies (replicas)"; PGBouncer -> "lets a huge number of app servers share a small, safe
number of database connections"; both now introduced and explained in the FIRST
paragraph of the problem. Top-level namespace / tenancy boundaries -> "spread the data
across servers by customer account" + "the app was never built to keep each account's
data cleanly separate"; namespace named once, in parentheses, where the phrase is
unavoidable. 96 vCPU -> "96 CPU cores, already close to the largest a single machine can
be". RuboCop -> "a checker for Ruby code". ActiveRecord::Base -> "Rails' generic
default" (the class name dropped entirely). ActiveRecord callbacks -> "Rails' own delete
code" (named only to contrast with triggers). Sidekiq worker -> "a background job" (name
dropped in teaching prose; kept in the provenance footer). LSN -> "note how far the main
database had gotten" (acronym removed). Vacuum saturation -> "Postgres's background
cleanup of dead rows, which had been running flat out at 80-100%". The seven phases ->
characterised, not listed: "stood up the second database's machines and split first the
reads, then the write paths, all still landing on the original server, so each step was
easy to undo", leaving the final phase as a one-host change. "In the post's words"
removed; the one remaining source attribution ("As the post says,") precedes the single
verbatim quote and is a normal citation, not a flourish.

**"Ratchet" minimised per owner.** The word is gone from the summary, crux, teaser,
artifact subtitle, and both artifact context blocks, replaced everywhere by the plain
mechanism: "a gate that blocks any new cross-database query, so the count can only go
down". It survives in exactly one place - the `violation-ratchet` pattern note - where
it names the pattern the reader clicked; there it is stated last and immediately glossed
("that one-way behaviour is what GitLab named a ratchet"). Both flagged pattern notes
(loose-foreign-keys, violation-ratchet) were rewritten from scratch in plain steps.

**Band tension, and how it resolved.** Plain language plus inline glosses runs LONGER,
and solution was already near its ceiling. First plain+glossed draft measured 4912
(412 over 4500). Resolved by tightening prose, not by dropping glosses or mechanisms:
folded the four detection checks from two sentences into one, cut filler ("actually",
"simply", "turned out to be"), and dropped jargon outright where a plain phrase was
shorter than a gloss (ActiveRecord::Base, Sidekiq, LSN all removed rather than
explained). Final bands: summary 1040, crux 1095, problem 2289 (glosses live here,
where the headroom is), solution 4470. Longest sentence 38 words. Em-dash / en-dash 0
across JSON and JSX. cruxSummary unchanged.

**Artifact display strings (10 + 1 patches, each matched exactly once).** Subtitle;
CONTEXT "THE PROBLEM" (vacuum saturation glossed, vCPU -> cores); CONTEXT "THE MOVE"
(ratchet -> plain gate, "as-if-two-databases" -> plain); the shard verdict
(namespace/tenancy plain); the zerodt verdict (LSN -> plain); the lfk verdict (Sidekiq
and model callbacks dropped); the replica verdict (Patroni dropped -> "read-only
replicas"); the opening monolith-state verdict (Patroni/PGBouncer/96-vCPU plain); and
"vCPU" -> "cores" in the buyvm verdict, the button label, and the PRIMARY meter. The
provenance footer was deliberately LEFT with its exact source terms (ActiveRecord::Base,
Sidekiq, LSN, etc.) - that block is the audit trail mapping the sim to Griffith's parts
1 and 2, and plainer wording there would reduce its traceability, not improve it.

**Logic untouched, proven.** Pass-2 changed only display-text lines
(41 / 50 / 54-56 / 58 / 75 / 82 / 119 / 146-147); a diff against the round-1 JSX shows
nothing outside verdict / subtitle / context / button / meter strings. The headless
trace reproduces every round-1 number exactly: without the gate the count fixes to 0 in
6 steps, with it in 3 (128 -> 63 -> 0); a fresh cross-join adds +12 before the gate and
is blocked after; the happy path reaches results with all flags set; every stage gate
holds; new-join spam peaks at 253 and grinds to 0. esbuild parses clean; the preview
was rebuilt from the round-2 sources and its embedded artifact compiles with zero
dashes. P27 structural fields remain byte-identical to the original upload; stats values
frozen, labels editable and dash-clean.

**Deliverables re-issued (round-2 overwrites round-1):** revised .json, patched .jsx,
rebuilt preview .html, this entry. Still NO svg - readability round; the figure remains
a separate step after text approval, and my read that this linear-timeline article
likely does not need one stands.

**OWNER FLAG still open (unchanged):** `violation-ratchet` is a CI-enforced process
pattern filed under category "consistency" - a catalog call for the owner, not something
I change.

---

## Review 1 - FIGURE pass (2026-08-11)

Owner approved the plain-language text and asked for meaningful figures in the problem
and solution sections - value-adding, not decorative. Per house convention this is the
final step after text approval. Format matched to the exemplar exactly: figures are
metadata in the JSON (`figures[]` with slug / eyebrow / caption / ariaLabel), placed in
prose by a `{{figure:slug}}` marker on its own paragraph, with the SVG shipped as a
separate `<slug>.svg` file the preview inlines as a URL-encoded data-URI inside
`<figure class="fig">`. Light theme, mono labels, the three-accent palette
(blue / green / amber), 700-wide viewBox, shared arrowhead marker.

**Three figures, each carrying a distinct load-bearing idea (rendered to PNG and
eyeballed before wiring in):**

1. `writes-hit-one-server` (problem, after the ceiling paragraph) - the read/write
   asymmetry that is the whole reason for the project: the app fans reads across as many
   replicas as you like, but every write converges on one primary already maxed at
   96 / 96 cores. This is the article's foundational "why vertical scaling walled".
2. `write-share-chose-ci` (problem, after the measurement paragraph) - a horizontal bar
   chart of write share per second: CI ~49%, everything else ~28%, merge requests ~20%,
   with a dashed 50% guide so "CI carried about half the writes" is instant. Real data,
   which a chart conveys far better than the prose list of percentages.
3. `as-if-two-databases` (solution, after the rollout paragraph) - a before/after: in
   phases 1-6 the app runs with two connection sets that both point at one real
   database (fully reversible); in phase 7 one connection flips to the new host. This is
   the transferable `universal-staged-rollout` move made visual.

**Judged OUT to avoid over-loading:** a loose-foreign-keys flow diagram
(delete -> trigger -> queue -> background job -> cleanup). It is a genuine mechanism,
but the solution already gets its single strongest figure, and the exemplar runs one
figure for a whole article - three total (2 problem, 1 solution) is already generous.
Happy to add the loose-FK flow if the owner wants it; it is a clean fourth.

**Grounding (no invented numbers).** Every figure value traces to Griffith parts 1-2:
96 / 96 cores and 22 TiB; the write-share split (CI 48.98% -> ~49%, Merge Requests
20.40% -> ~20%, Rest 27.80% -> ~28%, shown to the nearest point and marked approximate);
seven phases with phase 7 as the single-host reconfiguration. The bar chart is write
share only - the webhook-logs 22.39%-of-size / 0%-of-reads row is a size figure and was
deliberately kept out so the chart makes one honest point.

**Re-validation.** Bands measured with `{{figure:...}}` markers stripped are unchanged
(summary 1040, crux 1095, problem 2289, solution 4470); every marker resolves to a
`figures[]` entry and a matching `.svg`, with no orphans; caption sentences <= 29 words;
zero em / en dashes in the JSON, all three SVGs, and the preview; P27 frozen fields still
byte-identical to the original upload (`figures[]` is a new editable field, not frozen).
The preview renders all three blocks inline in the right sections, no marker leaks, and
each data-URI decodes back to valid SVG. The .jsx artifact was NOT touched this round.

**Deliverables:** the JSON (with `figures[]` + markers), three `.svg` files, the rebuilt
preview .html, and this entry. The .jsx is unchanged from the plain-language round.
