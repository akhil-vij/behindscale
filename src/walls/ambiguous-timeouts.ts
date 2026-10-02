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
//
// Sanctioned edit (comparison copy pass): every output string was reworded
// to the page's house rules and the table's row labels (Key made by / Memory
// lives / Crash halfway / Duplicate gets back / Window / Still breaks when):
// no dashes as punctuation, main database / read-only copy, memory not
// state, response not result, the caller not the client. The lookup keys and
// the branching are unchanged. The attack phrases keep their old total length
// because the sixth diagram's red line prints all five on one row.

import type { WallModule, WallDecisions } from './index'

const ATTACK_PHRASES = ['Key reused', 'Read-only copy reads', 'Traffic 10×', 'Details change', 'Retry after window']
const ALL_HELD = 'Key reused: always, by design (Stripe 2017). Nothing else the five posts name.'

type Table = Record<string, string>

export function youMapping(K: WallDecisions, held: readonly boolean[]): Record<string, string> {
  const hasMem = K.mem && K.mem !== 'none'
  const stateBase = ({ none: 'Nowhere', store: 'A separate store', storerec: 'A separate store with recovery steps', acid: 'In the same commit as the charge' } as Table)[K.mem || 'none']
  const state = stateBase + (hasMem ? (K.read === 'replica' ? ', read from a read-only copy' : ', main database only') : '')
  const notHeld = ATTACK_PHRASES.filter(function (_, i) { return !held[i] })
  const breaks = held.every(Boolean) ? ALL_HELD : notHeld.join(' · ')
  return {
    who: "The mission's payment app",
    key: ({ none: 'Nobody', hash: 'The server, as a fingerprint of the request', key: 'The caller' } as Table)[K.id || 'none'],
    state: state,
    crash: ({ none: '—', store: 'A gap: recorded but not charged, or charged but not recorded', storerec: 'Recovery steps rebuild it', acid: "Can't half-happen" } as Table)[K.mem || 'none'],
    rep: hasMem ? (({ saved: 'The saved response', err: 'An "already processed" error' } as Table)[K.rep ?? ''] || '—') : '—',
    win: ({ min: 'One minute', day: 'About 24 hours', size: 'Set by size, shrinks under heavy traffic', ever: 'Forever' } as Table)[K.ret ?? ''] || '—',
    breaks: breaks,
    dKey: ({ none: 'nobody names it', hash: 'a parameter fingerprint', key: 'the caller names it' } as Table)[K.id || 'none'],
    dState: state.toUpperCase(),
    dRep: hasMem ? (K.rep === 'saved' ? 'A DUPLICATE GETS THE SAVED RESPONSE' : 'A DUPLICATE GETS "ALREADY PROCESSED"') : 'NO MEMORY, SO NO REPLY',
    dBreaks: held.every(Boolean) ? 'STILL BREAKS: KEY REUSED, BY DESIGN' : ('STILL BREAKS: ' + notHeld.join(' · ').toUpperCase()),
  }
}

// The number of attacks this wall's mission runs (the `held` vector length).
export const ATTACK_COUNT = ATTACK_PHRASES.length

const wall: WallModule = { youMapping, attackCount: ATTACK_COUNT }
export default wall
