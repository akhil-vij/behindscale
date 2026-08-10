// A per-article figure — a static SVG diagram placed inline in the
// Problem or Solution prose via a `{{figure:<slug>}}` marker. Added
// in the figures phase (docs/figures-design.md, resolved 2026-08-10).
// Renders as an <img src="/figures/<article-slug>/<slug>.svg"> inside
// a <figure> element with an uppercase mono eyebrow above and a
// plain-English caption below.
//
// Figures are optional (article.figures?: Figure[]), zero-to-many
// per article. Typical count is 0-1-2; hard-error at 6 per article
// (soft-warn at 4) — see figure-count-ceiling validator.
//
// Rendering strategy is <img>, not inline SVG. The reading shell
// carries zero dangerouslySetInnerHTML today, and figures are not
// permitted to change that — the browser's <img>-sandbox is the
// security perimeter for figure SVGs (scripts, foreignObject,
// on* handlers, javascript: URLs are all inert inside an
// <img>-loaded SVG by spec).
//
// - `slug` — kebab-case, unique within the article. Drives both
//   the on-disk path (content/figures/<article>/<slug>.svg) and
//   the public URL (/figures/<article>/<slug>.svg). Referenced by
//   {{figure:<slug>}} markers in the article's problem/solution
//   prose.
// - `eyebrow` — the uppercase mono label rendered above the SVG.
//   2-6 words. Example: "WHERE HODOR RUNS", "THREE SIGNS OF
//   OVERLOAD, ONE CONFIRMATION".
// - `caption` — the plain-English sentence rendered below the
//   SVG. 12-40 words. In the same source-faithful register as
//   `crux` and `problem`.
// - `ariaLabel` — the SVG's role="img" aria-label value for
//   screen readers. 4-20 words. May equal `caption` but is often
//   shorter/tighter.

export interface Figure {
  slug: string
  eyebrow: string
  caption: string
  ariaLabel: string
}
