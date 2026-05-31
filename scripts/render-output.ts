// ASCII output formatter for the content validator. Pure function:
// takes the validation result + the content set (for slug -> path
// resolution), returns the string to print and the exit status.
//
// Format (all-pass case):
//   content validator — N checks, 0 errors. ok.
//
// Format (failure case):
//   content validator — N checks, M errors[ (K files skipped)]
//
//   [section]  X error(s)
//     <file>
//       <message>
//       → <fix1>
//       → <fix2>
//
//   failed[ (K files skipped due to schema invalid)]
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

export function render(input: RenderInput): RenderResult {
  const sections: string[] = []
  let totalErrors = input.schemaErrors.length

  if (input.schemaErrors.length > 0) {
    sections.push(renderSection(input.schemaSectionName, input.schemaErrors, input.content))
  }
  for (const result of input.checkResults) {
    if (result.errors.length > 0) {
      sections.push(renderSection(result.name, result.errors, input.content))
      totalErrors += result.errors.length
    }
  }

  const checkCount = input.checkResults.length

  if (totalErrors === 0) {
    return {
      output: `content validator — ${checkCount} check${plural(checkCount)}, 0 errors. ok.`,
      failed: false,
    }
  }

  const skippedClause =
    input.skippedFileCount > 0
      ? ` (${input.skippedFileCount} file${plural(input.skippedFileCount)} skipped)`
      : ''
  const header = `content validator — ${checkCount} check${plural(checkCount)}, ${totalErrors} error${plural(totalErrors)}${skippedClause}`
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
  lines.push(`[${name}]  ${errors.length} error${plural(errors.length)}`)
  for (const err of errors) {
    lines.push(`  ${resolveFile(err, content)}`)
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
