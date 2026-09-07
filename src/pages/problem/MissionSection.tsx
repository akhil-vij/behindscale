import type { ProblemMission, ProblemMissionOutline } from '../../types'
import ArtifactEmbed from '../../components/ArtifactEmbed'
import { pp } from './inline'

// "Build the defense": the intro (with the decisions sentence the shell
// composes at the `{{decisions}}` marker), the static "What's inside the
// mission" outline card, the mission artifact in a 960px breakout (bare --
// the mission draws its own #artB frame), then the page-flow stop block and
// the "stuck?" note. The wrapper carries id="artB" so the station nav and
// the deck-jump can target the frame from the page.
//
// The outline card and the frame's <noscript> carry the same content
// (`mission.outline`): the decisions, the day's events and the attacks
// otherwise live only inside the sandboxed frame, invisible to a no-JS or
// indexed read of the page (2026-09-06 follow-up). Headings and the closing
// line are shell copy with the counts filled from the outline, so a second
// wall gets the same structure by filling the fields.
interface MissionSectionProps {
  mission: ProblemMission
  hostSlug: string
  hostTitle: string
  wrapperId: string
  // Number of compared systems, for the closing line ("the sixth column");
  // undefined when the page has no comparison table.
  comparisonColumns?: number
  // Host-side embed control (undefined until the host hook mounts).
  height?: string
  onMessage?: (data: unknown, reply: (message: unknown) => void) => void
}

const DEFAULT_MISSION_HEIGHT = '900px'
const DECISIONS_MARKER = '{{decisions}}'
// B2-10 (F23): with JS off, the "What's inside the mission" outline card above
// the frame already lists the decisions/events/attacks, so the frame's no-JS
// block drops the duplicate lists and just points back at that card.
const OUTLINE_NOSCRIPT_POINTER =
  `<p>See "What's inside the mission" above for the decisions, the day's events, and the attacks.</p>`

export default function MissionSection({
  mission,
  hostSlug,
  hostTitle,
  wrapperId,
  comparisonColumns,
  height,
  onMessage,
}: MissionSectionProps) {
  const outline = mission.outline
  return (
    <section>
      <h2 className="pp-h2">{mission.title}</h2>
      <p className="pp-p">{pp(composeIntro(mission))}</p>
      {outline !== undefined && (
        <div className="card" id="mission-outline">
          <div className="eyebrow">{"What's inside the mission"}</div>
          <div className="mt-2.5 grid gap-4 text-sm leading-relaxed text-text-secondary sm:grid-cols-3">
            <div>
              <div className="font-semibold text-text-primary">{decisionsHeading(outline)}</div>
              <ul className="mt-1">
                {outline.decisions.map((d) => (
                  <li key={d.label}>
                    <span className="text-text-primary">{d.label}</span>
                    {` — ${d.options.join(' · ')}`}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-text-primary">{eventsHeading(outline)}</div>
              <p className="mt-1">{outline.events.join(' · ')}</p>
            </div>
            <div>
              <div className="font-semibold text-text-primary">{attacksHeading(outline)}</div>
              <p className="mt-1">{outline.attacks.map(attackLine).join(' · ')}</p>
            </div>
          </div>
          {comparisonColumns !== undefined && (
            <p className="mt-3 text-[13px] text-text-muted">{closingLine(comparisonColumns)}</p>
          )}
        </div>
      )}
      <ArtifactEmbed
        artifactPath={`/artifacts/${mission.artifactSlug}/index.html`}
        hostSlug={hostSlug}
        hostTitle={hostTitle}
        title={mission.teaser}
        bare
        wrapperId={wrapperId}
        wrapperClassName="pp-breakout mission"
        height={height ?? DEFAULT_MISSION_HEIGHT}
        onMessage={onMessage}
        noscript={`${mission.teaser} (interactive - needs JavaScript)`}
        noscriptDetail={outline !== undefined ? OUTLINE_NOSCRIPT_POINTER : undefined}
      />
      {/* B2-10 (F23): with JS off the stop block's "you can stop here" promise
          is replaced by the reading pointer; the "stuck?" note is hidden. */}
      {mission.stopblock !== undefined && (
        <>
          <div className="stopblock" id="mission-stopblock">{pp(mission.stopblock)}</div>
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<style>#mission-stopblock{display:none}</style><div class="stopblock">This page has an interactive mission; without JavaScript, the comparison below is the reading.</div>`,
            }}
          />
        </>
      )}
      {mission.stuckNote !== undefined && (
        <>
          <p className="stuck-note" id="mission-stuck">{pp(mission.stuckNote)}</p>
          <noscript
            dangerouslySetInnerHTML={{ __html: `<style>#mission-stuck{display:none}</style>` }}
          />
        </>
      )}
    </section>
  )
}

// "Six decisions are yours — <summary> — and the goal is a day of traffic,
// survived." spliced into the intro at the marker (the validator requires
// the marker exactly once when `decisionsSummary` is present).
function composeIntro(mission: ProblemMission): string {
  const { decisionsSummary, outline, intro } = mission
  if (decisionsSummary === undefined || outline === undefined) return intro
  const sentence = `${capitalize(numberWord(outline.decisions.length))} decisions are yours — ${decisionsSummary} — and the goal is a day of traffic, survived.`
  return intro.replace(DECISIONS_MARKER, sentence)
}

function decisionsHeading(o: ProblemMissionOutline): string {
  return `Your ${numberWord(o.decisions.length)} decisions`
}
function eventsHeading(o: ProblemMissionOutline): string {
  return `The day, ${numberWord(o.events.length)} events`
}
function attacksHeading(o: ProblemMissionOutline): string {
  return `${capitalize(numberWord(o.attacks.length))} attacks, from the posts`
}
function attackLine(a: ProblemMissionOutline['attacks'][number]): string {
  return `${a.company} ${a.year}, ${a.text}`
}
function closingLine(comparisonColumns: number): string {
  return `Survive the day and the attacks, and your design becomes the ${ordinalWord(comparisonColumns + 1)} column in the comparison below.`
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const ORDINAL_WORDS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}
function ordinalWord(n: number): string {
  return ORDINAL_WORDS[n] ?? `${n}th`
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
