// Every inline-markup string a problem essay carries, as [name, text] pairs.
// Shared by the prose checks (bold-markers-balanced, inline-link-targets)
// so the rich problem-page copy gets the same "no literal markdown leak" /
// "no dead link" guarantees as article and pattern prose. Keep in sync with
// the fields src/pages/ProblemDetail.tsx renders through renderInline().

import type { ProblemEssay } from '../src/types'

export function problemEssayProseFields(
  e: ProblemEssay,
): ReadonlyArray<readonly [string, string]> {
  const out: Array<readonly [string, string]> = []
  const push = (name: string, text: string | undefined) => {
    if (text !== undefined) out.push([name, text])
  }
  e.intro?.forEach((p, i) => push(`intro[${i}]`, p))
  e.wall?.prose.forEach((p, i) => push(`wall.prose[${i}]`, p))
  push('wall.statsCaption', e.wall?.statsCaption)
  push('tryIt.caption', e.tryIt?.caption)
  push('mission.intro', e.mission?.intro)
  push('mission.stopblock', e.mission?.stopblock)
  push('mission.stuckNote', e.mission?.stuckNote)
  const c = e.comparison
  if (c !== undefined) {
    push('comparison.lede', c.lede)
    push('comparison.spectrum.caption', c.spectrum.caption)
    push('comparison.stripNote', c.stripNote)
    push('comparison.matrixLead', c.matrixLead)
    push('comparison.matrixCaption', c.matrixCaption)
    c.questions.forEach((q) => {
      push(`comparison.questions.${q.id}.why`, q.why)
      push(`comparison.questions.${q.id}.figure.caption`, q.figure?.caption)
      q.answers.forEach((a, j) =>
        push(`comparison.questions.${q.id}.answers[${j}]`, a.text),
      )
    })
  }
  if (e.decide !== undefined) {
    push('decide.intro', e.decide.intro)
    e.decide.rows.forEach((r, i) => {
      push(`decide.rows[${i}].if`, r.if)
      push(`decide.rows[${i}].then`, r.then)
    })
    push('decide.elsewhere.text', e.decide.elsewhere?.text)
  }
  if (e.steal !== undefined) {
    push('steal.intro', e.steal.intro)
    e.steal.items.forEach((it, i) => push(`steal.items[${i}].text`, it.text))
  }
  const iv = e.interview
  if (iv !== undefined) {
    push('interview.shape', iv.shape)
    push('interview.followupsIntro', iv.followupsIntro)
    iv.followups.forEach((f, i) => push(`interview.followups[${i}].held`, f.held))
    push('interview.senior', iv.senior)
    push('interview.staff', iv.staff)
    push('interview.closing', iv.closing)
    iv.redFlags.forEach((r, i) => push(`interview.redFlags[${i}]`, r))
  }
  push('patterns.intro', e.patterns?.intro)
  push('cards.intro', e.cards?.intro)
  for (const [slug, line] of Object.entries(e.cards?.teasers ?? {})) {
    push(`cards.teasers.${slug}`, line)
  }
  push('sources.intro', e.sources?.intro)
  return out
}
