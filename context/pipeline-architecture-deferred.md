> Status: Deferred from active implementation as of 2026-06-04.
> This document preserves the full pipeline architecture as
> designed during Unit 7 review. The decision to defer is
> recorded in progress-tracker.md under "Deferred Work." Revisit
> at the week-8 reassessment or whenever manual editorial cadence
> shows signs of scaling friction.

# Unit 7 — pipeline architecture review

This is the design-intent surface for the entire pipeline. No code lands until you ratify (or push back on) the decisions below. After ratification, sub-units 7a–7f land in dependency order without per-sub-unit design review.

I've structured it by stage so you can navigate; open questions live in their own section at the end with explicit numbering so you can push back surgically.

## Frame: what the pipeline does and doesn't do

**Does:** ingest RSS from the `content/feeds.json` allowlist, fetch + extract the article HTML, ask Claude to produce the structured `Article` JSON (problem/solution/tradeoffs/pattern references), ask Claude to produce a draft `.jsx` artifact, write outputs to disk in a state the human can review and polish.

**Doesn't:** make the published-vs-not decision unilaterally, ship a Claude-generated artifact straight to prod, schedule itself (the scheduler is deferred), produce final-quality artifacts (drafts only — the editorial polish step is human-in-the-loop and always will be).

The shift Unit 7 produces is: behindscale stops being a manually-curated library and becomes a **human-edited library backed by a Claude-driven content pipeline**. The four artifacts we hand-authored set the quality bar; the pipeline path produces draft inputs to that same editorial process, not finished outputs.

**Sub-unit shape.** Six sub-units, one per logical surface, each landing as a feat commit. Docs commit precedes everything once we've iterated to a locked architecture.

- 7a — SQLite schema + db.ts helper (no Claude, no network)
- 7b — discover (RSS → SQLite)
- 7c — fetch (HTML → markdown cache)
- 7d — analyze (Claude → Article JSON; manages proposed-patterns + blocked-articles)
- 7e — generate (Claude → draft .jsx; promote-artifact CLI)
- 7f — orchestrator (`pipeline/run.ts`, `npm run study`, reporting)

---

## Stage 1: discover

**Contract.**

- **Input:** the source allowlist at `content/feeds.json`. The `articles` table in SQLite (for dedup).
- **Process:** for each source, GET the RSS feed; for each item, extract `{ url, title, publishedAt }`; INSERT into SQLite with `status='discovered'` if and only if the URL isn't already present.
- **Output (SQLite):** new rows with `status='discovered'`, populated with `url, source_slug, title, published_at, discovered_at`. No filesystem writes.
- **Decisions:** the only decision is "have I seen this URL before?" Anything new is admitted regardless of content (analyze stage makes the publish-worthy decision later).

**Idempotency.** URL is the natural primary key. Re-running discover is safe: existing rows are untouched, only new URLs become rows.

**Failure modes.**
- Feed unreachable → `console.warn`, continue with the next feed. Don't fail the whole stage.
- Malformed RSS → same.
- Item missing required fields (`url` or `title`) → skip the item, log.

**What's NOT in discover.**
- **Quality scoring.** The earlier tracker mentioned "filter + score" in discover. I'm proposing we drop scoring here. The cleaner split: discover is dumb (URL collection + dedup), analyze owns the publish-worthy decision. Adding score as a column with default-null is a one-line change later if scoring proves useful as a processing-priority signal. Open question 1.
- **Title-based filtering.** Same reasoning — anything that filters before fetch wastes the dedup work if we change our minds later. Filter at analyze where the full text is available.

---

## Stage 2: fetch

**Contract.**

- **Input:** SQLite rows with `status='discovered'`.
- **Process:** for each row, GET the article URL, run a content-extraction pass (Mozilla Readability via `@mozilla/readability` + `jsdom`, the standard pair), write the extracted markdown/text to `pipeline/cache/<slug>.md`.
- **Output (disk):** `pipeline/cache/<slug>.md` per article.
- **Output (SQLite):** row updates: `slug, content_path, fetched_at, status='fetched'`.

**Slug derivation.** Slug is the stable URL-shaped identifier the whole rest of the system uses. The pipeline derives it during fetch (not discover — at discover we only have URL + RSS title, and the RSS title is sometimes worse than the article's actual title which we don't have until we extract).

Heuristic:
1. Take the last non-empty path segment of the URL.
2. Strip any trailing hash suffix (`-f6c34552146f` on Medium URLs).
3. If the result is empty, slug-shaped junk, or shorter than 8 chars, fall back to slugifying the extracted article's `<h1>`.
4. If that slug collides with an existing row (different URL, same slug), suffix with `-2`, `-3`, etc.

**Failure modes.**
- HTTP 4xx (404, 401, 403) → `status='fetch_failed'`. No retry — these are permanent.
- HTTP 5xx → retry with exponential backoff (3 attempts, 1s/4s/16s). On final failure, `status='fetch_failed'`.
- Connection error / timeout → same retry policy as 5xx.
- Extracted content < 500 chars → `status='fetch_failed'`. Almost always paywall, redirect, or a non-article URL.
- Content extraction throws → `status='fetch_failed'`.

Failed rows stay in the DB. They can be retried manually by setting `status='discovered'` (a `npm run pipeline:retry <slug-or-url>` CLI helper lands in 7c).

---

## Stage 3: analyze

This is the most consequential stage. It's the one that produces the `Article` JSON, decides whether to publish, and manages the proposed-patterns queue.

**Contract.**

- **Input:** SQLite rows with `status='fetched'`, the extracted markdown at `pipeline/cache/<slug>.md`, the full current pattern library (`content/patterns/*.json`), and the row's source metadata copied verbatim from `content/feeds.json` (invariant 7 enforcement at the data level).
- **Process:** one Claude API call per article. Prompt includes the extracted text + the full pattern library (definitions, names, slugs) + the structured-output schema for the response.
- **Output:** depends on the publish state (see below).
- **Output (SQLite):** row updates: `analyzed_at, claude_model, analyze_tokens_in, analyze_tokens_out, status` (one of `analyzed`, `blocked`, `rejected`, `analyze_failed`).

**Claude returns:**
```
{
  article: { title, summary, problem, solution, tradeoffs[], tags[] },
  patternReferences: [{ slug, note }, ...],
  proposedPatterns: [{ slug, name, draftDefinition, reasoning }, ...],
  rejected: boolean,
  rejectionReason?: string
}
```

The `rejected` flag is the editorial signal — Claude says "this article isn't behindscale-worthy" (e.g., it's a hiring post, conference recap, product release). This is the gate that replaces a human pre-read.

**The three-publish-state branch.**

After splitting `patternReferences` into grounded (slug exists in current library) and proposed (slug doesn't):

- **Published path:** grounded count ≥ 2. Pipeline writes `content/articles/<slug>.json` with `artifact: null` and only the grounded references. Proposed references are appended to `pipeline/proposed-patterns.json` with the article slug as provenance. `status='analyzed'`.
- **Blocked path:** grounded count < 2 after stripping. Pipeline writes the full proposed article + audit metadata to `pipeline/blocked-articles.json`. **Does not** write to `content/articles/`. `status='blocked'`.
- **Rejected path:** Claude returned `rejected: true`. Pipeline writes nothing to disk besides the raw response cache. `status='rejected'`.

The validator (Unit 4) never sees blocked or rejected articles — invariant 8 stays clean because the editorial gate operates upstream.

**The pattern-recognition question (your explicit ask).**

I lean **Option 1: library-in-context prompt.** The full pattern library is sent with each analyze call. Claude is asked to match against existing slugs explicitly and only propose new ones for things that genuinely don't fit. Reasons:

1. **Single failure surface.** Option 2 introduces a second system (the reconciler) with its own error modes — "library has `idempotency-keys`; Claude said `idempotent retries`; near-miss reconciliation rule fires, gets it wrong, article ships referencing the wrong pattern." Option 1 collapses this to one prompt where Claude is shown the existing intent (the full definition, not just the slug) and asked to match deliberately.

2. **Tighter alignment naming.** Claude sees pattern *definitions*, not just slugs. "Idempotency Keys: same key in, same outcome out" — Claude can recognize this in articles using different language. The reconciler in Option 2 doesn't have that semantic context unless we hand-build it.

3. **Scale is fine for now.** Eleven patterns × ~300 words each is ~3,500 words of library context per call. Trivial for Sonnet 4.6's window. Becomes interesting around 50–100 patterns (~30k words) — at that point we switch the library from inline-context to a Claude tool call (`lookup_pattern(name) -> definition`). That swap is a future-Unit concern, not a now-decision.

The cost is prompt size and a stronger coupling between analyze and pattern-library shape. Both are acceptable.

**Proposed-pattern handling.**

Each proposed pattern entry written to `pipeline/proposed-patterns.json`:
```
{
  proposedSlug: "saga-pattern",
  proposedName: "Saga Pattern",
  draftDefinition: "...",
  reasoning: "Article describes a multi-service workflow with compensating transactions, which isn't captured by the existing patterns library.",
  proposedBy: [{ articleSlug: "uber-foo", proposedAt: "2026-06-04T..." }],
  status: "open"   // open | adopted | rejected
}
```

If multiple analyze runs propose the same slug, the entries merge (the `proposedBy` array accumulates). When the human authors `content/patterns/saga-pattern.json`, the next analyze run notices the now-grounded slug and prunes the entry (sets `status: "adopted"` and stops counting it as proposed in fresh runs).

**Conflict guard.** If Claude proposes a slug that *already exists* in the library, that's a Claude error — it should have used the existing reference. The analyze stage's response validator drops the proposal (logs a warning) and treats the article's reference as grounded. The article still goes through normal flow.

**Blocked-article shape.** Each entry in `pipeline/blocked-articles.json`:
```
{
  url, slug, title, source: { ... },
  proposedArticle: { ...full Article shape with all references intact... },
  audit: {
    groundedSlugs: ["fault-isolation"],
    proposedSlugs: ["multi-region-failover", "control-plane-isolation"],
    requiredMinimumPatterns: 2,
    actualGrounded: 1,
    blockedAt: "..."
  }
}
```

Human review = open the JSON. The two paths out: author the missing pattern definition (which unblocks on next analyze; pipeline auto-prunes the blocked entry), or delete the entry from the file (= reject). A `npm run pipeline:retry <slug>` helper exists for cases where the human authored a new pattern and wants to re-analyze without waiting for the next discover cycle.

**Source-equality enforcement at data level.** The analyze stage copies the `source` block from `content/feeds.json` *verbatim* into the article JSON. Never re-derives from the article URL. This is what makes invariant 7 hold downstream — if it isn't in `content/feeds.json`, it can't have a source block. A new validator check (`source-matches-allowlist`) joins the existing three in 7d, asserting equality between each article's `source` block and the corresponding feed entry.

**Failure modes.**
- Claude API transient (rate limit, 503) → retry with backoff, status stays `fetched`, `retry_count++`.
- Claude API hard failure (auth error, model deprecated) → `status='analyze_failed'`, `last_error` populated, requires manual intervention.
- Response doesn't parse as JSON → retry once with a "please return only valid JSON in this exact shape" reformat prompt; if persistent, `status='analyze_failed'`.
- Response parses but fails the structured-output schema (missing required fields, wrong types) → same retry-once-then-fail.
- Article slug derived in fetch collides with an existing **content** article (not just SQLite) → `status='analyze_failed'`, surface in summary report. This shouldn't happen often because slug derivation should be stable per URL, but it's a possible mode.

---

## Stage 4: generate

**Contract.**

- **Input:** SQLite rows with `status='analyzed'`, plus the article JSON at `content/articles/<slug>.json`.
- **Process:** one Claude API call per article. Prompt includes the article JSON + the artifact-generation rules (dark token palette, self-containment with only `useState`/`useEffect`/`useRef` from React, no external network access, ErrorBoundary at the entry, the visualization should illustrate the article's central mechanism not just summarize text).
- **Output (disk):** `pipeline/draft-artifacts/<slug>.jsx`. **Not** `content/artifacts/`.
- **Output (SQLite):** row updates: `generated_at, generate_tokens_in, generate_tokens_out, draft_artifact_path, status='generated'`.

**The draft-to-final handoff.**

This is the editorial polish gate. Three steps:

1. Pipeline writes `pipeline/draft-artifacts/<slug>.jsx`. The article ships immediately (already at `content/articles/<slug>.json` from analyze) with `artifact: null`. The reader gets the summary; no broken artifact appears on prod.

2. Human inspects the draft, edits it locally until the visualization meets the bar. Compiles it locally via `npm run compile-artifacts` against `pipeline/draft-artifacts/` to preview.

3. When ready, human runs `npm run promote-artifact <slug>`. The script:
   - Moves the file: `pipeline/draft-artifacts/<slug>.jsx` → `content/artifacts/<slug>.jsx`
   - Edits `content/articles/<slug>.json` to set `artifact: { path: '/artifacts/<slug>/index.html' }`
   - Runs validator + compile-artifacts to confirm nothing broke
   - Exits non-zero on any failure with the editor's working tree restored

Promotion is the only way a draft becomes a real artifact. The website never ships a non-promoted artifact because:
- The article shipped with `artifact: null` until promotion.
- `pipeline/draft-artifacts/` is under `pipeline/`, not bundled by Vite's `import.meta.glob` (`/content/artifacts/*.jsx`).
- The compile-artifacts script only walks `content/artifacts/`.

The artifact-path-matches-slug validator from Unit 6 enforces this on the published side.

**Pre-compile in pipeline.** The generate stage also runs the compiled bundle through esbuild as a sanity check before declaring success. If the generated .jsx doesn't compile, the file is saved to `pipeline/cache/<slug>.failed-artifact.jsx` for inspection, `status='generate_failed'`, and the human can fix it manually or just discard and re-run generate.

**Failure modes.**
- Claude API failure → same retry policy as analyze.
- Generated .jsx doesn't compile → save the broken artifact for inspection, `status='generate_failed'`. Don't auto-retry — bad output is more useful as evidence than as a retry target.
- Generated .jsx imports something other than React primitives → linter rejects, treated as compile failure. The fault-isolation invariant (each artifact ships its own React) makes this important.

---

## SQLite schema

One table, one PK, four indices, one status enum.

```sql
CREATE TABLE articles (
  url TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  source_slug TEXT NOT NULL,
  title TEXT,
  published_at TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'discovered', 'fetched', 'fetch_failed',
    'analyzed', 'blocked', 'rejected', 'analyze_failed',
    'generated', 'generate_failed'
  )),
  discovered_at TEXT NOT NULL,
  fetched_at TEXT,
  analyzed_at TEXT,
  generated_at TEXT,
  content_path TEXT,
  draft_artifact_path TEXT,
  claude_model TEXT,
  analyze_tokens_in INTEGER,
  analyze_tokens_out INTEGER,
  generate_tokens_in INTEGER,
  generate_tokens_out INTEGER,
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_source ON articles(source_slug);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published ON articles(published_at);
```

**Why URL as PK.** Slug is *derived* in stage 2; URL is known at stage 1. Using URL as PK lets discover dedup with a single query against the natural key. Slug is a UNIQUE secondary identifier so the analyze stage can look up a row by slug for retries.

**Why status as enum-via-CHECK rather than a state machine table.** Simpler. The state machine view (with explicit valid-transition rows) catches invalid transitions but the cost is real abstraction overhead for a 9-state system that lives in one file. Status enum with the CHECK constraint catches typos at insert; the transition logic lives in the per-stage code where it's already obvious. We can add a state machine later if invalid transitions become a real bug source.

**Why no separate `pattern_proposals` or `blocked_articles` tables.** Both live as JSON files at `pipeline/proposed-patterns.json` and `pipeline/blocked-articles.json` (already locked in architecture.md). The human reviews them by reading the file. SQLite is the article-lifecycle ledger; JSON files are the editorial review surface. Don't duplicate the data.

**`retry_count` semantics.** Bumps on every transient failure. After 3 attempts at the same stage, the row moves to the corresponding `*_failed` terminal status and waits for human intervention. Manual retry (`npm run pipeline:retry <slug>`) resets `retry_count` to 0 and the status to the appropriate upstream stage.

**Location.** `pipeline/processed.db` (already in `.gitignore`). WAL mode for concurrent-safe reads while the orchestrator writes.

---

## The orchestrator

`npm run study` is the daily command. It chains stages serially. Per-row fault isolation means a single article's failure never blocks others.

**Chain.**
```
discover  → adds rows
fetch     → processes all status='discovered'
analyze   → processes all status='fetched'
generate  → processes all status='analyzed'
report    → prints per-stage summary, lists draft-artifact handoff queue
```

Each stage's loop:
```ts
for (const row of db.rowsWithStatus(STAGE_INPUT)) {
  try {
    await processOne(row)
  } catch (err) {
    db.markFailed(row, err.message)
    // log + continue; next row is independent
  }
}
```

**Idempotency.** Status drives eligibility — re-running `npm run study` is always safe. Anything that was `discovered` and got fetched is now `fetched`, so fetch ignores it on the next run. Anything that hit a transient failure has its retry_count bumped; permanent failures stay terminal until manual retry.

**Failure propagation.** None across rows. None across stages either — generate processes whatever `analyzed` rows exist, regardless of whether analyze itself ran in this invocation. So `npm run study` is also useful as `npm run study --resume` — if the laptop slept mid-analyze, the next run picks up exactly where it stopped.

**Per-article reporting.** At the end of `npm run study`:
```
Pipeline run summary (2026-06-04 14:32):
  discovered:   4 new candidates (stripe-engineering: 2, airbnb: 1, uber: 1)
  fetched:      3 / 4 (1 fetch_failed: <url>, paywall suspected)
  analyzed:     2 / 3 (1 blocked: insufficient grounded patterns)
  generated:    2 / 2 (drafts at pipeline/draft-artifacts/)

Queues:
  draft artifacts ready for review: 2
    - stripe-blog-post-2 (generated 14:31)
    - airbnb-data-platform (generated 14:31)
  blocked articles: 1
    - airbnb-frontend-perf (needs: cache-warming, edge-rendering)
  proposed patterns (open): 3
    - cache-warming (proposed by 1 article)
    - edge-rendering (proposed by 1 article)
    - cross-region-replication (proposed by 2 articles)
```

The summary is the editorial dashboard. After the human reviews + promotes drafts and authors any new patterns the proposals justify, the next `npm run study` picks up where it left off.

---

## Claude API integration

**Model choice.** Default to **Claude Sonnet 4.6** for both analyze and generate. Cheaper, faster, fully capable for the structured-extraction and React-component-authoring tasks. The four hand-authored artifacts are inline-style React with no abstract abstractions — Sonnet handles that shape easily. Swap analyze or generate to Opus 4.7 if quality issues emerge on a per-stage basis. Open question 2.

**SDK.** `@anthropic-ai/sdk` as a direct dependency, pinned. Pipeline-only (never reaches `src/`).

**API key.** `ANTHROPIC_API_KEY` from `.env` (already `.gitignore`d). `.env.example` documents the variable name.

**Token tracking.** Every call records `tokens_in / tokens_out` in SQLite per article. The summary report can produce a rough cost estimate ("today's run: 240k tokens in, 32k out, ~$1.20"). No daily budget cap in Unit 7; defer.

**Concurrency.** Serial within each stage in Unit 7. Anthropic's rate limits permit parallelism but it's not worth the complexity at 1–3 articles per study run. Note as deferred optimization.

---

## Prompts as code

```
pipeline/prompts/
  README.md           — versioning + change discipline
  analyze.md          — extracts Article JSON; produces patternReferences + proposedPatterns
  generate.md         — produces a single .jsx file given an Article JSON
  shared/
    pattern-library-context.md   — header template the analyze prompt prepends current patterns into
    artifact-rules.md            — the dark-palette / self-containment / ErrorBoundary contract; generate.md imports this
```

**Versioning discipline.** Prompts are committed code. CLAUDE.md already says "Treat Claude prompt changes under `pipeline/prompts/` as meaningful changes worth noting." Significant prompt changes get their own `docs:` or `chore:` commit with a body that explains *why* the change.

**Regression check.** A `pipeline/regression-check.ts` script re-runs analyze (not generate — too noisy) against the four seed articles and diffs the output against committed `pipeline/regression-fixtures/<slug>.expected.json` files. Two purposes:

1. Catch prompt-change regressions before they ship.
2. Surface the irreducible non-determinism so we don't over-trust diffs.

Fixtures are updated deliberately when prompt changes are intentional. The script runs as part of the prompt-change PR locally, not in CI (CI would be flakier than useful given Claude's non-determinism). Open question 6 — worth building as part of 7d or defer.

**Cost: this turns the prompts into reviewable artifacts.** Bad outputs almost always trace to prompt issues; making prompts versioned + diffable + regression-tested means iteration cycles on quality are systematic, not vibes.

---

## Failure-mode table (consolidated)

| Stage | Failure | Behavior |
|---|---|---|
| discover | feed unreachable | log, continue next feed |
| discover | malformed RSS | log, continue |
| discover | item missing url/title | log, skip item |
| fetch | HTTP 4xx | `status='fetch_failed'` (no retry) |
| fetch | HTTP 5xx / timeout | retry 3× with backoff, then `fetch_failed` |
| fetch | extracted content < 500 chars | `fetch_failed` (paywall) |
| fetch | slug collision in SQLite | suffix `-N`, continue |
| analyze | Claude rate-limit/5xx | `retry_count++`, status stays `fetched` |
| analyze | Claude auth/model error | `analyze_failed`, `last_error` set |
| analyze | response doesn't parse JSON | retry once with reformat; persistent → `analyze_failed` |
| analyze | < 2 grounded patterns after stripping | `status='blocked'`, write to `pipeline/blocked-articles.json` |
| analyze | Claude returned `rejected: true` | `status='rejected'` |
| analyze | proposed slug collides with existing definition | drop the proposal, treat as grounded, log warning |
| analyze | slug collides with existing `content/articles/` file | `analyze_failed`, surface in report |
| generate | Claude failure | same retry policy as analyze |
| generate | .jsx doesn't compile | save to `pipeline/cache/<slug>.failed-artifact.jsx`, `status='generate_failed'` (no auto-retry) |
| generate | .jsx imports non-React-primitives | treated as compile failure |

All failures are per-row. Nothing fails the whole stage.

---

## What's NOT in Unit 7 (explicitly deferred)

1. **Scheduler.** `npm run study` is the daily command. The thing that *calls* it on a schedule (GitHub Actions cron vs launchd) is deferred — pick when the daily rhythm settles.
2. **`content/patterns/index.json` (the derived aggregated library).** Mentioned in architecture.md as the Unit 4+ swap point for `patternStats`. Independent of pipeline mechanics. Defer to Unit 8 or later.
3. **Concurrent pipeline runs.** SQLite is in WAL mode so reads are safe during writes, but the orchestrator isn't designed for two simultaneous `npm run study` invocations. Defer.
4. **Editorial review UI.** "Open the JSON" is the v1 review surface. A web UI for reviewing blocked articles + proposed patterns + draft artifacts is a future thing.
5. **Per-source quotas.** No per-source ingestion limits. If a source publishes 30 articles in a week, the pipeline tries to process all 30. Defer.
6. **Cost monitoring with budget caps.** Tokens are tracked per call; daily/monthly caps are deferred.
7. **Auto-promote.** Drafts are *always* human-reviewed before promotion. No auto-promote toggle, ever.

---

## Open questions

These are the decisions I'm genuinely uncertain about or where I'd value your push-back specifically. Numbered for surgical response.

**1. Quality scoring in discover.** Do we keep discover dumb (URL collection + dedup) or add a heuristic title-scoring layer that filters or prioritizes? My lean: dumb discover. The cost of admitting a hiring post is one wasted analyze call (cheap); the cost of a bad heuristic dropping a real article is high (silent miss).

**2. Model: Sonnet for both vs Opus for generate.** My lean: Sonnet for both initially. Swap generate to Opus if the four-artifact quality bar isn't achievable with Sonnet. Acceptable to ship Sonnet, monitor, swap?

**3. Slug derivation.** URL-path-last-segment + hash-suffix-stripped + title-fallback + collision-suffix. Acceptable, or do you want title-first?

**4. Pattern-recognition: Option 1 (library-in-context).** Locked? Open question is really "when do we revisit at scale" — my proposal is the 50–100-pattern boundary triggers a switch to tool-use lookup. Anchor a different threshold?

**5. Promote-artifact: CLI vs interactive UI.** CLI now (`npm run promote-artifact <slug>`), UI later if friction warrants. OK?

**6. Prompt regression check.** Build the diff-against-fixtures script as part of 7d, or defer until after we've felt prompt-quality friction? My lean: build it. Cheap (~50 lines), and the moment prompts get iterated more than once, you'll want it.

**7. Retry budget per stage.** Default of 3 transient retries before terminal-fail. Reasonable, or do you want a more conservative 1, or more aggressive?

**8. State machine vs status enum.** I picked status enum + CHECK constraint. Simpler. Worth the abstraction overhead of a state machine table now?

**9. Source-equality validator check.** I want to add a fourth check (`source-matches-allowlist`) in 7d alongside the analyze stage. The check fails the build if any article's `source` block doesn't match `content/feeds.json` verbatim. This catches both manual editing accidents and any future pipeline drift. Lock or defer?

**10. Where the prompts live for review.** Inline in `pipeline/prompts/*.md` files, included via Node `fs.readFileSync` at runtime. Alternative: as TS template-literal exports in `pipeline/prompts/*.ts`. I prefer .md files — they're plain markdown, render properly on GitHub, can include code fences with syntax highlighting, and changes show clean diffs. Acceptable?

**11. What `npm run study --dry-run` should do.** A `--dry-run` mode that runs discover + reports new candidates without proceeding to fetch/analyze would be useful for "what's new this week" surveying. Worth building in 7f, or defer?

**12. Rejected articles: keep the URL in SQLite or actively delete?** I picked "keep" so a re-run of discover doesn't re-add a previously-rejected URL. Trade-off: SQLite accumulates rejected rows forever. At meaningful scale, prune by age (e.g., delete `status='rejected'` rows older than 90 days). Defer or build now? My lean: defer; let it accumulate until it's a real problem.

---

## What lands when you ratify

After this review iterates to a locked architecture, the order is:

1. **Docs commit** — locks the architecture into `architecture.md` (new top-level "Pipeline" section, replacing the briefer notes there now). Resolves the open questions above per your ratification.
2. **7a — SQLite schema + `pipeline/db.ts`.** Pure database layer, no Claude, no network. The migration that creates the `articles` table + indices, the typed helpers (`rowsWithStatus`, `markStatus`, `markFailed`).
3. **7b — discover.** RSS fetch + URL dedup. Writes to SQLite only.
4. **7c — fetch.** HTML extraction + slug derivation + cache write.
5. **7d — analyze.** Claude integration + prompts + structured-output parsing + three-publish-state branching + proposed-patterns + blocked-articles management + the source-equality validator check.
6. **7e — generate.** Second Claude call + esbuild sanity-compile + draft-artifact write + `npm run promote-artifact` CLI.
7. **7f — orchestrator.** `pipeline/run.ts` + `npm run study` + the summary report.

Each sub-unit is a feat commit. Each has its own verification: validate + tests + (for 7e) a manual draft promotion against a fixture article.

Estimated commit count: 7 (1 docs + 6 feat). Plus probably 1–3 small fix/chore follow-ups (`.env.example`, README updates, prompt iterations).

---

Push back surgically on any of the 12 open questions, or on the stage contracts directly. I'd particularly value your read on (4) the pattern-recognition lock, (9) the source-equality validator scope, and (11) the dry-run mode — those have downstream implications for what 7d/7f need to look like.
