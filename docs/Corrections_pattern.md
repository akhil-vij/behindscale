# Corrections_pattern — behindscale pattern-review standards

Living reference for reviewing **pattern-registry entries**. Companion to `CORRECTIONS.md` (which covers articles). Seeded 2026-08-21 during Round 1 (Priority-Aware Load Shedding); refined each round.

**How to use this file:** read it verbatim before a round, and apply it the way `CORRECTIONS.md` is applied to articles. Rules are cited as **PP‑n**. When a rule here and an owner ruling conflict, the owner's ruling wins and gets folded back in here. The bands in §2 are a working set, not law — they are what recent rounds actually produced, and the owner tunes them as more patterns are reviewed.

---

## 0. Scope — what the pattern-review agent does

- **PP-1.** Review runs in rounds: propose → owner rules → finalize. The agent never publishes; it delivers a round package the owner ships through the repo pipeline.
- **PP-2.** The agent **authors the artifact** for patterns that don't have one. For a pattern that already has one, it does a readability pass **with edits** (not flag-only).
- **PP-3.** The agent **never edits article-derived content** on a pattern page — the "same move, N ways" strip, co-occurrence chips, and problem doors come from the article notes. Flag issues in them; never rewrite them.
- **PP-4.** The pattern **slug is frozen.** Never change it.
- **PP-5.** Deliver as **separate files**, never a zip, plus a **revision-preview HTML** (see §9). The preview is for reading only — never live.

---

## 1. Fields, and how each one renders

- **PP-6. `oneLineDefinition`** — the page lede, and the source of the page's meta-description. A single plain sentence: what the pattern does and what that buys. Renders as a plain string (no markdown). If it is missing, the page has no lede and the meta-description falls back to the first sentence of the definition — so authoring it is usually the unblock.
- **PP-7. `definition`** — the **only** field rendered through Prose, so it is the only field that supports markdown lists (see §5). Keep the four-move shape: **mechanism → insight → requirements/variants → applicability.** The **first sentence is in the search corpus** (see §3), so write it to carry the pattern's plain vocabulary.
- **PP-8. `whenItApplies` / `tradeoffs`** — arrays of structured cards, not Prose. `whenItApplies` renders as a **numbered** list; both render **bold-lead** (see §6). No markdown, no lists inside an entry.
- **PP-9. `mechanism`** = `{caption, blurb, idea, whatToTry}`. `blurb` renders under the "The mechanism" heading. `idea` + `whatToTry` render as a collapsible **"THE IDEA · WHAT TO TRY"** block **above** the artifact, sourced from this JSON (not from the `.jsx`). `caption` is the artifact's label eyebrow.
- **PP-10. `artifact`** = `{path, teaser}`. `teaser` is evocative copy (see §7).
- **PP-11. `aliases`** — search-only (see §3).
- **PP-12. `category`** — exactly one of `resilience`, `throughput`, `consistency`, `observability`, `performance`.
- **PP-13. `figures`** — optional; `[{slug, eyebrow, caption, ariaLabel, file}]` plus a `{{figure:slug}}` marker placed in the `definition` (see §8). The pattern renderer resolves the marker (confirmed 2026-08-21).

---

## 2. Bands — working set v0.1 (refine as rounds accrue)

Words are the primary control for prose; characters are a secondary guide. These are grounded in what Round 1 shipped, with headroom. **Not yet owner-fixed — recommendations only.**

| Field | Words | ~Chars | Notes |
|---|---|---|---|
| `oneLineDefinition` | 20–34, **one sentence** | 120–200 | plain lede; also the meta-description |
| `definition` sentence | **≤ 40** (hard ceiling) | ≤ ~260 | per-sentence, everywhere |
| `whenItApplies` entry | ≤ 40 (1–2 sentences) | 150–260 | bold-lead |
| `tradeoffs` entry | ≤ 45 (1–2 sentences) | 180–290 | bold-lead |
| bold **lead clause** (both) | **4–12** | — | the part before the first colon that renders bold |
| `mechanism.caption` | 2–6 | ≤ 40 | label, usually all-caps |
| `mechanism.blurb` | ≤ 35 (1–2 sentences) | ≤ 200 | plain |
| `mechanism.idea` | ≤ 35 (1–2 sentences) | ≤ 200 | plain |
| `mechanism.whatToTry` | ≤ 30 | ≤ 170 | stays **evocative** |
| `artifact.teaser` | ≤ 18, one line | ≤ 130 | stays **evocative** |
| `figure.eyebrow` | 2–6 | ≤ 40 | uppercase |
| `figure.caption` | 12–40 | 90–260 | |
| `figure.ariaLabel` | 4–20 | ≤ 130 | |

`definition` as a whole has no total cap — it is governed by the per-sentence ceiling, the four-move shape, and the list rules.

---

## 3. Aliases — search-only, substring-matched

**How the matcher works (confirmed by the implementation agent, 2026-08-21).** A query matches by **character substring** on a normalized, joined corpus — `corpus.includes(query)`. Not exact, not tokenized, not fuzzy.

- **PP-14.** The **corpus** is one space-joined haystack: **name + first sentence of `definition` + category label + category gloss + companies + aliases.** (Only the *first* definition sentence — later definition vocabulary is not searched.)
- **PP-15.** Match is a **contiguous** substring: single words hit; in-order sub-phrases hit; **reordered or gapped** word sets do not. `traffic` and `critical traffic` hit `protect critical traffic under overload`; `protect overload` does not.
- **PP-16.** Directional: the **query** must be a substring of the corpus. `drop` matches `dropped`; `dropping` does not match `drop`. And it is character-level, not word-boundary: `shed` matches `shedding`, `art` matches `smart`.
- **PP-17.** Normalization lowercases both sides and collapses non-alphanumerics to a single space, so **hyphens, case, and slashes don't matter** (`priority-based` ≡ `priority based`). **Stop-words are not removed** and there is **no stemming.**
- **PP-18.** Ranking is **binary hit/miss** (a `.filter`, no score); results order by breakdown-frequency then name. A weak match surfaces a pattern identically to a strong one.
- **PP-19.** The **"matches: `<alias>`" line** shows the first alias (array order) that contains the query, **and only when the name did not match.**

**How to choose aliases:**

- **PP-20. Add only new words.** An alias earns its place only if it injects distinctive words **not already in** the name, the first definition sentence, or the category label/gloss. Everything else is dead weight (e.g. `load shedding` is a subset of the name "Priority-Aware Load Shedding" — zero recall, and it never even renders as a match line).
- **PP-21. Write natural plain phrases, not exact query strings.** Substring matching harvests every word and sub-phrase, so a good phrase covers many queries at once. Think like a plain-English searcher describing the *problem* or the *intent* ("protect critical traffic under overload"), not the pattern's name.
- **PP-22. Order most-self-explanatory first** — that phrase is what a reader sees in the "matches:" line.
- **PP-23. Favor distinctive words ≥ 4 characters.** Short tokens cause incidental hits (`art` → `smart`, `out` → `checkout`).
- **PP-24. Precision beats recall.** No alias that points at a genuinely different mechanism, even an adjacent one. (Round 1: `backpressure` was removed — it means *throttle the source*, not *drop by priority*, and would steal traffic from any future flow-control pattern.) When a term is broad enough to belong to several patterns (e.g. `graceful degradation`, `overload protection`, `quality of service`), hold it as an owner-call rather than shipping it, and check whether a dedicated pattern already owns it.
- **PP-25.** Aliases must be **lowercase, unique, non-empty.** Cut padding rather than pad to a count; a rich first definition sentence already covers most plain searches, so most patterns need only a few aliases.

---

## 4. Voice and plain language

Inherits `CORRECTIONS.md` (articles). Pattern pages skew **plainer** — the reader may be meeting the concept cold.

- **PP-26.** Plain words first. Introduce a technical term only after the plain version has landed, and gloss any coined or load-bearing term on first use.
- **PP-27.** Prefer plain cause-and-effect over clever compression, aphorism, or metaphor. Round 1 removals, as a calibration: "everything situational," "bottom of the ladder up," "fair but blind," "classic casualty," "taxonomy," "drift," "motivating." Say the plain thing.
- **PP-28.** Prefer the everyday word: `users` over `tenants`, `keep` over `honor`, `drops` over `sheds` (once "shed" has been glossed).
- **PP-29.** **Spaced hyphens ( - ), never em-dashes ( — )** — in every rendered string, including artifact captions/labels and in-figure text. Non-rendering code comments don't count.
- **PP-30.** Per-sentence ceiling ~40 words (PP band). Say each thing once per depth.

---

## 5. Definition lists (Prose only)

- **PP-31.** Only `definition` supports markdown lists. Syntax: `- ` (unordered) or `N. ` (ordered).
- **PP-32.** A list must be its **own blank-line-separated chunk in which every line is a list item** — intro text ("The pattern needs three things:") goes in the preceding paragraph, not inside the list chunk.
- **PP-33.** **Minimum two items. No nesting.** Do not use `*`, `+`, or `N)` forms.
- **PP-34.** Use a list when the content is genuinely enumerable (a set of requirements, a small set of cases). Keep narrative as prose.

---

## 6. whenItApplies and tradeoffs — bold-lead cards

- **PP-35.** Each entry renders with its **lead clause bolded** — the text before the first colon (or, with no colon, the first sentence). Write each entry as **`<punchy lead clause>: <plain detail>.`** so the bolded part carries the point on its own.
- **PP-36.** Lead clause 4–12 words. Entry 1–2 sentences within the band.
- **PP-37.** Entries must be **distinct and true.** No two `whenItApplies` describing the same situation; no two `tradeoffs` naming the same cost. Cut to the ones the evidence actually supports (typically 4–5 `whenItApplies`, 3–4 `tradeoffs`) rather than padding to a number.
- **PP-38.** `whenItApplies` are *situations where you'd reach for this*; `tradeoffs` are *real costs you accept by using it*. Keep the two from bleeding into each other.

---

## 7. Artifact

- **PP-39.** For an **existing** artifact, the simulation is settled: a readability pass edits **reader-facing strings only** (captions, labels, verdicts) and leaves sim constants and logic byte-identical.
- **PP-40.** Sweep em-dashes in rendered strings (PP-29). Code comments don't render — they may be left as-is.
- **PP-41.** Tokens: structural grays map to the named artifact tokens (`--art-bg` #08090D, `--art-surface` #0F1118, `--art-surface-2` #161922, `--art-border` #1F2333, `--art-text` #C8CDD8, `--art-text-muted` #6B7280); content accents (gold/red/green/bulk) stay as content.
- **PP-42.** Controls explain themselves; state is shown by fill/colour, not by appearing and disappearing; values move perceptibly (ease/smooth, don't snap).
- **PP-43.** `whatToTry` and `teaser` stay **evocative** — an invitation, not an instruction manual. Don't flatten them into steps.
- **PP-44. Parse gate:** the shipped `.jsx` must pass `esbuild` parse + bundle clean before delivery.

---

## 8. Figures

- **PP-45. High bar.** A figure earns its place only if it shows a structure or flow that the prose states less clearly **and** the artifact doesn't already show. **Zero figures is a valid and common outcome.** (Round 1's `priority-tier-ladder` earned it because the two-class artifact never shows the t0–t5 ladder.)
- **PP-46. House light-shell idiom** (matches the article figures): viewBox 700 wide; Inter + JetBrains Mono; muted grays #8A8A94 / #52525B; category colours; rounded rects, stroke-width ~1.3; small font sizes (9–11); eyebrow at top-left.
- **PP-47. Delivery:** a raw `.svg` file, a `figures[]` entry (eyebrow/caption/ariaLabel within the §2 bands), and a `{{figure:slug}}` marker placed at the right spot in the `definition`. Drop all three together if the figure is cut.
- **PP-48.** Verify the SVG renders (rasterize and look) before shipping.

---

## 9. Delivery, validation, and the live-page check

- **PP-49. Round package:** updated JSON (validated) · figure SVG(s) if any · artifact (authored, or readability-passed) · revision-preview HTML · **change summary** (one line per edit + its reason) · **flags list**.
- **PP-50. Revision-preview HTML** — light reading shell with `:root` tokens, a draft banner, and nav; the artifact **mounts the real shipping `.jsx`** via unpkg React 18 + Babel standalone; figures embed as inline URL-encoded data-URI SVGs. Mechanism block order mirrors production: topbar → collapsible "THE IDEA · WHAT TO TRY" → the sim. Derived sections are shown for context and clearly marked "not edited this round." **Revision-only; never live.**
- **PP-51. Validators (all must pass):** JSON well-formed · aliases lowercase/unique/non-empty · category in enum · teaser non-empty when present · **no em-dash in any rendered string** · figure bands in range · **longest sentence ≤ 40 words** · definition list chunks well-formed (≥2 items, `- `/`N. ` only, no nesting).
- **PP-52. Live-page drift check.** Fetch the live pattern page and compare the editable fields to the uploaded JSON. If they differ, flag the drift before editing — don't silently overwrite.

---

## 10. Never guess about the repo

- **PP-53.** For anything about real schema, renderers, search internals, or file structure, **do not reason from docs or samples** — draft a precise lookup question for the implementation agent that owns that code, state plainly what is known versus unknown, and ask for the file(s) if useful. (Round 1 examples: how alias matching works; whether the pattern renderer resolves figure markers.)

---

## Change log

- **v0.1 — 2026-08-21.** Seeded from Round 1 (Priority-Aware Load Shedding). Bands in §2 grounded in what that round shipped. Alias mechanics (§3) captured from the implementation agent. Open for the owner to fix bands and rule on the broad-alias tier.
