# behindscale — Inline Prose Lists: Technical Design

**Status:** IMPLEMENTED (2026-08-11) — three open questions locked by
owner; feature shipped. Shared classifier `src/lib/proseList.ts`;
renderer branch in `Prose.tsx`; `proseText()` strips list markers;
`list-block-well-formed` validator registered; Centrifuge article
re-listed. See §0 for the canonical resolutions; §1–§5 are the
reasoning trail.

**Trigger:** The `segment-centrifuge-database-queue` bundle authored
three enumerations in `problem` / `solution` as Markdown `- ` bullet
blocks. The live reading-shell renderer (`src/components/Prose.tsx`)
is plain-text-by-contract: it splits prose on blank lines and emits
each chunk as a raw `<p>`, with no Markdown parsing. So the bullets
rendered as literal dashes, and because items were separated by
single newlines, each block collapsed onto one run-on line. The
pipeline's preview builder, by contrast, renders `- ` blocks as
`<ul>` — a live-vs-preview divergence. The immediate fix flattened
the prose (commit `6b666e6`); this document designs the durable
feature: render list items cleanly, with minimal changes, so authors
can write lists and both renderers agree.

**Scope:** A strict, deliberately small subset of Markdown —
unordered (`- `) and ordered (`1. `) lists only — in the body prose
fields (`Article.problem`, `Article.solution`) and
`PatternDefinition.definition`. No bold, links, headings, code,
blockquotes, or raw HTML. Full Markdown stays deferred (see §0.4).

---

## 0. Canonical resolutions (2026-08-11)

Where anything in §1–§5 conflicts with this section, this section
wins.

### 0.1 The three locked questions

| Q | Decision |
|---|---|
| Q1 List style | **Bulleted** — `<ul>` renders with `list-disc`, `<ol>` with `list-decimal`, hanging indent, using existing color/spacing tokens. Reads unmistakably as a list. |
| Q2 Syntax scope | **Unordered + ordered.** `- ` lines → `<ul>`; `1. ` lines → `<ol>`. Ordered support lands in v1 because the real content (the "First / Second / Third" enumerations) is semantically ordered. |
| Q3 Validator strictness | **Strict (hard errors).** Malformed lists fail the build, matching the figures feature's guardrail posture. See §0.3 for the exact conditions. |

### 0.2 The core design decision — extend the chunk classifier, do NOT add a Markdown parser

`Prose.tsx` already splits prose into blank-line-delimited chunks
and special-cases one chunk shape: a lone `{{figure:<slug>}}` chunk
becomes a `<Figure>` instead of a `<p>`. **A list is the same move,
one more classification.** A chunk whose lines all match a list-item
shape becomes a `<ul>`/`<ol>`; everything else stays a `<p>`.

This is chosen over adopting `react-markdown` (the "Unit 7+" plan in
`architecture.md`) on purpose:

- **Surface.** react-markdown turns *all* prose into Markdown —
  bold, links, headings, code, and (without extra config) an HTML
  passthrough that becomes a sanitization surface. The reading shell
  has zero `dangerouslySetInnerHTML` today (the same property that
  drove the figures `<img>` decision, figures-design §0.2). One
  hand-written classifier branch keeps that property; a general
  parser risks it.
- **Cost.** No new runtime dependency, no bundle growth.
- **Blast radius.** Only chunks that are *entirely* list items change
  behavior. Every existing article renders byte-identically.

**Forward-compatibility clause:** the accepted syntax is a strict
subset of CommonMark. `- ` and `1. ` lists mean in our renderer
exactly what they mean in Markdown. So when react-markdown is
eventually adopted, today's list content renders identically with
**zero rewrite** — this feature is a down payment on that migration,
not a detour from it.

### 0.3 Authoring contract

A list is **one chunk** (no blank lines between items), blank-line-
separated from surrounding prose, whose every non-empty line begins
with a list marker. The lead-in sentence is its own preceding
paragraph. Markers within one chunk must be homogeneous — all `- `
or all `1. `, never mixed.

Unordered:

```
So the requirements come down to three:

- per-customer isolation, so one failing customer can't slow everyone;
- reordering without copying terabytes;
- adding capacity without constantly re-splitting the data.
```

Ordered (marker integers are display-normalized — the renderer uses
`<ol>` native numbering, so `1. 2. 3.` and `1. 1. 1.` render the
same):

```
Three properties make a database fast enough here:

1. Rows never change; state is an append-only log.
2. Every query touches a single job, so databases parallelize.
3. The workload is write-heavy with a tiny working set.
```

### 0.4 Strict validator — the six hard-error conditions

A new check, `list-block-well-formed` (registered in
`scripts/validate-content.ts`, joining the figure checks). Each
condition targets a specific silent-failure or ambiguity mode:

1. **Mixed chunk** — a chunk with some list-item lines and some
   non-list lines. Today this renders as a broken run-on; it almost
   always means a missing blank line between a lead-in and its list.
2. **Mixed markers** — `- ` and `1. ` items in the same chunk.
   Ambiguous list type.
3. **Single-item list** — a one-item list is a smell (either it
   wants a second item, or it should be prose).
4. **Blank-line-separated items** — `- a\n\n- b` (items split by a
   blank line) would parse as two separate one-item lists; reject so
   the author collapses them into one chunk.
5. **Nesting / leading whitespace** — a list line with leading
   indentation before its marker. Nested lists are unsupported in
   v1; reject rather than silently flatten.
6. **Unsupported ordered forms** — `1)`-style, non-`1.` delimiters,
   or ordered markers that aren't `<integer>. `. (Renumbering is not
   enforced — `<ol>` handles display — but the marker must be the
   supported shape.)

All are `severity: 'error'` (build-blocking). Rationale mirrors the
figures lints: a malformed list is safe-by-construction rejected
before it can reach production looking broken.

---

## 1. Where prose flows (the system the change lives in)

- **Renderer:** `src/components/Prose.tsx` — the single source of
  truth for how `problem` / `solution` / `definition` become DOM.
  Consumes `proseRaw()` (markers/markup preserved) because it needs
  to see structure. Invoked by `ArticleDetail.tsx` (problem,
  solution) and `PatternDetail.tsx` (definition).
- **Measurement / indexing:** `src/lib/proseText.ts` — every path
  that *counts* or *indexes* prose (length bands, future JSON-LD,
  future search) calls `proseText()` to strip structure so markup
  never inflates counts or leaks into labels. Today's counting
  consumer: `scripts/checks/stats-value-in-prose.ts`.
- **Preview builder:** lives in the external pipeline generate stage
  (not in this repo), already emits `<ul>` for `- ` blocks. This
  feature makes the live shell agree with it, so the two renderers
  converge rather than needing the pipeline changed.

The figures feature established this exact split (renderer sees
structure via `proseRaw`; everyone else strips via `proseText`).
Lists reuse it unchanged.

## 2. The renderer change (~15 lines, `Prose.tsx`)

A new branch beside the figure branch. Sketch:

```jsx
const list = asList(trimmed)   // {ordered: boolean, items: string[]} | null
if (list) {
  const Tag = list.ordered ? 'ol' : 'ul'
  return (
    <Tag key={i} className={list.ordered
      ? 'ml-5 flex list-decimal flex-col gap-2 …'
      : 'ml-5 flex list-disc flex-col gap-2 …'}>
      {list.items.map((it, j) => (
        <li key={j} className="leading-relaxed text-text-secondary">{it}</li>
      ))}
    </Tag>
  )
}
// asList: split chunk on \n; if every non-empty line matches
// /^- \S/  -> unordered; if every one matches /^\d+\. \S/ -> ordered;
// else null. Strip the marker prefix from each item. Homogeneity and
// all the malformed shapes are guaranteed by the build-time check, so
// the renderer trusts its input and returns null on anything unclear
// (defense-in-depth: unknown shapes fall through to <p>, never crash).
```

No change to the paragraph path or the figure path. No new deps.

## 3. Measurement helper change (~4 lines, `proseText.ts`)

`proseText()` strips the leading marker (`- ` / `N. `) from list
lines, keeping the item *text*. Rationale identical to why it strips
figure markers: the two-or-three marker characters are structure, not
prose, and must not inflate the length-band counts or leak into any
future index/description. Item text is retained in full, so the
`stats-value-in-prose` substring match is unaffected.

## 4. Validation, contract, docs

- **New check:** `scripts/checks/list-block-well-formed.ts` +
  `__tests__` + registration in `validate-content.ts`. Six
  conditions from §0.4.
- **Contract:** amend the three `architecture.md` prose-field notes
  (problem, solution, pattern definition) from "markdown deferred,
  treat as plain prose" to "plain prose **plus one Markdown-subset
  construct: unordered and ordered lists**; full markdown still
  deferred to Unit 7+."
- **Header comment** in `Prose.tsx` updated to name lists as the
  second recognized chunk shape after figure markers.
- **Progress tracker + open-decisions** entry.

## 5. Footprint summary

| File | Change |
|---|---|
| `src/components/Prose.tsx` | +~15 lines (one branch + `asList`) |
| `src/lib/proseText.ts` | +~4 lines (strip list markers) |
| `scripts/checks/list-block-well-formed.ts` | new (+ test, + registration) |
| `context/architecture.md` | 3 prose-field notes amended |
| `context/progress-tracker.md`, `context/open-decisions.md` | log entry |

No runtime dependencies. No contract-wide behavior change. Forward-
compatible with the eventual react-markdown adoption (§0.2).

---

## Reasoning trail — alternatives considered

- **Adopt `react-markdown` now.** Rejected: pulls the whole Markdown
  grammar (and an HTML-sanitization surface) for one construct,
  against the static-minimal-surface posture. Deferred as the Unit 7+
  plan; this subset is forward-compatible with it.
- **Flatten all lists forever (no feature).** The immediate fix, but
  it permanently forbids a natural, readable construct and leaves the
  live shell diverging from the preview builder on any future `- `
  block. Rejected as a standing policy.
- **Change the preview builder to plain-text instead.** Makes the two
  renderers agree by removing the `<ul>` from preview — but throws
  away the better rendering. We want lists to *work*, not to be
  uniformly absent.
- **Unordered-only v1.** Considered; rejected because the real
  content is semantically ordered ("First / Second / Third"), and
  `<ol>` is a trivial marginal addition to the classifier once the
  branch exists.
- **Warn instead of hard-error.** Rejected: a malformed list reaches
  production looking broken (run-on line or literal dashes). The
  figures feature set the precedent that structure-level content
  errors block the build.
