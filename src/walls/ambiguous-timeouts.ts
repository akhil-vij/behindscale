// Wall module for `ambiguous-failure-under-retry` (/problems/ambiguous-timeouts).
//
// `youMapping()` is the ONE mapping from the mission's state (the reader's
// decisions + which attacks held) to the YOU column cells, the YOU diagram
// slots, and the interview ticks (changelog v7.3 §6: single source). Ported
// VERBATIM from the v7.3 prototype's host script (problem-page-v7.3.html,
// Script 3) -- only TypeScript annotations were added; the lookup tables,
// strings, and branching are byte-for-byte the prototype's. Frozen surface:
// do not reword or "improve".
//
// The keys returned match the essay's `comparison.matrixRows[].id` (table
// cells) and the `{{slot}}` placeholders in the YOU row's filled SVG
// (`dKey`, `dState`, `dRep`, `dBreaks`). The shell fills by key and knows
// nothing about payments, six decisions, or five attacks.
//
// Sanctioned edit (Batch 2, B2-2/F7): the all-held branch of `breaks`
// (#you-c-breaks) and `dBreaks` (the sixth diagram's red mark) now keep
// "Key reused" -- attack 1 is accepted, not fixed, so naming nothing after
// acceptance contradicted Stripe's own post. The reference is untouched.

import type { WallModule, WallDecisions } from './index'

const ATTACK_PHRASES = ['Key reused', 'Replica reads', 'Traffic 10×', 'Parameters change', 'Retry after the window']
const ALL_HELD = 'Key reused - always, by design (Stripe 2017). Nothing else the five posts name.'

type Table = Record<string, string>

export function youMapping(K: WallDecisions, held: readonly boolean[]): Record<string, string> {
  const hasMem = K.mem && K.mem !== 'none'
  const stateBase = ({ none: 'Nowhere', store: 'A separate store', storerec: 'A separate store + recovery steps', acid: 'With the work, one commit' } as Table)[K.mem || 'none']
  const state = stateBase + (hasMem ? (K.read === 'replica' ? ', replica reads' : ', master only') : '')
  const notHeld = ATTACK_PHRASES.filter(function (_, i) { return !held[i] })
  const breaks = held.every(Boolean) ? ALL_HELD : notHeld.join(' · ')
  return {
    who: "A payment app - the mission's client",
    key: ({ none: 'Nobody names it', hash: 'A fingerprint of the parameters', key: 'The caller' } as Table)[K.id || 'none'],
    state: state,
    crash: ({ none: '—', store: 'A gap: recorded but not charged, or charged but not recorded', storerec: 'Recovery steps rebuild it', acid: "Can't half-happen" } as Table)[K.mem || 'none'],
    rep: hasMem ? (({ saved: 'The saved result', err: 'An "already processed" error' } as Table)[K.rep ?? ''] || '—') : '—',
    win: ({ min: 'One minute', day: '~24 hours', size: 'Size-bound - shrinks under load', ever: 'Forever' } as Table)[K.ret ?? ''] || '—',
    breaks: breaks,
    dKey: ({ none: 'nobody names it', hash: 'a parameter fingerprint', key: 'the caller names it' } as Table)[K.id || 'none'],
    dState: state.toUpperCase(),
    dRep: hasMem ? (K.rep === 'saved' ? 'A DUPLICATE GETS THE SAVED RESULT' : 'A DUPLICATE GETS "ALREADY PROCESSED"') : 'NO REPLAY - NO MEMORY',
    dBreaks: held.every(Boolean) ? 'STILL BREAKS: KEY REUSED - BY DESIGN' : ('STILL BREAKS: ' + notHeld.join(' · ').toUpperCase()),
  }
}

// The number of attacks this wall's mission runs (the `held` vector length).
export const ATTACK_COUNT = ATTACK_PHRASES.length

const wall: WallModule = { youMapping, attackCount: ATTACK_COUNT }
export default wall
