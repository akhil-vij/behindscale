// Unit 10. Dark card in the artifact's visual language, rendered
// between the article summary and the Problem section. Anchor-links
// to the artifact embed (`id="artifact"` on the wrapper).
//
// Specificity principle (architecture.md Article Reading Arc):
// renders only when teaser is present. A vague hook is worse than
// none; ArticleDetail does the conditional, never this component.

interface ArtifactTeaserProps {
  teaser: string
}

export default function ArtifactTeaser({ teaser }: ArtifactTeaserProps) {
  return (
    <a
      href="#artifact"
      className="mt-8 block rounded-xl border border-art-border border-l-4 border-l-accent-primary bg-art-bg px-5 py-4 transition-colors hover:bg-art-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <div className="font-mono text-xs uppercase tracking-widest text-accent-primary">
        Interactive
      </div>
      <p className="mt-2 font-mono text-sm leading-relaxed text-art-text">
        {teaser}
      </p>
      <div className="mt-3 font-mono text-xs text-art-text-muted">
        Open the visualization ↓
      </div>
    </a>
  )
}
