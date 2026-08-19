# behindscale — Pattern (and beyond) Artifacts: Technical Design

Status: **APPROVED** (owner review 2026-08-19) — technical body of the
nav-IA **v1.3** schema-addition amendment. Ratifications + two corrections
folded below; recorded in `docs/nav-ia-decisions.md` sanctioned-additions
ledger.
Supersedes nothing. Extends: `docs/figures-design.md` (§8 figure hosts),
`docs/problem-page-design.md`.

---

## 0. Summary

**Ratified 2026-08-19** (see §11): collision handling **Approach A** (flat
namespace + global `artifact-slug-unique` guard); artifact section mounts
**above Definition** (the pattern-detail redesign ruling, not §7.2's
current-order reasoning); `ArtifactEmbed` props renamed to
`hostSlug/hostTitle` now; first build ships **patterns + the generalized
`ContentHost` registry only**. Two corrections landed: the `_hero`
reconciliation (§1.2) and the `question` host kind (§5).

Figures already render on pattern pages (host-agnostic, shipped
2026-08-16). **Interactive artifacts do not.** This document designs
artifact support for pattern detail pages, and — because the same
question is coming for category and company detail pages — converges
figures + artifacts onto a **single "content host" abstraction** so that
onboarding a new host kind is one registration, not a new subsystem.

Two things need owner ratification before code (§4, §11):

1. **Collision handling** — flat shared namespace + global guard
   (Approach A) vs. host-kind-namespaced subdirectories (Approach B).
   Both are specified in full in §4.
2. **Placement** on the pattern page (§7.2).

Everything else follows the figures precedent mechanically.

---

## 1. Current artifact architecture (what the design must fit)

### 1.1 The contract today

Each interactive artifact is a single JSX source compiled to a
self-contained bundle and served in a sandboxed iframe:

```
content/artifacts/<slug>.jsx                 (source, hand-authored)
   ── scripts/compile-artifacts.ts ──▶
public/artifacts/<slug>/index.html           (compiled shell)
public/artifacts/<slug>/index.js             (compiled bundle, own React copy)
   ── served at ──▶
/artifacts/<slug>/index.html                 (iframe src, opaque origin)
```

- **Keying is by bare `<slug>`** in one flat directory. There is no host
  kind in the path today.
- **The compile step is already host-agnostic** — `compile-artifacts.ts`
  walks `content/artifacts/*.jsx` by filename and emits one bundle per
  file. It does not know or care whether a slug belongs to an article.
  Per-artifact esbuild failure → stderr log + skip + clean partial output
  + continue (invariant 2); other artifacts and the build are unaffected.
- **`ArtifactEmbed` is already generic.** `src/components/ArtifactEmbed.tsx`
  takes `{ artifactPath, articleSlug, articleTitle }` — three strings. The
  `article*` prop names are historical; nothing in the component is
  article-specific. It does a HEAD probe, renders the iframe
  (`sandbox="allow-scripts"`), shows one muted error frame on either
  failure mode, and fires `artifact_viewed` / `artifact_interacted`.
- **The only article-coupled piece** is the validator check
  `scripts/checks/artifact-path-matches-slug.ts`, which iterates
  `content.articles` and asserts
  `article.artifact.path === "/artifacts/" + article.slug + "/index.html"`.

### 1.2 The `_hero` precedent — a non-article host already exists

`content/artifacts/_hero.jsx` → `/artifacts/_hero/index.html` is a
**site-level artifact bound to no article**, rendered by `Landing.tsx`
(`HERO_IFRAME_PATH`). It follows the underscore-prefix convention and is
exempt from the standalone context-block law. This is the existence proof
that the artifact system is not intrinsically article-scoped — the
generalization in this doc formalizes what `_hero` already does ad hoc.

**Correction (owner ruling 2026-08-19) — `_hero` reconciliation.** The
accepted pattern-detail design gives the hero a real production home: it
is the **Priority-Aware Load Shedding (PALS) pattern page's** artifact,
and the landing embeds the *same bundle* (one source, two mounts). So
`_hero` is not a permanent site artifact — it is the first pattern
artifact, mid-migration:

- The first pattern artifact **is** the hero port:
  `content/artifacts/priority-aware-load-shedding.jsx` (sim logic
  verbatim, with the token-alignment pass applied per the accepted
  handoff's corrected targets).
- PALS's registry entry declares
  `/artifacts/priority-aware-load-shedding/index.html`.
- `Landing.tsx`'s `HERO_IFRAME_PATH` switches to that path in the isolated
  follow-up commit already planned in the page-rebuild prompt; `_hero`
  then retires with a 301 from its old served path.
- The underscore site-artifact convention **remains valid** for future
  genuine site artifacts — it simply loses its only current member.

This is **page-rebuild sequence work, not the foundations commit** — the
foundations commit ships the registry + schema + validators + prop rename
with zero pattern artifacts authored. The inventory math (§1.3) is
therefore recorded as `42 = 41 + 1` today, becoming
`42 = 41 + 1-migrating-to-pattern` as the port lands.

### 1.3 Full current inventory (slugs + filesystem paths)

**Path convention (holds for every row below):**

| Role | Path |
|---|---|
| Source | `content/artifacts/<slug>.jsx` |
| Compiled shell | `public/artifacts/<slug>/index.html` |
| Compiled bundle | `public/artifacts/<slug>/index.js` |
| Served URL | `/artifacts/<slug>/index.html` |

**42 artifacts on disk = 41 article artifacts + 1 site artifact.** Source
`.jsx` count (42) equals compiled dir count (42); the 41 non-hero slugs
map 1:1 to an article whose `artifact.path` points back at them.

**Site artifact (1) — host kind `site`, no declaring content entity:**
- `_hero` — **migrating to a pattern artifact** per §1.2's ruling:
  becomes `content/artifacts/priority-aware-load-shedding.jsx` (PALS
  pattern page's artifact; landing re-embeds the same bundle). The math
  above becomes `42 = 41 + 1-migrating-to-pattern` once the port lands in
  the page-rebuild sequence.

**Article artifacts (41) — host kind `article`, each declared by
`content/articles/<slug>.json`'s `artifact.path`:**

```
airbnb-monitoring-reliably-at-scale      airbnb-orpheus-idempotent-payments
airbnb-partitioning-main-database         aws-idempotent-apis
aws-load-shedding                         aws-shuffle-sharding
aws-timeouts-retries-backoff-jitter       canva-media-dynamodb
cloudflare-byzantine-failure              datadog-incident-response-observer-fate
discord-trillions-message-search          doordash-aperture-global-failure-mitigation
doordash-rabbitmq-kafka                   figma-postgres-sharding
github-partitioning-relational-databases  gitlab-database-decomposition
google-colossus                           google-colossus-ssd-placement
linkedin-hodor-overload-protection        meta-foqs-priority-queue
meta-silent-data-corruption               netflix-conductor-microservices-orchestrator
netflix-prioritized-load-shedding         notion-sharding-postgres
pinterest-sharding-mysql                  reddit-piday-outage
roblox-return-to-service                  segment-centrifuge-database-queue
segment-exactly-once-delivery             shopify-pods-architecture
shopify-resilient-payments                skipper-workflow-engine
slack-cellular-architecture               slack-incident-2-22-22
slack-scaling-job-queue                   slack-vitess-datastores
stripe-idempotency                        stripe-rate-limiters
uber-cadence-workflow-platform            uber-intelligent-load-management
uber-kafka-consumer-proxy
```

**Observation that matters for §4:** every existing slug is a *compound*
token (`company-topic`). None is a bare word. Company detail pages, by
contrast, will want bare slugs (`stripe`, `uber`) — which is exactly where
collision risk concentrates.

### 1.4 The figures precedent (what we are converging onto)

Figures made this exact jump article → pattern on 2026-08-16
(`figures-design.md` §8). The shape:

- A **figure host** = any entity carrying inline figures. `figureHosts(content)`
  in `scripts/figure-hosts.ts` yields `{ slug, kind, figures, markerFields,
  forbiddenFields, ref }` for every article and pattern.
- Storage stays **flat and host-agnostic**:
  `content/figures/<host-slug>/<fig-slug>.svg → /figures/<host-slug>/<fig-slug>.svg`.
- A build-time guard (`figure-svg-exists`) already **errors if an article
  and a pattern share a slug while both declare figures** — i.e. the
  flat-namespace collision guard (Approach A) is *already the shipped
  policy for figures*.

Artifacts should not invent a second, divergent host model. They should
join the same one.

---

## 2. The convergence — one "content host", two capabilities

Define a single host descriptor that both features read, capability-gated:

```ts
// scripts/content-hosts.ts  (generalizes scripts/figure-hosts.ts)

export type HostKind = 'article' | 'pattern' | 'problem' | 'category' | 'company' | 'site'

export interface ContentHost {
  readonly slug: string
  readonly kind: HostKind
  // CheckError locator, spread into pushed errors:
  readonly ref:
    | { articleSlug: string } | { patternSlug: string }
    | { problemSlug: string } | { categorySlug: string }
    | { companySlug: string } | { siteSlug: string }

  // ── Figure capability (undefined ⇒ host carries no figures) ──
  readonly figures?: readonly Figure[]
  readonly markerFields?: ReadonlyArray<readonly [string, string]>   // where {{figure:…}} is ALLOWED
  readonly forbiddenFields?: ReadonlyArray<readonly [string, string]> // where it is FORBIDDEN

  // ── Artifact capability (undefined ⇒ host carries no artifact) ──
  readonly artifact?: { path: string; teaser?: string } | null
}

export function contentHosts(content: ContentSet): ContentHost[] { /* one place */ }

// Capability views — the only thing validators/loaders consume:
export const figureHosts   = (c: ContentSet) => contentHosts(c).filter(h => h.figures !== undefined)
export const artifactHosts = (c: ContentSet) => contentHosts(c).filter(h => h.artifact !== undefined)
```

**Why this shape:**

- **Additive, not a rewrite.** `figureHosts()` keeps its exact current
  signature and callers (eight figure validators, the SVG loader,
  `copy-figures`). It just becomes a filtered view over `contentHosts()`.
- **Adding a host kind is one edit.** Category/company pages join by adding
  a branch in `contentHosts()` that sets whichever capabilities they
  carry. No check, loader, or component changes.
- **Capabilities are independent.** A host can carry figures, an artifact,
  both, or neither. Patterns get both (figures already; artifact via this
  doc). Categories/companies opt in per capability when they arrive.

---

## 3. Proposed schema — patterns gain one optional field

Mirror `Article.artifact` exactly; change nothing on `Article`.

```ts
// src/types/pattern.ts
export interface PatternDefinition {
  // …existing fields (slug, name, category, definition, whenItApplies,
  //  tradeoffs, figures?)…

  // Optional interactive artifact, same contract as Article.artifact.
  // path === "/artifacts/" + slug + "/index.html" when present.
  // Absent/omitted ⇒ no artifact section renders. See
  // docs/pattern-artifacts-design.md.
  artifact?: { path: string; teaser?: string } | null
}
```

- **Optional, defaults to none.** Consistent with progressive authoring —
  a pattern renders fully without an artifact; authoring one is a later,
  additive act (same philosophy as problem-essay authoring).
- **Predicate:** a shared `checkArtifactShape(value)` (extracted, used by
  both `checkArticle` and `checkPatternDefinition`) validates `path` is a
  string and — the ratified rule — **`teaser` is validated non-empty only
  when present** (optional; a present-yet-empty hook is worse than none).
  This supersedes the unconditional "teaser non-empty" line in the
  page-rebuild prompt.
- **Source `.jsx`** lives at `content/artifacts/<pattern-slug>.jsx` under
  the flat convention (Approach A, ratified).

---

## 4. Collision handling — BOTH approaches (owner decision)

The tension: `public/artifacts/<slug>/` (and `content/figures/<slug>/`)
is a **single flat namespace shared by all host kinds**. As hosts multiply
(article, pattern, category, company), two different entities could want
the same slug.

### Approach A — Flat shared namespace + global uniqueness guard

Keep the current flat layout. Add a build-time check asserting slug
uniqueness **across every artifact-bearing host kind** (and the analogous
guard already exists for figures).

```
content/artifacts/<slug>.jsx        →  /artifacts/<slug>/index.html
```
Guard: `artifact-slug-unique` — if two hosts of any kind declare an
artifact with the same slug, hard-error at build with both locators.

| | |
|---|---|
| **Pros** | Zero change to `compile-artifacts.ts`, `ArtifactEmbed`, URL scheme, or the 41 existing artifacts. **Symmetric with the shipped figures model** (`figure-svg-exists` already does exactly this). Shortest URLs. One-line `expectedPath(slug)` helper stays. |
| **Cons** | A real slug clash forces a *rename* of otherwise-valid content. The uniqueness invariant spans namespaces that are otherwise independent. Risk concentrates on **company** hosts (bare tokens like `stripe`), though today's corpus is collision-free because all 41 slugs are compound (`company-topic`). |
| **Guard cost** | ~15 lines; iterate `artifactHosts()`, group by slug, error on any group size > 1. Extends automatically to future host kinds because it reads the host registry, not a per-kind list. |

### Approach B — Host-kind-namespaced subdirectories

Give each host kind its own subtree; collisions become structurally
impossible.

```
content/artifacts/<kind>/<slug>.jsx  →  /artifacts/<kind>/<slug>/index.html
  e.g. content/artifacts/patterns/circuit-breaker.jsx
         → /artifacts/patterns/circuit-breaker/index.html
       content/artifacts/companies/stripe.jsx
         → /artifacts/companies/stripe/index.html
```

Two sub-variants for the 41 existing article artifacts:

- **B1 (grandfather):** articles stay flat at `/artifacts/<slug>/`; only
  *new* host kinds are namespaced. Permanent asymmetry, but zero migration.
- **B2 (migrate):** move articles to `/artifacts/articles/<slug>/`. Uniform,
  but touches 41 `public/artifacts/` dirs, 41 `article.artifact.path`
  values, and needs `vercel.json` 301s from the old paths.

| | |
|---|---|
| **Pros** | Collisions impossible by construction; no global guard needed. Self-documenting URLs. Scales to N host kinds with no shared-namespace reasoning. |
| **Cons** | `compile-artifacts.ts` must walk subdirs (or a manifest) and preserve `<kind>/` in output. `ArtifactEmbed` path convention + `expectedPath` become kind-aware. **B1** creates permanent article/other asymmetry; **B2** is a real migration (41 dirs + 41 JSONs + redirects). Figures would want the same treatment for consistency, doubling the migration. |

### Recommendation

**Approach A (flat + global guard) as the converged choice, with B
documented as the escape hatch.** Rationale:

1. **Symmetry beats theoretical purity here.** Figures already shipped on
   A. Choosing B for artifacts splits the two capabilities onto different
   namespacing models — the opposite of the convergence this doc exists to
   create.
2. **The collision risk is low and made loud.** Today's 41 slugs are all
   compound and clash-free; company bare-slugs are the only real risk, and
   even `stripe` / `uber` are free against the current corpus. The guard
   turns any future clash into a build-time error with both locators, not a
   silent mis-serve.
3. **Escape hatch is real.** If we ever onboard a host kind whose slugs
   genuinely crowd the namespace (companies are the trigger to re-evaluate),
   we migrate to B2 then — the host registry (§2) already carries `kind`,
   so the path derivation is the *only* thing that changes, in one place
   (`expectedPath`). Adopting A now does not foreclose B later.

Owner ratifies A or B (and if B, B1 vs B2) in §11.

---

## 5. Extensibility — categories and companies as future hosts

The whole point of §2's registry: future hosts plug in without touching
checks, loaders, or components. Illustrative registrations (not built now):

| Host kind | Slug source | Figures? | Artifact? | `ref` locator |
|---|---|---|---|---|
| `article` | article slug | ✓ (shipped) | ✓ (shipped) | `{ articleSlug }` |
| `pattern` | pattern slug | ✓ (shipped) | ✓ (**this doc**) | `{ patternSlug }` |
| `problem` | cruxTag → urlSlug | future | future | `{ problemSlug }` |
| `category` | category id (`resilience`, …) | future | future | `{ categorySlug }` |
| `company`  | company slug (`stripe`, …) | future | future | `{ companySlug }` |
| `question` | interview question slug | future | future | `{ questionSlug }` |

Each future host, when it wants a capability:

1. Add a branch in `contentHosts()` setting `figures` and/or `artifact`
   (+ marker/forbidden fields for figures).
2. Add the `.jsx` (artifacts) or `.svg` files (figures) under the chosen
   namespace convention from §4.
3. Render `<ArtifactEmbed>` / pass `slug`+`figures` to `Prose` on that
   page. Both components are already generic.

No new validator, no new loader, no new compile path. **This is the
extensibility the design buys**: the artifact/figure machinery is written
once against `ContentHost`, and host kinds are data.

Two cross-cutting notes for future hosts:

- **`ArtifactEmbed` prop rename — DONE** (ratified, shipped in the
  foundations commit). `articleSlug → hostSlug`, `articleTitle →
  hostTitle`; analytics payload keeps `{ slug }`. Removes the last
  article-shaped naming so category/company/question pages read naturally.
- **`question` is a plausible early figure host.** Interview question
  pages (`docs/spec-interview-pages.md`) are heavy authored content where a
  figure — an answer-shape diagram, a follow-up's failure sketch — is a
  natural first capability. Its slugs are compound (`company-topic`-style
  interview slugs), so collision surface is low. Registers when it wants a
  capability; nothing built now.
- **Category slugs are English words** (`resilience`, `performance`) and
  **company slugs are bare tokens** (`stripe`) — both higher collision
  surface than compound article/pattern slugs. This is the concrete reason
  §4's guard (Approach A) or namespacing (Approach B) must be settled
  before, not after, those hosts land.

---

## 6. Validator changes — all four SHIPPED (foundations commit)

1. **Generalized `artifact-path-matches-slug`.** Iterates
   `artifactHosts(content)` instead of `content.articles`; asserts
   `host.artifact.path === expectedPath(host.slug)`. Under Approach A
   `expectedPath` is `/artifacts/<slug>/index.html` — the single point of
   change if we ever migrate to B's `/artifacts/<kind>/<slug>/`. Error
   wording uses `host.kind` + `host.ref`.
2. **`artifact-slug-unique`** (Approach A guard): groups `artifactHosts()`
   by served slug; hard-errors on any collision across host kinds, printing
   every locator. Reads the host registry, so future kinds are covered.
3. **`artifact-bundle-exists`** (the binding v1.3 validator requirement):
   for every host with a non-null artifact, asserts the **source**
   `content/artifacts/<slug>.jsx` exists. It checks the *source*, not the
   compiled bundle, because `validate` runs **before** `compile-artifacts`
   in the build pipeline — a missing-source artifact must fail at the build
   boundary, not as a blank error frame at read time. The loader pre-scans
   the artifacts dir into `content.artifactSourceSlugs` so the check does no
   IO. The artifact analogue of `figure-svg-exists`.
4. **`orphan-artifacts` (soft warn):** a `.jsx` with no declaring host
   compiles to dead output; flagged as a `warning` (never blocks). The
   `_`-prefixed **site-artifact convention is exempt** — note (per §1.2)
   that its only current member `_hero` is scheduled to retire once its
   bundle ports to the PALS pattern page; the convention stays valid for
   future genuine site artifacts.

All four read the host registry, so they cover category/company/question
hosts for free the day those register.

---

## 7. Rendering & placement

### 7.1 Component

`PatternDetail.tsx` renders the artifact when present, reusing the generic
component:

```tsx
{pattern.artifact && (
  <Section title="Interactive">
    {pattern.artifact.teaser && (
      <p className="mt-4 leading-relaxed text-text-secondary">
        {pattern.artifact.teaser}
      </p>
    )}
    <div className="mt-4">
      <ArtifactEmbed
        artifactPath={pattern.artifact.path}
        hostSlug={pattern.slug}
        hostTitle={pattern.name}
      />
    </div>
  </Section>
)}
```

Failure isolation (invariant 2) is inherited unchanged from `ArtifactEmbed`
— a broken pattern artifact shows the muted error frame; the rest of the
page reads normally.

### 7.2 Placement — RULED: above Definition (2026-08-19)

**This was already ruled by the accepted pattern-detail redesign (review
2026-08-18), which supersedes the current-section-order reasoning below.**
The mechanism/artifact section mounts **ABOVE the definition, directly
under the header** — show-then-tell. The deciding argument: 40+
artifact-less pages must not read as the top half of something missing, so
the interactive slot leads and the prose follows. If artifact support
lands before the full page rebuild, the section still mounts **above
Definition** so the rebuild never has to move it.

The three options originally surfaced (kept for provenance; **P1/P2 are
both superseded** by the above-Definition ruling, **P3's rejection
stands**):

- ~~**(P1)** Immediately after Definition~~ — superseded; the redesign
  places it *above* Definition, not after.
- ~~**(P2)** After Tradeoffs, before Seen in~~ — superseded.
- **(P3)** Inline via a `{{artifact}}` marker in `definition`. **Rejected
  (stands):** artifacts are one-per-host and heavy; a marker adds parser
  surface for no authoring benefit. Revisit only if a host ever needs
  multiple artifacts interleaved with prose.

> Note: §7.1's sketch wraps the embed in a `<Section title="Interactive">`
> reflecting the old after-Definition placement. The page rebuild
> (`prompt-pattern-detail-build.md`) owns the actual above-header mount and
> its section chrome; this doc's foundations scope does **not** render the
> artifact on `PatternDetail` (that is page-rebuild work).

### 7.3 Teaser

Reuse `ArtifactTeaser` semantics if desired, or the inline `teaser`
paragraph above. Patterns have no `summary` field, so there's no
summary/teaser adjacency to preserve — the inline paragraph is simplest.

---

## 8. SSG / prerender & redirects

- **Compile:** no change under Approach A — `compile-artifacts.ts` already
  walks every `content/artifacts/*.jsx` and will pick up
  `<pattern-slug>.jsx` automatically. Under Approach B it must walk
  subdirs and preserve `<kind>/`.
- **308 redirect** `/artifacts/<slug>/index.html → /artifacts/<slug>`
  (existing behavior) applies identically to pattern-slug artifacts.
- **Prerender:** `PatternDetail` is already a prerendered route; the added
  `<ArtifactEmbed>` is client-hydrated (iframe + `useEffect`), SSR-safe
  (it never touches `window` during render), so no new prerender wiring.
  If a JSON-LD or sitemap layer enumerates artifacts per host, extend it to
  read `artifactHosts()`.
- **Static-by-construction:** unchanged. The artifact bundle is built
  ahead of time and served from `public/`; the pattern page does no runtime
  fetch beyond the same-origin HEAD probe `ArtifactEmbed` already performs.

---

## 9. Authoring workflow (pattern artifact, Approach A)

1. Author `content/artifacts/<pattern-slug>.jsx` (self-contained, own React
   copy, standalone context block — same rules as article artifacts).
2. Add to `content/patterns/<pattern-slug>.json`:
   ```json
   "artifact": { "path": "/artifacts/<pattern-slug>/index.html", "teaser": "…" }
   ```
3. `npm run build` — compiles the bundle, runs the validator (path match,
   uniqueness, bundle-exists), prerenders the page.
4. Verify the artifact renders in the new **Interactive** section and the
   error frame appears if you rename the `.jsx` away (fault isolation).

Absent an `artifact` field, the pattern page renders exactly as today —
authoring is purely additive.

---

## 10. Non-goals

- **No multiple artifacts per host.** One optional artifact per host, like
  articles. (§7.2 P3 marker path is explicitly deferred.)
- **No widening the sandbox.** Stays `sandbox="allow-scripts"`, opaque
  origin, postMessage-only capability. New host kinds inherit this verbatim.
- **No migration of the 41 article artifacts** unless the owner picks
  Approach B2.
- **No auto-generated artifacts.** Artifacts are hand-authored JSX; nothing
  here changes that.
- **No figures→artifacts coupling.** A host may carry either, both, or
  neither; the two capabilities are independent (§2).

---

## 11. Ratifications (owner review 2026-08-19 — all resolved)

1. **Collision handling (§4): Approach A** — flat namespace + global
   `artifact-slug-unique` guard. Reason accepted: figures already shipped
   on exactly this model; splitting the two capabilities across different
   namespacing schemes would defeat the convergence. The escape hatch is
   accepted as real (`expectedPath` is the single point of change;
   **companies** are the named trigger to re-evaluate). The guard ships
   with the feature.
2. **Placement (§7.2): above Definition** — neither P1 nor P2. This was
   already ruled by the accepted pattern-detail redesign (show-then-tell,
   so 40+ artifact-less pages don't read as a missing top half). If
   artifact support lands before the full rebuild, the section still mounts
   above Definition so the rebuild never moves it. P3's rejection stands.
3. **`ArtifactEmbed` prop rename (§5): now** — `hostSlug/hostTitle`,
   analytics payload unchanged. Shipped in the foundations commit.
4. **Scope of first build: patterns + the generalized registry only.**
   `category`/`company`/`question` join as documented registrations
   (§5 table) when their pages are built.

**Corrections folded:** (1) the `_hero` reconciliation — first pattern
artifact is the PALS hero port, `_hero` retires in the page-rebuild
sequence (§1.2/§1.3); (2) the `question` host kind added to §5.

---

## 12. Sequencing (ratified)

1. **Foundations commit (this work, green):** `ContentHost` registry
   (`scripts/content-hosts.ts`, generalizing the old `figure-hosts.ts`) +
   `Pattern.artifact` schema + shared `checkArtifactShape` predicate + four
   artifact validators + loader `artifactSourceSlugs` scan +
   `ArtifactEmbed` prop rename. Ships with **zero pattern artifacts
   authored**; all checks pass vacuously over the current 41 article
   artifacts. **Does not render the artifact on `PatternDetail`.**
2. **Page rebuild (`prompt-pattern-detail-build.md`):** consumes the
   foundations; its §1–2 are satisfied by this work plus the `_hero`
   ruling. Owns the above-header mount, the PALS hero port
   (`content/artifacts/priority-aware-load-shedding.jsx`), the
   `HERO_IFRAME_PATH` switch, and the `_hero` retirement redirect. Same
   no-interleaving rule as always.
