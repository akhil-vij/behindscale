// Renders the article's `crux` field as a labeled callout on the
// article page, between `summary` and the artifact teaser
// (architecture.md Article Reading Arc).
//
// Editorial (light) surface -- deliberately NOT the dark artifact
// idiom. Same visual family as ArtifactTeaser (a distinct labeled
// block introducing a small piece of the reading arc), but sits in
// the reading shell where the crux belongs.
//
// The crux is the "is-this-my-problem" scan, placed before the
// reader commits to the Problem section. The artifact context
// block's PROBLEM line compresses this same crux, keeping reader
// and cold-visitor entry points in sync by construction.
//
// Specificity principle (Unit 10 / Taste Doc §3.5): the crux is a
// required Article field; the callout renders unconditionally when
// the article is present. ArticleDetail does not gate it.

interface CruxCalloutProps {
  crux: string
}

export default function CruxCallout({ crux }: CruxCalloutProps) {
  return (
    <aside
      className="mt-8 rounded-xl border border-border-default border-l-4 border-l-accent-primary bg-bg-surface px-5 py-4"
      aria-label="The crux"
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary">
        The crux
      </div>
      <p className="mt-2 leading-relaxed text-text-primary">
        {crux}
      </p>
    </aside>
  )
}
