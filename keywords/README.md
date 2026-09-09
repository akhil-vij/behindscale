# Search-terms overlay (findability Batch 3, F19)

This directory holds the **authored search terms** that make list search reach
past titles — the field ruling from the Batch 3 Step-1 report. The files here
are the ONLY place authoring touches; the terms are merged into content at
build time by `src/content/index.ts` (Vite `import.meta.glob`), so the 100+
files under `content/` are never hand-edited for search.

## Files and field per content type

| File | Keyed by | Term field | Case rule |
|---|---|---|---|
| `articles.json` | article `slug` | `keywords` | authored case preserved (e.g. `Orpheus`) |
| `patterns.json` | pattern `slug` | `aliases` | **lowercase** (existing `aliases` schema) |
| `walls.json` | `cruxTag` (e.g. `ambiguous-failure-under-retry`) | `keywords` | authored case preserved |

Shape (all three):

```json
{
  "<slug-or-cruxTag>": { "keywords": ["double payment", "at-least-once"] }
}
```

(`patterns.json` uses `"aliases"` instead of `"keywords"`.)

## Rules the loader enforces / expects

- Absent file → empty overlay (the build still succeeds).
- Blank / non-string / duplicate entries are dropped defensively.
- Pattern `aliases` are lowercased and unioned with any the pattern file
  already declares; article/wall `keywords` are unioned with any authored
  in-content.
- Matching (both list pages): case-insensitive, multi-word tokenised, prefix
  match on tokens, no stemming. A hit outside the title/name shows a
  `matched: <kind> <term>` line under the card.

## Tests

`keywords/tests.md` (from the authoring agent) lists `query → expected
results`; it becomes the search unit suite. Until it lands, the minimum bar is
in `src/lib/__tests__/search-content.test.ts`:

- `"Kafka"` on /problems → all articles about Kafka (from `tags` today).
- `"backlog"` on /patterns → ≥2 patterns (needs `patterns.json`; pending).
- `"Orpheus"` → Airbnb (needs `articles.json`; pending).
