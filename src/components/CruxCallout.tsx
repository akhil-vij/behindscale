import { Link } from 'react-router-dom'

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
// Landing/navigation phase (2026-07-08): the cruxTag now renders as
// a lateral chip at the bottom of the callout, linking to
// /catalog#term-<slug>. This is the article-page's entry into the
// bottleneck taxonomy -- click it and land on the same problem-class
// group other members of the class live in. The @id in JSON-LD's
// `about` and this chip href both target the same DOM anchor on the
// catalog (id="term-<slug>" on the group header).

interface CruxCalloutProps {
  crux: string
  cruxTag: string
  cruxTagLabel: string
}

export default function CruxCallout({
  crux,
  cruxTag,
  cruxTagLabel,
}: CruxCalloutProps) {
  return (
    <aside
      className="mt-8 rounded-xl border border-border-default border-l-4 border-l-accent-primary bg-bg-surface px-5 py-4"
      aria-label="The crux"
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-accent-primary">
        The crux
      </div>
      <p className="mt-2 leading-relaxed text-text-primary">{crux}</p>
      <div className="mt-3">
        <Link
          to={`/catalog#term-${cruxTag}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-base px-2.5 py-1 font-mono text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold"
          />
          {cruxTagLabel}
        </Link>
      </div>
    </aside>
  )
}
