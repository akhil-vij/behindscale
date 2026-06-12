// ASCII output formatter for the content validator. Pure function:
// takes the validation result + the content set (for slug -> path
// resolution), returns the string to print and the exit status.
//
// Format (all-pass case, no warnings):
//   content validator — N checks, 0 errors. ok.
//
// Format (all-pass case, with warnings):
//   content validator — N checks, 0 errors, W warnings. ok.
//
//   [section]  W warning(s)
//     ...
//
// Format (failure case):
//   content validator — N checks, M errors[, W warnings][ (K files skipped)]
//
//   [section]  X error(s)[, Y warning(s)]
//     <file>
//       <message>
//       → <fix1>
//       → <fix2>
//
//   failed[ (K files skipped due to schema invalid)]
//
// Warnings surface in the output but never flip `failed`. The
// severity distinction matters: `error` is "this would be wrong to
// ship"; `warning` is "this might be wrong and a human should look,"
// for checks whose normalization is intentionally best-effort
// (stats-value-in-prose's fuzzy-miss case, in particular).
//
// Unicode `→` for fix-line prefixes (Rust/Elm compiler style). Vercel
// and modern terminals render UTF-8 fine; trivial ASCII swap if it
// ever causes issues.

import type { CheckError, ContentSet } from './types'

export interface CheckResult {
  readonly name: string
  readonly errors: readonly CheckError[]
}

export interface RenderInput {
  // Always rendered first when non-empty.
  readonly schemaSectionName: string
  readonly schemaErrors: readonly CheckError[]
  // Rendered in the order they appear here.
  readonly checkResults: readonly CheckResult[]
  // For slug -> path resolution in error output.
  readonly content: ContentSet
  readonly skippedFileCount: number
}

export interface RenderResult {
  readonly output: string
  readonly failed: boolean
}

function isWarning(e: CheckError): boolean {
  return e.severity === 'warning'
}

export function render(input: RenderInput): RenderResult {
  const sections: string[] = []
  let totalErrors = 0
  let totalWarnings = 0

  // Schema errors are always hard errors -- a malformed JSON file
  // skips out of the loaded ContentSet and is not safe to ship.
  for (const e of input.schemaErrors) {
    if (isWarning(e)) totalWarnings += 1
    else totalErrors += 1
  }
  if (input.schemaErrors.length > 0) {
    sections.push(renderSection(input.schemaSectionName, input.schemaErrors, input.content))
  }
  for (const result of input.checkResults) {
    let sectionErrors = 0
    let sectionWarnings = 0
    for (const e of result.errors) {
      if (isWarning(e)) sectionWarnings += 1
      else sectionErrors += 1
    }
    totalErrors += sectionErrors
    totalWarnings += sectionWarnings
    if (result.errors.length > 0) {
      sections.push(renderSection(result.name, result.errors, input.content))
    }
  }

  const checkCount = input.checkResults.length
  const warningSuffix =
    totalWarnings > 0
      ? `, ${totalWarnings} warning${plural(totalWarnings)}`
      : ''

  if (totalErrors === 0) {
    // Warnings still surface in the output, but the run is `ok`.
    const header = `content validator — ${checkCount} check${plural(checkCount)}, 0 errors${warningSuffix}. ok.`
    if (totalWarnings === 0) {
      return { output: header, failed: false }
    }
    return {
      output: [header, '', ...sections].join('\n').trimEnd(),
      failed: false,
    }
  }

  const skippedClause =
    input.skippedFileCount > 0
      ? ` (${input.skippedFileCount} file${plural(input.skippedFileCount)} skipped)`
      : ''
  const header = `content validator — ${checkCount} check${plural(checkCount)}, ${totalErrors} error${plural(totalErrors)}${warningSuffix}${skippedClause}`
  const footer =
    input.skippedFileCount > 0
      ? `failed (${input.skippedFileCount} file${plural(input.skippedFileCount)} skipped due to schema invalid)`
      : 'failed'

  return {
    output: [header, '', ...sections, footer].join('\n'),
    failed: true,
  }
}

function renderSection(
  name: string,
  errors: readonly CheckError[],
  content: ContentSet,
): string {
  const lines: string[] = []
  const hardCount = errors.filter((e) => !isWarning(e)).length
  const warnCount = errors.filter(isWarning).length
  const parts: string[] = []
  if (hardCount > 0) parts.push(`${hardCount} error${plural(hardCount)}`)
  if (warnCount > 0) parts.push(`${warnCount} warning${plural(warnCount)}`)
  lines.push(`[${name}]  ${parts.join(', ')}`)
  for (const err of errors) {
    const tag = isWarning(err) ? ' (warning)' : ''
    lines.push(`  ${resolveFile(err, content)}${tag}`)
    lines.push(`    ${err.message}`)
    if (err.fix !== undefined) {
      for (const alt of err.fix) {
        lines.push(`    → ${alt}`)
      }
    }
  }
  // Trailing blank line separates sections in the output.
  lines.push('')
  return lines.join('\n')
}

function resolveFile(err: CheckError, content: ContentSet): string {
  if (err.file !== undefined) return err.file
  if (err.articleSlug !== undefined) {
    return (
      content.articlePaths.get(err.articleSlug) ??
      `<unknown article slug: ${err.articleSlug}>`
    )
  }
  if (err.patternSlug !== undefined) {
    return (
      content.patternPaths.get(err.patternSlug) ??
      `<unknown pattern slug: ${err.patternSlug}>`
    )
  }
  return '<no file>'
}

function plural(n: number): string {
  return n === 1 ? '' : 's'
}
