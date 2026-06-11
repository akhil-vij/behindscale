#!/usr/bin/env tsx
// Build-time content validator. Loads everything in content/, runs each
// registered Check against the typed content set, and reports all
// failures in one pass (never stop at the first). Exit 0 on success,
// 1 on any failure. Designed so adding a new check is "write the file
// under scripts/checks/, append one line to CHECKS below."
//
// Wired into the build chain in package.json:
//   "build": "npm run validate && tsc -b && vite build"
// so a Vercel deploy fails the same way a local build does.

import { loadContent, SCHEMA_SECTION_NAME } from './load-content'
import { render, type CheckResult } from './render-output'
import { orphanPatternSlugs } from './checks/orphan-pattern-slugs'
import { minimumPatternCoverage } from './checks/minimum-pattern-coverage'
import { artifactPathMatchesSlug } from './checks/artifact-path-matches-slug'
import { statsValueInProse } from './checks/stats-value-in-prose'
import type { Check } from './types'

// Explicit registration over auto-discovery: greppable, type-checked,
// catches filename typos at compile time. Adding a check = one import
// line + one entry below.
const CHECKS: readonly Check[] = [
  orphanPatternSlugs,
  minimumPatternCoverage,
  artifactPathMatchesSlug,
  statsValueInProse,
]

const { content, schemaErrors, skippedFileCount } = loadContent()

// Checks operate on the (potentially partial) content set. Files that
// failed schema validation are absent from `content`, so checks
// transparently skip them -- subsequent check sections don't need to
// know about schema failures.
const checkResults: CheckResult[] = CHECKS.map((check) => ({
  name: check.name,
  errors: check.run(content),
}))

const { output, failed } = render({
  schemaSectionName: SCHEMA_SECTION_NAME,
  schemaErrors,
  checkResults,
  content,
  skippedFileCount,
})

console.log(output)
process.exit(failed ? 1 : 0)
