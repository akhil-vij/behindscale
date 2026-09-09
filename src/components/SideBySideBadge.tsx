// The side-by-side badge, shared by the /problems list and the landing wall
// cards (F20, findability task 5). Marks a wall that carries an authored
// comparison; N is the number of systems compared, taken from the comparison's
// column count -- data, never hand-set, so a second wall's badge appears by
// authoring its `comparison` block. Reads "SIDE BY SIDE · N SYSTEMS".
export default function SideBySideBadge({ systems }: { systems: number }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-strong bg-bg-surface px-2 py-[2px] font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary">
      Side by side · {systems} {systems === 1 ? 'system' : 'systems'}
    </span>
  )
}
