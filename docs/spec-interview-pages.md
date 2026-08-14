# Build spec: interview-question pages (translation layer, v1)

Written against your lookup answers of this round. Where this spec says "mirror
X", the file you quoted is the template. Anything not specified: follow the
existing pattern-page conventions.

## 0. The authorship decision (settled)

**The question file owns the curated slug lists.** Article JSONs gain no new
fields and are not touched by this feature. Rationale: the per-relationship
prose (each evidence one-liner) belongs to the question; evidence order is
editorial; and the article files are review-gated artifacts the marketing layer
must not couple to.

Consequence you flagged: article → question chips need a derived reverse index.
Build it the way `patternStats` is built (src/content/index.ts:100-121), walking
`questions[*].evidence[].article`. Follow-up pointers and the artifact CTA do
**not** feed the reverse index - only `evidence[]` establishes the
"this article answers this question" relationship.

## 1. Content model

New folder `content/interview/`, one flat JSON per question. Schema (add
`src/types/question.ts`, mirror pattern.ts conventions):

```
{
  "slug": string,                     // matches filename
  "question": string,                 // H1, the question as candidates ask it
  "aliases": string[],                // search variants, rendered as "Also asked as"
  "whatTheyreTesting": string,        // Prose format (blank-line-delimited), 1-2 paragraphs
  "cruxTags": string[],               // must exist in content/cruxtags.json
  "patterns": string[],               // must exist in content/patterns/
  "evidence": [                       // ordered; order is editorial, preserve it
    { "article": string,              // must exist in content/articles/
      "adds": string }                // one-liner: what this company's answer adds
  ],
  "answerShape": string[],            // ordered steps for the 45-min answer
  "followUps": [
    { "question": string,
      "pointer": string,              // article slug, must exist
      "answer": string }
  ],
  "artifactCta": { "article": string },  // slug only - teaser and link are DERIVED
  "relatedQuestions": string[]        // question slugs; must exist (no dangling links)
}
```

Derivation rules (no duplicated data):
- Evidence rows render company + source name from `articleBySlug` →
  `article.source`. The "adds" line is the only prose the question file owns
  per row.
- The artifact CTA renders `article.artifact.teaser` from the referenced
  article and links to the article page. If that article has no artifact,
  the validator fails (see §4).
- The "Answered by N companies" eyebrow derives N from distinct
  `article.source.company` values across evidence.

Reference content file: `interview-double-payments.json` (already delivered,
matches this schema; move it to `content/interview/how-do-you-prevent-double-payments.json`
and strip its inline `teaser` - now derived).

## 2. Content indexing - both mechanisms, hard requirement

1. **src/content/index.ts**: add `import.meta.glob('/content/interview/*.json',
   { eager: true })`, export `questions`, `questionBySlug`, and the derived
   `questionsByArticle: Map<articleSlug, questionSlug[]>` (reverse index per §0).
   Replicate the index.json exclusion note if applicable.
2. **scripts/load-content.ts**: add `INTERVIEW_DIR` constant + read/validate
   loop; add `checkQuestion` predicate to `src/types/predicates.ts`; extend
   `ContentSet` in `scripts/types.ts`.

Keep both greppable and in sync per the existing convention.

## 3. Routes and pages

In `src/AppRoutes.tsx`:
```
<Route path="/interview" element={<QuestionIndex />} />
<Route path="/interview/:slug" element={<QuestionDetail />} />
```

**QuestionDetail** (mirror PatternDetail.tsx): `useParams()` →
`questionBySlug.get(slug)`; missing slug renders the inline not-found
(invariant 6, never throw). Sections in order, per the approved preview
(interview-page-preview.html, already delivered - it uses the shell tokens and
is the visual reference):
1. Eyebrow: `INTERVIEW QUESTION · ANSWERED BY N COMPANIES`
2. H1 = `question`
3. "Also asked as:" alias chips (plain, non-link, --font-mono, --bg-subtle)
4. "What they're actually testing" - accent-left-border block, `<Prose>`
5. Pattern chips row - reuse `PatternChip` as-is
6. "How N companies actually did it" - evidence strip; each row: company,
   source name (muted mono eyebrow), the `adds` line, link to the article page
7. "A shape for your answer" - numbered list (order carries meaning)
8. "Follow-ups to expect" - card per follow-up: question (bold), answer,
   pointer link rendered as `→ <article title>` via articleBySlug
9. Dark artifact CTA block (art-* tokens, derived teaser, button to article)
10. "Related questions" links

**QuestionIndex** (v1 minimal): reading-column list of question cards - the
question, first alias or two, "Answered by N companies", link. No search, no
filters, no categories. Resist decorating it; five entries don't need a system.

**Crux links:** anywhere a question page links to its problem class, use
`/catalog#term-<cruxTag>` (the anchor emitted by Catalog.tsx GroupSection).
Do not invent a ?cruxTag= param.

## 4. Validation - new check in scripts/checks/

Add one check (name it per local convention) asserting, for every question file:
- every `evidence[].article`, `followUps[].pointer`, `artifactCta.article`
  resolves to a known article slug
- `artifactCta.article` resolves to an article that HAS an `artifact`
- every `cruxTags[]` entry exists in cruxtags.json; every `patterns[]` entry
  exists in content/patterns/
- every `relatedQuestions[]` entry resolves to a known question slug
- `evidence` has ≥3 entries with ≥3 distinct companies (the library's
  coverage rule for question pages, enforced at build time)

Dangling references fail the build. (Same posture as the JSON-LD @id assertion.)

## 5. Article → question chips (the reverse direction)

New `QuestionChip` component modeled on PatternChip (literal Tailwind class
strings for the scanner). Visually distinct from pattern chips - suggestion:
neutral border + a `Q` glyph or "Answers:" prefix; implementer's choice within
the shell tokens, but a reader must never confuse the two chip species
(pattern chips = solutions vocabulary; question chips = candidate vocabulary).

v1 placement: **article pages only** - a small "This article answers" row on
ArticleDetail, rendered from `questionsByArticle`, placed near the existing
patterns section. Article cards stay untouched in v1 (cards already carry 3
pattern chips; adding a second chip species there needs its own design pass).

## 6. Navigation

Navbar.tsx: third primary link `Interview` →
`const interviewActive = pathname.startsWith('/interview')`, same linkClass
mechanic. Order: Catalog, Patterns, Interview.

## 7. SEO / prerender

In `scripts/prerender.ts`:
- routes table: add the static `/interview` entry + `...questions.map(q =>
  ({ path, outPath, meta: questionMeta(q) }))`
- `questionMeta()`: title = the question verbatim (+ site suffix per existing
  convention); description = `whatTheyreTesting` through `truncateForMeta`;
  canonical; og:type `website`; default og image
- JSON-LD: emit **FAQPage** built from `followUps[]` (they are literally Q&A
  pairs - this is the schema.org type search engines feature) +
  **BreadcrumbList** (Home → Interview → question), mirroring patternMeta's
  structure
- @id contract: if the FAQPage/mentions reference pattern or cruxTag terms,
  reference only the already-emitted DefinedTerm @ids (patterns and
  cruxTagTermId anchors). Extend the build-time assertion (:626-658) so
  question-page references are covered by it.

`scripts/generate-sitemap.ts`: add `/interview` + question URLs.

## 8. Acceptance criteria

1. `npm run build` passes with the sample question file in place.
2. Deleting a referenced article slug from content makes the build FAIL via
   the new check (test this once, then restore).
3. `/interview` lists the question; `/interview/how-do-you-prevent-double-payments`
   renders all ten sections; unknown slug renders inline not-found.
4. The five evidence articles' pages each show the "This article answers" chip,
   and the chip round-trips back to the question page.
5. Prerendered HTML for the question page contains title, description,
   canonical, OG tags, FAQPage + BreadcrumbList JSON-LD; sitemap includes it.
6. Nav shows Interview with correct active state; mobile layout holds
   (evidence strip collapses like the preview's @media rules).

## 9. Explicitly out of scope for v1

- Drill interactions on follow-ups (phase 3; the section's structure already
  anticipates it - don't pre-build it)
- Question chips on article CARDS
- A ?cruxTag= catalog filter
- Index-page search/filtering
- The remaining four question JSONs (content, not code - they follow
  separately and must pass the §4 check when added)
