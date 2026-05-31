// Shared types for the build-time content validator. The Check
// signature is the framework's only contract -- a new check is a file
// under scripts/checks/ that exports a Check, plus one line in
// scripts/validate-content.ts's CHECKS array.

import type { Article, PatternDefinition } from '../src/types'

export interface ContentSet {
  readonly articles: readonly Article[]
  readonly patterns: readonly PatternDefinition[]
  // slug -> on-disk path. Lets checks emit exact file locations in
  // their error output without each check arg carrying path strings;
  // the runner resolves slug -> path when rendering.
  readonly articlePaths: ReadonlyMap<string, string>
  readonly patternPaths: ReadonlyMap<string, string>
}

export interface CheckError {
  // Exactly one of these three should typically be set so the runner
  // can resolve to a file path for output. Resolution priority:
  // file > articleSlug > patternSlug. `file` is the escape hatch for
  // cross-cutting checks that don't fit either slug bucket.
  readonly articleSlug?: string
  readonly patternSlug?: string
  readonly file?: string
  // One-line problem description (no leading "fix:" prefix; the runner
  // handles formatting).
  readonly message: string
  // Optional list of suggested fixes. Each entry renders as its own
  // `→`-prefixed line in the output. Authors keep entries to a single
  // line each.
  readonly fix?: readonly string[]
}

export interface Check {
  // Short slug; renders as the `[name]` section header. Lowercase
  // kebab-case, matches the filename.
  readonly name: string
  // Synchronous; no IO inside. The loader has already read everything.
  // Returns the list of errors this check found across the content set.
  readonly run: (content: ContentSet) => readonly CheckError[]
}
