// When a page's content last really changed, from git: the date of the newest
// commit that touched any of the page's source files, skipping commits that
// don't change what a reader sees:
//   - formatting-only diffs (JSON that parses to the same value, other files
//     that differ only in whitespace), and
//   - commits listed in .git-blame-ignore-revs (git's own convention for
//     "not a content change", e.g. the SVG metadata strip).
// Used by scripts/generate-feed.ts for each entry's <updated>.
//
// Needs the full history. A shallow clone (Vercel's default is the last 10
// commits; actions/checkout's is 1) would date every older file to the clone
// boundary, so a shallow repo is an error, not a fallback. Vercel needs the
// VERCEL_DEEP_CLONE=true environment variable; CI checks out with
// fetch-depth: 0.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function git(root: string, args: readonly string[]): string {
  // stderr captured, not inherited: an expected miss (a file absent at a
  // revision) throws to the caller without printing git's "fatal:" line.
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function assertFullHistory(root: string): void {
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error(
      'content-dates: this is a shallow git clone, so file change dates would be wrong. ' +
        'Build from a full clone (Vercel: set VERCEL_DEEP_CLONE=true; GitHub Actions: checkout with fetch-depth: 0).',
    )
  }
}

// Full hashes from .git-blame-ignore-revs (comments and blank lines skipped).
export function ignoredRevs(root: string): Set<string> {
  const file = join(root, '.git-blame-ignore-revs')
  if (!existsSync(file)) return new Set()
  return new Set(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim())
      .filter((l) => /^[0-9a-f]{40}$/.test(l)),
  )
}

// YYYY-MM-DD of the newest commit that really changed any of `paths`
// (repo-relative; missing paths are fine), or undefined when none did.
export function lastContentChange(
  root: string,
  paths: readonly string[],
  ignore: ReadonlySet<string>,
): string | undefined {
  const present = paths.filter((p) => existsSync(join(root, p)))
  if (present.length === 0) return undefined
  const log = git(root, ['log', '--format=%H %cs', '--', ...present]).trim()
  if (log === '') return undefined
  for (const line of log.split('\n')) {
    const [hash, date] = line.split(' ') as [string, string]
    if (ignore.has(hash)) continue
    // Root commit has no parent: diff against the empty tree.
    const parent = git(root, ['rev-list', '--parents', '-n', '1', hash]).trim().split(' ')[1]
    const base = parent ?? git(root, ['hash-object', '-t', 'tree', '/dev/null']).trim()
    const changed = git(root, ['diff', '--name-only', base, hash, '--', ...present]).split('\n').filter(Boolean)
    if (changed.some((file) => reallyChanged(root, base, hash, file))) return date
  }
  return undefined
}

// JSON compares parsed values, so any reformat (reindent, reflow) is not a
// change. Other files diff with whitespace ignored: a hunk header survives -w
// only when something besides whitespace changed.
function reallyChanged(root: string, base: string, hash: string, file: string): boolean {
  if (file.endsWith('.json')) {
    const at = (rev: string): string | undefined => {
      try {
        return JSON.stringify(JSON.parse(git(root, ['show', `${rev}:${file}`])))
      } catch {
        return undefined // absent at that revision, or not valid JSON
      }
    }
    const before = at(base)
    const after = at(hash)
    if (before !== undefined && after !== undefined) return before !== after
  }
  const diff = git(root, ['diff', '-w', '--ignore-blank-lines', base, hash, '--', file])
  return /^@@ /m.test(diff)
}
