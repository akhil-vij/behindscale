// Problem-essay cross-reference check (docs/problem-page-design.md §9).
// Schema shape is validated at load (checkProblemEssay); THIS check enforces
// the cross-references a per-file predicate can't see:
//   - the essay's `cruxTag` resolves to a real registry entry (so its page
//     and the derived sections exist);
//   - the filename equals the `cruxTag` (D-3: cruxTag-keyed, never urlSlug --
//     the frozen-key discipline, so an editorial urlSlug rename can't orphan
//     an essay);
//   - at most one essay per class.
//
// Scope grows with the schema: as authored blocks land (vantageRows,
// simulator, ...) their reference rules join this file, together with the
// block's renderer + validator + email degradation (the "ships as a unit"
// rule). Today only the header fields exist, so only these three rules run.

import { basename } from 'node:path'
import type { Check, CheckError, ContentSet } from '../types'

export const problemEssay: Check = {
  name: 'problem-essay',
  run(content: ContentSet): readonly CheckError[] {
    const errors: CheckError[] = []

    // Count declarations per cruxTag for the uniqueness rule (the loader's
    // path map collapses duplicates, so count from the essay array).
    const countByCruxTag = new Map<string, number>()
    for (const essay of content.problemEssays) {
      countByCruxTag.set(
        essay.cruxTag,
        (countByCruxTag.get(essay.cruxTag) ?? 0) + 1,
      )
    }

    for (const essay of content.problemEssays) {
      const path = content.problemEssayPaths.get(essay.cruxTag)
      const file = path ?? `${'content/problems'}/${essay.cruxTag}.json`

      if (!content.cruxTagRegistry[essay.cruxTag]) {
        errors.push({
          file,
          message: `problem essay cruxTag "${essay.cruxTag}" has no entry in content/cruxtags.json`,
          fix: [
            'use a cruxTag that exists in the registry, or add the registry entry',
          ],
        })
      }

      if (path) {
        const base = basename(path).replace(/\.json$/, '')
        if (base !== essay.cruxTag) {
          errors.push({
            file,
            message: `problem essay filename "${base}" must equal its cruxTag "${essay.cruxTag}"`,
            fix: [`rename to content/problems/${essay.cruxTag}.json`],
          })
        }
      }

      if ((countByCruxTag.get(essay.cruxTag) ?? 0) > 1) {
        errors.push({
          file,
          message: `more than one problem essay declares cruxTag "${essay.cruxTag}"`,
          fix: ['one essay per class -- merge or remove the duplicate file'],
        })
      }
    }

    return errors
  },
}
