import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { assertFullHistory, ignoredRevs, lastContentChange } from '../content-dates'

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

afterAll(() => rmSync(repo, { recursive: true, force: true }))

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

  it('accepts a full clone', () => {
    expect(() => assertFullHistory(repo)).not.toThrow()
  })
})
