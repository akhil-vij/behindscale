// list-block-well-formed check (docs/lists-design.md §0.4).
//
// Body prose (Article.problem / Article.solution) and pattern
// definitions may render `- ` and `N. ` lists (Prose.tsx classifies a
// chunk of all-list-item lines as a <ul>/<ol>). This check is the
// strict guardrail: it hard-errors on every malformed list shape so a
// broken list -- one that would render as literal dashes or a run-on
// line -- can never reach production. Same posture as the figure
// lints: structure-level content errors block the build.
//
// The classifier itself lives in src/lib/proseList.ts and is shared
// with the renderer, so what ships and what is validated agree by
// construction. This file only walks the fields, groups chunks, and
// turns the shared analysis into CheckErrors.
//
// Six conditions, all `severity: 'error'`:
//   1. Mixed chunk      -- list items + non-list prose in one chunk.
//   2. Mixed markers    -- `- ` and `N. ` in one chunk.
//   3. Single-item list -- a lone one-item list (smell).
//   4. Blank-separated  -- items split by blank lines (adjacent
//                          single-item chunks of the same kind).
//   5. Nesting          -- an indented list item.
//   6. Unsupported form -- `*`/`+` bullets, `N)` ordered, etc.
// (2), (5), (6) collapse into the shared analyzeChunk() 'malformed'
// reason string; (1) is its catch-all; (3)/(4) are decided here by
// the run-folding pass so the message can distinguish the two.

import type { Check, CheckError } from '../types'
import { analyzeChunk, type ChunkClass } from '../../src/lib/proseList'

// Split a prose field into chunks the same way Prose.tsx does.
function chunksOf(field: string): string[] {
  return field.split(/\n{2,}/).filter((c) => c.trim().length > 0)
}

// Walk one field's chunks and emit messages (without the slug -- the
// caller attaches article/pattern identity). `where` names the field
// for the error text ("problem", "solution", "definition").
function checkField(where: string, field: string): { message: string; fix: string[] }[] {
  const classes: ChunkClass[] = chunksOf(field).map(analyzeChunk)
  const out: { message: string; fix: string[] }[] = []

  let i = 0
  while (i < classes.length) {
    const c = classes[i]
    if (c.kind === 'malformed') {
      out.push({
        message: `${where}: malformed list -- ${c.reason}`,
        fix: [c.fix],
      })
      i++
    } else if (c.kind === 'single') {
      // Fold a run of adjacent single-item lists of the same kind:
      // that is the "items separated by blank lines" shape, which
      // deserves a clearer message than N separate single-item errors.
      let j = i
      while (
        j + 1 < classes.length &&
        classes[j + 1].kind === 'single' &&
        (classes[j + 1] as { ordered: boolean }).ordered === c.ordered
      ) {
        j++
      }
      if (j > i) {
        out.push({
          message: `${where}: list items are separated by blank lines, so each renders as its own one-item list`,
          fix: ['remove the blank lines between the items so they form one list block'],
        })
      } else {
        out.push({
          message: `${where}: single-item list (a list needs at least two items)`,
          fix: [
            'add a second item, or fold the single item back into a prose sentence',
          ],
        })
      }
      i = j + 1
    } else {
      i++
    }
  }
  return out
}

export const listBlockWellFormed: Check = {
  name: 'list-block-well-formed',
  run: (content) => {
    const errors: CheckError[] = []

    for (const article of content.articles) {
      for (const [where, field] of [
        ['problem', article.problem],
        ['solution', article.solution],
      ] as const) {
        for (const e of checkField(where, field)) {
          errors.push({ articleSlug: article.slug, message: e.message, fix: e.fix })
        }
      }
    }

    for (const pattern of content.patterns) {
      for (const e of checkField('definition', pattern.definition)) {
        errors.push({ patternSlug: pattern.slug, message: e.message, fix: e.fix })
      }
    }

    return errors
  },
}
