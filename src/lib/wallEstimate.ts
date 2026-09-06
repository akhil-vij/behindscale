// The list-page time estimate for a playable wall. Pure; shared by the
// /problems list (Catalog.tsx) and any future surface that quotes it.
//
// Ruling (2026-09-06): there is NO stored estimate. Sum the budgets of the
// stations flagged `estimate` (through DECIDE on the first wall:
// 3 + 15 + 10 + 5 = 33) and round UP to the nearest 5 -> "~35 min". A
// second wall gets its estimate for free from its own station budgets.

import type { ProblemStation } from '../types'

export function estimateMinutes(stations: readonly ProblemStation[]): number | null {
  let total = 0
  let counted = false
  for (const s of stations) {
    if (!s.estimate || s.minutes === null) continue
    total += s.minutes
    counted = true
  }
  if (!counted) return null
  return Math.ceil(total / 5) * 5
}

export function formatEstimate(minutes: number): string {
  return `~${minutes} min`
}
