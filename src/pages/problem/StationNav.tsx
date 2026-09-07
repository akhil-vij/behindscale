import type { ProblemStation } from '../../types'

// The sticky station nav. Budgets come from content (`stations[].minutes`);
// the `· N MIN` span hides on phones via CSS (strings untouched). The
// deck-jump link is a claim about state, so it stays hidden until the
// mission reports its first deck interaction (`touched`); it targets the
// mission iframe's WRAPPER (#artB on the page), since the artifact's own root
// lives inside the sandboxed frame. `current` is the scroll-spy's station id.
interface StationNavProps {
  stations: readonly ProblemStation[]
  current?: string
  // Anchor of the mission wrapper (the deck-jump target); undefined hides it.
  deckAnchor?: string
  deckJumpVisible?: boolean
}

export default function StationNav({
  stations,
  current,
  deckAnchor,
  deckJumpVisible = false,
}: StationNavProps) {
  return (
    <>
      {/* B2-10 (F23): the minute budgets are the mission's time cost; with JS
          off there is no mission to run, so hide them. */}
      <noscript
        dangerouslySetInnerHTML={{ __html: '<style>.ppnav .navmin{display:none}</style>' }}
      />
      <nav className="ppnav" aria-label="Stations on this page">
        {stations.map((s) => (
        <a
          key={s.id}
          href={`#${s.anchor}`}
          className={current === s.id ? 'nav-here' : undefined}
        >
          {s.label}
          {s.minutes !== null && (
            <span className="navmin">
              {' '}
              · {s.minutes}
              {s.openEnded ? '+' : ''} MIN
            </span>
          )}
        </a>
      ))}
      {deckAnchor !== undefined && (
        <a href={`#${deckAnchor}`} id="navdeck" hidden={!deckJumpVisible}>
          ↑ your decisions
        </a>
      )}
      </nav>
    </>
  )
}
