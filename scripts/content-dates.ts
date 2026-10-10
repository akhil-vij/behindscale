// When a page's content last really changed, from git: the date of the newest
// commit that touched any of the page's source files, skipping commits that
// don't change what a reader sees:
//   - formatting-only diffs (JSON that parses to the same value, other files
//     that differ only in whitespace), and
//   - commits listed in .git-blame-ignore-revs (git's own convention for
//     "not a content change", e.g. the SVG metadata strip).
// Used by scripts/generate-feed.ts for each entry's <updated>.
//
// Needs the full history. A shallow clone would date every older file to the
// clone boundary, so the build never dates from one: ensureFullHistory()
// deepens a shallow clone first, or fails the build.
//   - Vercel clones the last 10 commits with no git remote configured, and
//     VERCEL_DEEP_CLONE=true did not change that (2026-10-10 deploy failed
//     with it set). The repository URL comes from Vercel's system variables
//     (VERCEL_GIT_PROVIDER, VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG).
//   - GitHub Actions (and a local shallow clone) fetch from `origin`. CI also
//     checks out with fetch-depth: 0, but the 2026-10-10 pull_request run was
//     still shallow, so the build no longer relies on it.
// The fetch asks for HEAD's own commit, so a preview or pull-request build
// gets its own history. The repo is public, so no token is needed; a private
// repo would need one in the URL.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function git(root: string, args: readonly string[]): string {
  // stderr captured, not inherited: an expected miss (a file absent at a
  // revision) throws to the caller without printing git's "fatal:" line.
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const isShallow = (root: string) =>
  git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true'

// The URL to unshallow from on a Vercel build, or undefined elsewhere.
export function vercelRepoUrl(env: NodeJS.ProcessEnv): string | undefined {
  const provider = env.VERCEL_GIT_PROVIDER
  const owner = env.VERCEL_GIT_REPO_OWNER
  const slug = env.VERCEL_GIT_REPO_SLUG
  if (!provider || !owner || !slug) return undefined
  const host = { github: 'github.com', gitlab: 'gitlab.com', bitbucket: 'bitbucket.org' }[provider]
  return host ? `https://${host}/${owner}/${slug}.git` : undefined
}

// Where to fetch the missing history from: the repository Vercel names, else
// the `origin` remote, else nowhere.
function historySource(root: string, env: NodeJS.ProcessEnv): string | undefined {
  const url = vercelRepoUrl(env)
  if (url !== undefined) return url
  return git(root, ['remote']).split('\n').includes('origin') ? 'origin' : undefined
}

// Make the clone complete, or throw. A full clone is left alone; a shallow one
// is deepened from historySource(); with no source, or if it stays shallow,
// the build fails rather than publish wrong dates.
export function ensureFullHistory(root: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!isShallow(root)) return
  const source = historySource(root, env)
  if (source !== undefined) {
    const head = git(root, ['rev-parse', 'HEAD']).trim()
    console.log(`content-dates: shallow clone; fetching the full history of ${head.slice(0, 7)} from ${source}`)
    try {
      git(root, ['fetch', '--quiet', '--unshallow', source, head])
    } catch (err) {
      const stderr = (err as { stderr?: string }).stderr?.trim()
      throw new Error(`content-dates: could not fetch the full history from ${source}: ${stderr || (err as Error).message}`)
    }
    if (!isShallow(root)) return
  }
  throw new Error(
    'content-dates: this is a shallow git clone with nowhere to fetch the rest of its history from, ' +
      'so file change dates would be wrong. Build from a full clone, or one with an `origin` remote ' +
      '(on Vercel the repository comes from VERCEL_GIT_REPO_OWNER / VERCEL_GIT_REPO_SLUG).',
  )
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
