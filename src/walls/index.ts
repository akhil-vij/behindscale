// Wall registry: per-wall CODE the problem-page shell looks up by cruxTag.
//
// A "wall" is a problem class with a playable mission. Everything about a
// wall that is DATA (stations, comparison rows, questions, interview block,
// teasers) lives in content/problems/<cruxTag>.json; the one thing that is
// code -- the `youMapping()` that turns the mission's emitted state into the
// YOU column cells / diagram slots / interview ticks -- lives here, one
// module per wall. The shell is wall-agnostic: it fills cells by key and
// never hard-codes a wall's decisions, attacks, or domain. A class without a
// module simply has no YOU behavior (the comparison renders with the empty
// YOU states).
//
// Mission -> host contract (postMessage protocol v1; see
// src/pages/ProblemDetail.tsx): the mission emits `decisions` (a flat
// record of the reader's choices) and `held` (one boolean per attack);
// `youMapping(decisions, held)` returns the strings keyed by
// `comparison.matrixRows[].id` plus the `{{slot}}` names of the YOU diagram.

import ambiguousTimeouts from './ambiguous-timeouts'

export type WallDecisions = Readonly<Record<string, string | undefined>>

export interface WallModule {
  youMapping: (decisions: WallDecisions, held: readonly boolean[]) => Record<string, string>
  // How many attacks the mission runs -- the length of `held`.
  attackCount: number
}

export const wallBySlug: ReadonlyMap<string, WallModule> = new Map([
  ['ambiguous-failure-under-retry', ambiguousTimeouts],
])
