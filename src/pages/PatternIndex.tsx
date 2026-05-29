import { patterns } from '../content'
import PatternCard from '../components/PatternCard'

export default function PatternIndex() {
  return (
    <main className="max-w-[1080px] mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        Patterns
      </h1>
      {patterns.length === 0 ? (
        <p className="mt-6 text-text-secondary">No patterns yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {patterns.map((pattern) => (
            <PatternCard key={pattern.slug} pattern={pattern} />
          ))}
        </div>
      )}
    </main>
  )
}
