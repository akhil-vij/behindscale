import type { Figure, ProblemTryIt, ProblemWall } from '../../types'
import ArtifactEmbed from '../../components/ArtifactEmbed'
import { escapeHtml, pp } from './inline'

// "The wall": authored prose, the try-it artifact (960px breakout, bare --
// the artifact draws its own frame), its caption, the no-JS figure, and the
// stat strip. The figure renders INSIDE <noscript> through innerHTML so the
// server and client markup agree byte-for-byte (browsers with scripting on
// keep noscript content as raw text).
interface WallSectionProps {
  wall: ProblemWall
  tryIt?: ProblemTryIt
  figure?: Figure
  hostSlug: string
  hostTitle: string
  // Host-side embed control (undefined until the host hook mounts).
  tryItWrapperId: string
  tryItHeight?: string
  onTryItMessage?: (data: unknown, reply: (message: unknown) => void) => void
}

const DEFAULT_TRYIT_HEIGHT = '720px'

export default function WallSection({
  wall,
  tryIt,
  figure,
  hostSlug,
  hostTitle,
  tryItWrapperId,
  tryItHeight,
  onTryItMessage,
}: WallSectionProps) {
  const figureHtml =
    figure !== undefined
      ? `<figure class="pp-figure"><span class="eyebrow">${escapeHtml(figure.eyebrow)}</span><img src="/figures/${hostSlug}/${figure.slug}.svg" alt="${escapeHtml(figure.ariaLabel)}" class="block h-auto w-full" /><p class="fig-cap">${escapeHtml(figure.caption)}</p></figure>`
      : null
  return (
    <section>
      <h2 className="pp-h2">The wall</h2>
      {wall.prose.map((p, i) => (
        <p key={i} className="pp-p">
          {pp(p)}
        </p>
      ))}
      {tryIt !== undefined && (
        <>
          <ArtifactEmbed
            artifactPath={`/artifacts/${tryIt.artifactSlug}/index.html`}
            hostSlug={hostSlug}
            hostTitle={hostTitle}
            title={tryIt.teaser}
            bare
            wrapperId={tryItWrapperId}
            wrapperClassName="pp-breakout"
            height={tryItHeight ?? DEFAULT_TRYIT_HEIGHT}
            onMessage={onTryItMessage}
            noscript={`${tryIt.teaser} (interactive - needs JavaScript)`}
          />
          <p className="fig-cap">{pp(tryIt.caption)}</p>
        </>
      )}
      {figureHtml !== null && (
        <noscript dangerouslySetInnerHTML={{ __html: figureHtml }} />
      )}
      {wall.stats !== undefined && wall.stats.length > 0 && (
        <div className="stats">
          {wall.stats.map((st, i) => (
            <div key={i} className="stat">
              <span className="v">{st.value}</span>
              <div className="l">{st.label}</div>
              <div className="src">{st.source}</div>
            </div>
          ))}
        </div>
      )}
      {wall.statsCaption !== undefined && (
        <p className="stats-caption">{pp(wall.statsCaption)}</p>
      )}
    </section>
  )
}
