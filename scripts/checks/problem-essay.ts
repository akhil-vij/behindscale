// Problem-essay cross-reference check (docs/problem-page-design.md §9; v7.3
// rich blocks 2026-09-06). Schema shape is validated at load
// (checkProblemEssay); THIS check enforces what a per-file predicate can't
// see:
//   - the essay's `cruxTag` resolves to a real registry entry;
//   - the filename equals the `cruxTag` (D-3: cruxTag-keyed, never urlSlug);
//   - at most one essay per class;
//   - every article the rich blocks name (sources, card teasers, diagram
//     rows) is a MEMBER of the class;
//   - every `patterns.order` slug is a pattern a member embodies;
//   - every question reference (`steal[].qref`) names a question;
//   - every `decide[].highlights` name is a `comparison.columns` header;
//   - every station anchor targets a section the page will render;
//   - every inline SVG the comparison references exists under
//     content/problems/<cruxTag>/ and passes the figure-svg-safe allowlist;
//   - the YOU column/diagram keys resolve against the wall module's
//     youMapping() (src/walls), and the interview has one follow-up per
//     attack -- so a wall's content and its code can't drift apart.
// Figure references (`wall.figureSlug`, {{figure:...}} markers) are covered
// by the eight figure checks via the problem figure host.

import { basename } from 'node:path'
import type { Check, CheckError, ContentSet } from '../types'
import type { ProblemEssay } from '../../src/types'
import { svgSafetyViolations } from './figure-svg-safe'
import { wallBySlug } from '../../src/walls'

const SLOT_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g

// The section anchors ProblemDetail renders for the blocks an essay carries.
function renderedAnchors(e: ProblemEssay): Set<string> {
  const anchors = new Set<string>(['patterns', 'cards'])
  if (e.tryIt !== undefined) anchors.add('artifact')
  if (e.mission !== undefined) anchors.add('artB')
  if (e.comparison !== undefined) {
    anchors.add('hintsheet')
    anchors.add('glance')
    for (const q of e.comparison.questions) anchors.add(q.id)
  }
  if (e.decide !== undefined) anchors.add('decide')
  if (e.steal !== undefined) anchors.add('steal')
  if (e.interview !== undefined) anchors.add('interview')
  return anchors
}

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
      const ref = { problemSlug: essay.cruxTag }
      const err = (message: string, fix: string[], severity?: 'warning') =>
        errors.push({ ...ref, file, message, fix, ...(severity ? { severity } : {}) })

      if (!content.cruxTagRegistry[essay.cruxTag]) {
        err(
          `problem essay cruxTag "${essay.cruxTag}" has no entry in content/cruxtags.json`,
          ['use a cruxTag that exists in the registry, or add the registry entry'],
        )
      }

      if (path) {
        const base = basename(path).replace(/\.json$/, '')
        if (base !== essay.cruxTag) {
          err(
            `problem essay filename "${base}" must equal its cruxTag "${essay.cruxTag}"`,
            [`rename to content/problems/${essay.cruxTag}.json`],
          )
        }
      }

      if ((countByCruxTag.get(essay.cruxTag) ?? 0) > 1) {
        err(
          `more than one problem essay declares cruxTag "${essay.cruxTag}"`,
          ['one essay per class -- merge or remove the duplicate file'],
        )
      }

      // -- member resolution --
      const members = content.articles.filter((a) => a.cruxTag === essay.cruxTag)
      const memberSlugs = new Set(members.map((a) => a.slug))
      const memberPatterns = new Set(members.flatMap((a) => a.patterns.map((p) => p.slug)))
      const requireMember = (where: string, slug: string) => {
        if (memberSlugs.has(slug)) return
        err(
          `${where} names article "${slug}", which is not a member of class "${essay.cruxTag}"`,
          ['name only articles whose cruxTag is this class (the derived sections list them)'],
        )
      }
      essay.sources?.items.forEach((it, i) => requireMember(`sources.items[${i}]`, it.articleSlug))
      for (const slug of Object.keys(essay.cards?.teasers ?? {})) {
        requireMember('cards.teasers', slug)
      }
      essay.comparison?.diagramRows.forEach((row, i) => {
        if (row.articleSlug !== undefined) requireMember(`comparison.diagramRows[${i}]`, row.articleSlug)
      })
      essay.patterns?.order?.forEach((slug, i) => {
        if (memberPatterns.has(slug)) return
        err(
          `patterns.order[${i}] "${slug}" is not a pattern any member of this class embodies`,
          ['order only the derived chips; the chip set itself comes from the members'],
        )
      })

      // -- question references --
      const questionIds = new Set(essay.comparison?.questions.map((q) => q.id) ?? [])
      essay.steal?.items.forEach((it, i) => {
        if (it.qref === undefined || questionIds.has(it.qref)) return
        err(`steal.items[${i}].qref "${it.qref}" names no comparison question`, [
          'use one of the comparison.questions[].id values',
        ])
      })

      // -- decide highlights vs the comparison columns --
      const columns = essay.comparison?.columns ?? []
      essay.decide?.rows.forEach((row, i) => {
        if (row.highlights === undefined) return
        if (essay.comparison === undefined) {
          err(
            `decide.rows[${i}].highlights names columns but this essay has no comparison table to highlight`,
            ['add the comparison block, or drop `highlights` from the row'],
            'warning',
          )
          return
        }
        for (const name of row.highlights) {
          if (columns.includes(name)) continue
          err(`decide.rows[${i}].highlights "${name}" is not a comparison column`, [
            `use the header names in comparison.columns: ${columns.join(', ')}`,
          ])
        }
      })

      // -- station anchors --
      const anchors = renderedAnchors(essay)
      essay.stations?.forEach((s, i) => {
        if (anchors.has(s.anchor)) return
        err(
          `stations[${i}] "${s.label}" targets #${s.anchor}, which this page does not render`,
          [`known anchors for this essay: ${Array.from(anchors).sort().join(', ')}`],
        )
      })

      // -- inline SVGs --
      const c = essay.comparison
      if (c !== undefined) {
        const refs: Array<readonly [string, string]> = [
          ...c.diagramRows.map((r, i) => [`comparison.diagramRows[${i}].svg`, r.svg] as const),
          ['comparison.you.emptySvg', c.you.emptySvg] as const,
          ['comparison.you.filledSvg', c.you.filledSvg] as const,
          ...c.questions.flatMap((q) =>
            q.figure ? [[`comparison.questions.${q.id}.figure.svg`, q.figure.svg] as const] : [],
          ),
        ]
        for (const [where, name] of refs) {
          const key = `${essay.cruxTag}/${name}`
          const entry = content.problemSvgs.get(key)
          if (entry === undefined) {
            err(`${where} "${name}" has no file at content/problems/${essay.cruxTag}/${name}.svg`, [
              `create content/problems/${essay.cruxTag}/${name}.svg (an inline <svg> using the page's diagram classes)`,
            ])
            continue
          }
          if (!/^\s*<svg\b/.test(entry.contents)) {
            err(`${where} "${name}" must be a single <svg> element (found other leading content)`, [
              'start the file with <svg ...> -- it is inlined verbatim into the page',
            ])
          }
          for (const v of svgSafetyViolations(entry.contents)) {
            err(`${where} "${name}" ${v}`, [
              'remove the disallowed construct; inline diagrams follow the figure-svg-safe allowlist',
            ])
          }
        }

        // -- YOU keys vs the wall module --
        const wall = wallBySlug.get(essay.cruxTag)
        if (wall === undefined) {
          err(
            `class "${essay.cruxTag}" has a comparison but no wall module in src/walls -- the YOU column will never fill`,
            ['add src/walls/<wall>.ts exporting youMapping() and register it in src/walls/index.ts'],
            'warning',
          )
        } else {
          const keys = new Set(Object.keys(wall.youMapping({}, [])))
          for (const row of c.matrixRows) {
            if (keys.has(row.id)) continue
            err(`comparison.matrixRows row "${row.id}" has no youMapping() key -- its YOU cell would stay empty`, [
              `youMapping() returns: ${Array.from(keys).join(', ')}`,
            ])
          }
          const filled = content.problemSvgs.get(`${essay.cruxTag}/${c.you.filledSvg}`)
          if (filled !== undefined) {
            SLOT_RE.lastIndex = 0
            let m: RegExpExecArray | null
            const seen = new Set<string>()
            while ((m = SLOT_RE.exec(filled.contents)) !== null) {
              const slot = m[1]!
              if (keys.has(slot) || seen.has(slot)) continue
              seen.add(slot)
              err(`comparison.you.filledSvg slot {{${slot}}} has no youMapping() key`, [
                `youMapping() returns: ${Array.from(keys).join(', ')}`,
              ])
            }
          }
          if (essay.interview !== undefined && essay.interview.followups.length !== wall.attackCount) {
            err(
              `interview.followups has ${essay.interview.followups.length} rows but the wall's mission runs ${wall.attackCount} attacks (one tick per attack)`,
              ['one follow-up row per attack, in attack order'],
            )
          }
        }
      }
    }

    return errors
  },
}
