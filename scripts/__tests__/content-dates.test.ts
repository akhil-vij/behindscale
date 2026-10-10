import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { ensureFullHistory, ignoredRevs, lastContentChange, vercelRepoUrl } from '../content-dates'

// A throwaway repo (OS temp dir, removed after) with dated commits.
const repo = mkdtempSync(join(tmpdir(), 'content-dates-'))
const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const commit = (date: string, file: string, body: string, msg: string) => {
  writeFileSync(join(repo, file), body)
  git('add', file)
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', msg], {
    cwd: repo,
    env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z` },
  })
  return git('rev-parse', 'HEAD')
}

git('init', '-q')
commit('2026-07-01', 'a.json', '{"title": "One"}\n', 'publish')
commit('2026-08-01', 'a.json', '{"title": "Two"}\n', 'real edit')
commit('2026-09-01', 'a.json', '{\n  "title": "Two"\n}\n', 'reformat only')
const meta = commit('2026-10-01', 'a.json', '{\n  "title": "Two",\n  "meta": 1\n}\n', 'metadata strip')

// A depth-1 clone of it, with no remote (like Vercel's clone).
const shallow = mkdtempSync(join(tmpdir(), 'content-dates-shallow-'))
execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo}`, shallow])
execFileSync('git', ['remote', 'remove', 'origin'], { cwd: shallow })

// A depth-1 clone that keeps its origin (like a GitHub Actions checkout).
const shallowWithOrigin = mkdtempSync(join(tmpdir(), 'content-dates-origin-'))
execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo}`, shallowWithOrigin])

afterAll(() => {
  for (const dir of [repo, shallow, shallowWithOrigin]) rmSync(dir, { recursive: true, force: true })
})

describe('lastContentChange', () => {
  it('skips whitespace-only commits', () => {
    expect(lastContentChange(repo, ['a.json'], new Set())).toBe('2026-10-01')
  })

  it('skips commits listed in .git-blame-ignore-revs', () => {
    writeFileSync(join(repo, '.git-blame-ignore-revs'), `# not content\n${meta}\n`)
    const ignore = ignoredRevs(repo)
    expect([...ignore]).toEqual([meta])
    expect(lastContentChange(repo, ['a.json'], ignore)).toBe('2026-08-01')
  })

  it('returns undefined for paths that do not exist', () => {
    expect(lastContentChange(repo, ['missing.json'], new Set())).toBeUndefined()
  })

  it('leaves a full clone alone', () => {
    expect(() => ensureFullHistory(repo, {})).not.toThrow()
  })

  it('refuses a shallow clone with nowhere to fetch from', () => {
    expect(() => ensureFullHistory(shallow, {})).toThrow(/shallow git clone/)
  })

  it('deepens a shallow clone from origin, and then dates correctly', () => {
    ensureFullHistory(shallowWithOrigin, {})
    expect(execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: shallowWithOrigin, encoding: 'utf8' }).trim()).toBe('false')
    expect(lastContentChange(shallowWithOrigin, ['a.json'], new Set([meta]))).toBe('2026-08-01')
  })
})

describe('vercelRepoUrl', () => {
  it('names the repository from the Vercel system variables', () => {
    expect(
      vercelRepoUrl({ VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_REPO_OWNER: 'akhil-vij', VERCEL_GIT_REPO_SLUG: 'behindscale' }),
    ).toBe('https://github.com/akhil-vij/behindscale.git')
  })

  it('is undefined off Vercel or for an unknown provider', () => {
    expect(vercelRepoUrl({})).toBeUndefined()
    expect(
      vercelRepoUrl({ VERCEL_GIT_PROVIDER: 'other', VERCEL_GIT_REPO_OWNER: 'o', VERCEL_GIT_REPO_SLUG: 's' }),
    ).toBeUndefined()
  })
})
