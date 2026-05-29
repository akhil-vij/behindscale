// Splits a paragraph-separated plain-text string on blank lines and
// renders each chunk as a <p>. This is the rendering contract for
// Article.problem, Article.solution, and PatternDefinition.definition
// per architecture.md's Content Contract -- those fields are NOT
// markdown today. Markdown rendering is deferred to Unit 7+ (when real
// Claude output arrives); at that point this component swaps for a
// real markdown renderer and consumers stay unchanged.

interface ProseProps {
  children: string
}

export default function Prose({ children }: ProseProps) {
  const paragraphs = children.split(/\n{2,}/).filter((p) => p.trim().length > 0)
  return (
    <div className="mt-4 flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed text-text-secondary">
          {p}
        </p>
      ))}
    </div>
  )
}
