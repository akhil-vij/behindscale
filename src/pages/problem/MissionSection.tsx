import type { ProblemMission } from '../../types'
import ArtifactEmbed from '../../components/ArtifactEmbed'
import { pp } from './inline'

// "Build the defense": the mission artifact in a 960px breakout (bare -- the
// mission draws its own #artB frame), then the page-flow stop block and the
// "stuck?" note. The wrapper carries id="artB" so the station nav and the
// deck-jump can target the frame from the page.
interface MissionSectionProps {
  mission: ProblemMission
  hostSlug: string
  hostTitle: string
  // Host-side embed control (undefined until the host hook mounts).
  height?: string
  onMessage?: (data: unknown, reply: (message: unknown) => void) => void
}

const DEFAULT_MISSION_HEIGHT = '900px'

export default function MissionSection({
  mission,
  hostSlug,
  hostTitle,
  height,
  onMessage,
}: MissionSectionProps) {
  return (
    <section>
      <h2 className="pp-h2">{mission.title}</h2>
      <p className="pp-p">{pp(mission.intro)}</p>
      <ArtifactEmbed
        artifactPath={`/artifacts/${mission.artifactSlug}/index.html`}
        hostSlug={hostSlug}
        hostTitle={hostTitle}
        title={mission.teaser}
        bare
        wrapperId="artB"
        wrapperClassName="pp-breakout mission"
        height={height ?? DEFAULT_MISSION_HEIGHT}
        onMessage={onMessage}
        noscript={`${mission.teaser} (interactive - needs JavaScript)`}
      />
      {mission.stopblock !== undefined && (
        <div className="stopblock">{pp(mission.stopblock)}</div>
      )}
      {mission.stuckNote !== undefined && (
        <p className="stuck-note">{pp(mission.stuckNote)}</p>
      )}
    </section>
  )
}
