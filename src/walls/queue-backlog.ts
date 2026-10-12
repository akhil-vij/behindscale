// Wall module for `buffer-degrades-under-backlog` (/problems/queue-backlog).
//
// `youMapping()` turns the mission's state (the reader's decisions + which
// attacks held) into the YOU column cells, the YOU diagram slots and the
// interview ticks. Ported from the v1.3 prototype's host script (host.js,
// fact-checked copy pass): the lookup tables, strings and branching are the
// prototype's. Two sanctioned edits:
//   - the matrix row ids are the page's semantic ids (who, lives, drain, full,
//     stuck, order, done, breaks) where the prototype keyed its cells q1..q7;
//   - the fallback for a decision not yet made is "not chosen" (owner,
//     2026-10-10), where the prototype printed a long dash. It never shows
//     after a survived day, when every decision is set.
//
// The keys match the essay's `comparison.matrixRows[].id` (table cells) and
// the `{{slot}}` placeholders in the YOU row's filled SVG (dLives, dSlows,
// dFull, dBreaks). The diagram's "still breaks" line is a count until one
// attack is left (the full list was too long for one row).

import type { WallModule, WallDecisions } from './index'

const ATTACKS = [
  'Reshuffle sends jobs twice',
  'Backlog outlasts how long jobs are kept',
  'Queue slows the senders',
  'Backlog slows the lookups',
  'Partner down past the cutoff',
]
const ALL_HELD = 'Nothing the five posts name. See the bill for what it costs'
const NOT_CHOSEN = 'not chosen'

type Table = Record<string, string>

export function youMapping(K: WallDecisions, held: readonly boolean[]): Record<string, string> {
  const notHeld = ATTACKS.filter((_, i) => !held[i])
  const pick = (t: Table, k: string | undefined) => (k !== undefined && t[k]) || NOT_CHOSEN
  const lives = pick({ mem: 'Memory', log: 'A log on disk', rows: 'Rows in a database' }, K.where)
  const drain = pick(
    {
      mem: 'Slows with length, locks when full',
      log: 'Flat, capped per line',
      rows: K.scans === 'checkpoint' ? 'Fast: lookups start from a checkpoint' : 'Flat while few jobs are in use',
    },
    K.where,
  )
  const full = pick(
    { accept: 'Nobody: delay, not loss', reject: 'Senders: errors', throttle: 'Senders: as delay', relay: 'Nobody: a rate-limited relay' },
    K.full,
  )
  const stuck = pick(
    { block: 'Yes: it blocks the line', requeue: 'No: back of the line', ackaround: 'No: set aside in a dead-letter queue', localq: 'No: one runner waits' },
    K.stuck,
  )
  const order = pick({ fifo: 'One shared line', priority: 'Most important first', tenant: 'By a query, per customer' }, K.order)
  let done = pick(
    {
      fetch: 'Done when handed out. A crash loses it',
      lease: 'Confirmed, with a time limit. May repeat',
      watermark: 'Confirmed one by one, saved as a marker. Repeats after a reshuffle',
    },
    K.done,
  )
  if (K.retry) done += ' · retries ' + ({ forever: 'forever', backoff: 'with longer waits', cutoff: 'to a cutoff' } as Table)[K.retry]
  const allHeld = held.every(Boolean)
  return {
    who: "Your own services, the mission's senders",
    lives,
    drain,
    full,
    stuck,
    order,
    done,
    breaks: allHeld ? ALL_HELD : notHeld.join(' · '),
    dLives: lives.toUpperCase(),
    dSlows:
      K.where === 'mem'
        ? 'TAKING A JOB OUT SLOWS AS IT FILLS'
        : K.where === 'rows' && K.scans !== 'checkpoint'
          ? 'LOOKUPS SLOW WITH DEPTH'
          : 'NOTHING: IT STAYS FLAT',
    dFull: full.toUpperCase(),
    dBreaks: allHeld
      ? 'NOTHING THE FIVE POSTS NAME'
      : notHeld.length === 1
        ? 'STILL BREAKS: ' + notHeld[0]!.toUpperCase()
        : 'STILL BREAKS: ' + notHeld.length + ' ATTACKS NOT YET HELD',
  }
}

// The number of attacks this wall's mission runs (the `held` vector length).
export const ATTACK_COUNT = ATTACKS.length

const wall: WallModule = { youMapping, attackCount: ATTACK_COUNT }
export default wall
