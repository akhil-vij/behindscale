import { formatEstimate } from '../lib/wallEstimate'

// The PLAYABLE badge, shared by the /problems list and the landing wall cards
// (F20). One rule for the estimate -- station budgets through DECIDE rounded up
// to 5 (src/lib/wallEstimate.estimateMinutes) -- and the badge says what it
// measures: "▶ PLAYABLE · ~35 min to a survived design". The nav's station
// budgets are separate (they include GO DEEPER + INTERVIEW). Driven by the
// essay's `mission` field, so a second wall lights up by authoring that block.
export default function PlayableBadge({ minutes }: { minutes: number | null }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-bg-surface px-2 py-[2px] font-mono text-[11px] uppercase tracking-[0.08em] text-text-primary">
        <span aria-hidden="true">▶</span> Playable
      </span>
      {minutes !== null && (
        <span className="font-mono text-xs text-text-muted">
          · {formatEstimate(minutes)} to a survived design
        </span>
      )}
    </span>
  )
}
