import type { KeyboardEvent, MouseEvent } from 'react'
import type { ProblemDecide, ProblemInterview, ProblemSteal } from '../../types'
import { pp } from './inline'
import type { YouState } from './youState'

// "Which answer is yours": constraint -> article rows, then the other-places
// note. A row with `highlights` is selectable (click, or Enter / Space on the
// focused row): it lights its column(s) in the at-a-glance table above --
// see useDecideHighlight. Links inside the row keep navigating.
export function DecideSection({
  decide,
  activeRow = null,
  onSelect,
}: {
  decide: ProblemDecide
  activeRow?: number | null
  onSelect?: (row: number) => void
}) {
  return (
    <section>
      <h2 className="pp-h2" id="decide">
        Which answer is yours
      </h2>
      <p className="pp-p">{pp(decide.intro)}</p>
      <div className="decide">
        {decide.rows.map((row, i) => {
          const selectable = row.highlights !== undefined && onSelect !== undefined
          const onClick = (e: MouseEvent<HTMLDivElement>) => {
            if ((e.target as HTMLElement).closest('a')) return
            onSelect?.(i)
          }
          const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.target !== e.currentTarget) return
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            onSelect?.(i)
          }
          return (
            <div
              key={i}
              className={selectable ? 'drow cursor-pointer' : 'drow'}
              role={selectable ? 'button' : undefined}
              tabIndex={selectable ? 0 : undefined}
              aria-pressed={selectable ? activeRow === i : undefined}
              data-highlights={row.highlights?.join('|')}
              onClick={selectable ? onClick : undefined}
              onKeyDown={selectable ? onKeyDown : undefined}
            >
              <div className="if">{pp(row.if)}</div>
              <div className="then">{pp(row.then)}</div>
            </div>
          )
        })}
      </div>
      {decide.elsewhere !== undefined && (
        <>
          <h3 className="pp-h3">{decide.elsewhere.title}</h3>
          <p className="pp-p">{pp(decide.elsewhere.text)}</p>
        </>
      )}
    </section>
  )
}

// "What to steal": the numbered rules, each pointing at its question.
export function StealSection({ steal }: { steal: ProblemSteal }) {
  return (
    <section>
      <h2 className="pp-h2" id="steal">
        What to steal
      </h2>
      <p className="pp-p">{pp(steal.intro)}</p>
      <ol className="steal">
        {steal.items.map((item, i) => (
          <li key={i}>
            <strong className="font-semibold text-text-primary">{pp(item.rule)}</strong>{' '}
            {pp(item.text)}
            {item.qref !== undefined && (
              <>
                {' '}
                <a href={`#${item.qref}`} className="pp-link">
                  {item.qref.toUpperCase()}
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

// "If this comes up in an interview": five parts; the follow-ups table's
// "What held" column carries a live tick per attack from the host's state.
export function InterviewSection({
  interview,
  you,
}: {
  interview: ProblemInterview
  you: YouState
}) {
  return (
    <section>
      <h2 className="pp-h2" id="interview">
        If this comes up in an interview
      </h2>
      <h3 className="pp-h3">The question, as asked</h3>
      <ul className="iv-list">
        {interview.asks.map((ask, i) => (
          <li key={i}>{ask}</li>
        ))}
      </ul>
      <h3 className="pp-h3">The 90-second shape</h3>
      <p className="pp-p">{pp(interview.shape)}</p>
      <h3 className="pp-h3">The follow-ups are the attacks</h3>
      <p className="pp-p">{pp(interview.followupsIntro)}</p>
      <div
        className="matrix-wrap"
        tabIndex={0}
        role="group"
        aria-label="Interview follow-ups — scrollable table"
      >
        <table className="matrix interview">
          <thead>
            <tr>
              <th scope="col" className="dim">
                The interviewer asks
              </th>
              <th scope="col">Attack</th>
              <th scope="col">What held</th>
            </tr>
          </thead>
          <tbody>
            {interview.followups.map((f, i) => (
              <tr key={i}>
                <td>{f.ask}</td>
                <td>{f.attack}</td>
                <td>
                  <Tick index={i} you={you} /> {pp(f.held)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="pp-h3">Senior vs Staff</h3>
      <p className="pp-p">
        Senior: {interview.senior}
        <br />
        Staff: {interview.staff}
        <br />
        {pp(interview.closing)}
      </p>
      <h3 className="pp-h3">Answers that sound right</h3>
      <ul className="iv-list">
        {interview.redFlags.map((flag, i) => (
          <li key={i}>{pp(flag)}</li>
        ))}
      </ul>
    </section>
  )
}

// Pre-day: "—" (muted, with the title). After a survived day: ✓ (green) for
// a held attack, "not yet" (muted) otherwise. Strings are the reference
// build's host script, verbatim.
function Tick({ index, you }: { index: number; you: YouState }) {
  const id = `you-iv-${index + 1}`
  if (!you.filled) {
    return (
      <span id={id} className="nstext" title="runs after a survived day">
        —
      </span>
    )
  }
  if (you.held[index]) {
    return (
      <span id={id} className="tick-held">
        ✓
      </span>
    )
  }
  return (
    <span id={id} className="nstext">
      not yet
    </span>
  )
}
