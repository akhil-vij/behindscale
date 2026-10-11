import { test, expect, type Frame, type Page } from '@playwright/test'

// /problems/queue-backlog, the second full lesson: the browser half of its
// suite, the same checks page 1 carries (tests/e2e/problem-page.spec.ts):
//   - the real iframe round-trip: a survived day fills the YOU column and
//     diagram, the commit persists, and a reload restores the design;
//   - a restored, fully held design shows all five interview ticks and the
//     mission's debrief;
//   - reduced motion: no narration or card is replaced before its reading
//     time, on the first day or a repeat, and RUN is the primary button;
//   - phones: no sideways scroll at 390, with the YOU column filled;
//   - every comparison diagram's text is at least 11px on screen.

const PAGE = '/problems/queue-backlog'
const WALL = 'buffer-degrades-under-backlog'
// "done" comes before "stuck": setting a stuck job aside needs a confirmed job first.
const CLEAN = { where: 'log', full: 'relay', done: 'watermark', stuck: 'ackaround', order: 'tenant', retry: 'cutoff' }

async function frameClick(frame: Frame, selector: string): Promise<void> {
  await frame.locator(selector).waitFor({ state: 'attached' })
  await frame.locator(selector).evaluate((el) => (el as HTMLElement).click())
}
function frameOf(page: Page, slug: string): Frame {
  const f = page.frames().find((fr) => fr.url().includes(`/artifacts/${slug}/`))
  expect(f, `artifact frame ${slug} must be present`).toBeTruthy()
  return f!
}
async function waitForMission(page: Page): Promise<Frame> {
  await page.waitForLoadState('networkidle')
  const f = frameOf(page, 'problem-queue-backlog-mission')
  await f.locator('#runbtn').waitFor({ state: 'visible', timeout: 30_000 })
  return f
}
// A saved record, as the host writes it, so a test can start from a survived
// (or fully held) design without playing it.
function seed(page: Page, held: boolean[], decisions: Record<string, string> = CLEAN) {
  return page.addInitScript(([key, rec]) => localStorage.setItem(key, rec), [
    `bs:wall:${WALL}`,
    JSON.stringify({ v: 1, checkpoints: { caused: true, survived: true, held: held.every(Boolean) }, saved: { decisions, survived: true, held } }),
  ] as const)
}

test.describe('queue-backlog: the real iframe round-trip', () => {
  test('a survived day fills YOU; the commit persists; a reload restores the design', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    await expect(page.locator('#you-th')).not.toHaveText('YOU')
    for (const [k, v] of Object.entries(CLEAN)) await frameClick(mission, `#deck button[data-k="${k}"][data-v="${v}"]`)
    await frameClick(mission, '#runbtn')
    await page.locator('#artB iframe').scrollIntoViewIfNeeded()
    await mission.waitForFunction(
      () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled && document.getElementById('escwrap')!.style.display !== 'none',
      null,
      { timeout: 240_000 },
    )
    // the YOU column and diagram fill from the wall's youMapping()
    await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 15_000 })
    const glance = await page.locator('#glance').innerText()
    expect(glance).toContain('A log on disk')
    expect(glance).toContain('Nobody: a rate-limited relay')
    expect(await page.locator('svg.anat').filter({ hasText: 'A LOG ON DISK' }).count()).toBeGreaterThan(0)
    // commit
    await mission.locator('#cmt-input').fill('Disk in front and a relay.')
    await frameClick(mission, '#cmt-lock')
    await expect.poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.commit, `bs:wall:${WALL}`)).toBe('Disk in front and a relay.')
    // reload: the design and the sentence come back without playing
    await page.reload()
    const again = await waitForMission(page)
    await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 30_000 })
    await expect(again.locator('#runbtn')).toHaveText('RUN AGAIN ▶')
    await expect(again.locator('#cmt-locked')).toContainText('Disk in front and a relay.')
    expect(await again.locator('#escwrap').evaluate((e) => (e as HTMLElement).style.display)).not.toBe('none')
  })
})

test.describe('queue-backlog: a fully held design', () => {
  test('all five interview ticks show held, the debrief is in the mission, and the still-breaks line names nothing', async ({ page }) => {
    await seed(page, [true, true, true, true, true], { ...CLEAN, dedupe: 'yes', retention: '7d', archive: 'replay' })
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 30_000 })
    await expect(page.locator('.tick-held')).toHaveCount(5)
    await expect(mission.locator('#debrief')).toContainText('HELD UNDER ATTACK: THE DEBRIEF')
    await expect(mission.locator('#lvls .lvl .done:visible')).toHaveCount(5)
    expect(await page.locator('#glance').innerText()).toContain('Nothing the five posts name. See the bill for what it costs')
  })
})

// ---- reduced motion: reading time on every day ----------------------------

async function readingDay(mission: Frame, page: Page): Promise<{ checked: number; short: string[] }> {
  await mission.evaluate(() => {
    const w = window as unknown as { __shown: { where: string; t: number; text: string }[]; __obs?: boolean }
    w.__shown = []
    if (w.__obs) return
    w.__obs = true
    for (const where of ['narr', 'slot']) {
      const el = document.getElementById(where)!
      new MutationObserver(() => {
        const text = el.innerText.replace(/\s+/g, ' ').trim()
        const last = w.__shown.filter((x) => x.where === where).pop()
        if (!last || last.text !== text) w.__shown.push({ where, t: performance.now(), text })
      }).observe(el, { childList: true, subtree: true, characterData: true })
    }
  })
  await page.locator('#artB iframe').scrollIntoViewIfNeeded()
  await frameClick(mission, '#runbtn')
  await mission.waitForFunction(
    () => !(document.getElementById('runbtn') as HTMLButtonElement).disabled && /RUN AGAIN/.test(document.getElementById('runbtn')!.textContent!),
    null,
    { timeout: 240_000 },
  )
  const shown = await mission.evaluate(() => (window as unknown as { __shown: { where: string; t: number; text: string }[] }).__shown)
  const short: string[] = []
  let checked = 0
  for (const where of ['narr', 'slot']) {
    const items = shown.filter((x) => x.where === where)
    for (let i = 0; i + 1 < items.length; i++) {
      if (!items[i].text) continue
      const words = items[i].text.split(' ').length
      const need = Math.max(1500, (words * 1000) / 4)
      const on = items[i + 1].t - items[i].t
      checked++
      if (on + 50 < need) short.push(`${where} "${items[i].text.slice(0, 50)}" ${words} words: ${Math.round(on)}ms < ${need}ms`)
    }
  }
  return { checked, short }
}

test.describe('queue-backlog: reduced motion keeps reading time on every day', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' }, viewport: { width: 390, height: 844 } })

  test('no narration or card is replaced before its reading time, first day or repeat; RUN is the primary button', async ({ page }) => {
    test.setTimeout(600_000)
    await page.goto(PAGE)
    const mission = await waitForMission(page)
    expect(await mission.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    const look = await mission.evaluate(() => {
      const bg = (id: string) => getComputedStyle(document.getElementById(id)!).backgroundColor
      return { run: bg('runbtn'), step: bg('stepbtn') }
    })
    expect(look.run).not.toBe('rgba(0, 0, 0, 0)')
    expect(look.run).not.toBe(look.step)
    for (const day of [1, 2]) {
      const r = await readingDay(mission, page)
      expect(r.checked, `day ${day}`).toBeGreaterThan(8)
      expect(r.short, `day ${day}`).toEqual([])
    }
  })
})

// ---- phones and diagram text ----------------------------------------------

test.describe('queue-backlog: phones', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('no sideways scroll at 390, with the YOU column filled', async ({ page }) => {
    await seed(page, [true, false, false, false, false], { ...CLEAN, dedupe: 'yes' })
    await page.goto(PAGE)
    await waitForMission(page)
    await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 30_000 })
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true)))
    const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }))
    expect(scroll).toBeLessThanOrEqual(inner)
  })
})

test.describe('queue-backlog: comparison diagrams, every label at least 11px', () => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    test(`${w}px: the five company diagrams and YOU, empty and filled`, async ({ browser }) => {
      test.setTimeout(120_000)
      const measure = async (filled: boolean) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } })
        const page = await ctx.newPage()
        if (filled) await seed(page, [false, false, false, false, false])
        await page.goto(PAGE)
        await waitForMission(page)
        if (filled) await expect(page.locator('#you-th')).toHaveText('YOU', { timeout: 30_000 })
        await page.evaluate(() => document.fonts.ready)
        const res = await page.evaluate(() => {
          document.querySelectorAll<HTMLDetailsElement>('details.anat-row').forEach((d) => (d.open = true))
          const rows: { name: string; min: number; text: string }[] = []
          for (const svg of Array.from(document.querySelectorAll<SVGSVGElement>('svg.anat, svg.win'))) {
            const r = svg.getBoundingClientRect()
            if (r.width === 0) continue
            const k = r.width / svg.viewBox.baseVal.width
            let min = Infinity, text = ''
            for (const t of Array.from(svg.querySelectorAll('text'))) {
              if (!t.textContent!.trim()) continue
              const px = parseFloat(getComputedStyle(t).fontSize) * k
              if (px < min) { min = px; text = t.textContent!.trim() }
            }
            rows.push({ name: svg.closest('details')?.querySelector('.co')?.textContent?.trim() ?? '?', min, text })
          }
          return rows
        })
        await ctx.close()
        return res
      }
      const empty = await measure(false)
      const filled = (await measure(true)).filter((r) => r.name === 'You')
      expect(empty.length).toBe(6) // 5 companies + YOU
      expect(filled.length).toBe(1)
      for (const r of [...empty, ...filled]) expect(r.min, `${r.name}: "${r.text}"`).toBeGreaterThanOrEqual(11)
    })
  }
})

// ---- the stages: wall 2 drawings ------------------------------------------

test.describe('stages: every label at least 11px on screen', () => {
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    test(`${w}px: both walls' try-it stage and this wall's mission stage`, async ({ browser }) => {
      test.setTimeout(120_000)
      const ctx = await browser.newContext({ viewport: { width: w, height: h } })
      const page = await ctx.newPage()
      const smallest = (frame: Frame, sel: string) =>
        frame.evaluate((s) => {
          const svg = Array.from(document.querySelectorAll<SVGSVGElement>(s)).find((x) => x.getBoundingClientRect().width > 0)!
          const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
          let min = Infinity, text = ''
          for (const t of Array.from(svg.querySelectorAll('text'))) {
            if (!t.textContent!.trim() || t.closest('[data-part="stuckmark"], #poisonmark, .s-cutzone')) continue // "!" and "1" are icon marks
            const px = parseFloat(getComputedStyle(t).fontSize) * k
            if (px < min) { min = px; text = t.textContent!.trim() }
          }
          return { min, text, vb: svg.getAttribute('viewBox') }
        }, sel)
      for (const [path, slug] of [[PAGE, 'problem-queue-backlog-tryit'], ['/problems/ambiguous-timeouts', 'problem-ambiguous-timeouts-tryit']] as const) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const f = frameOf(page, slug)
        await f.locator('svg.stage').first().waitFor({ state: 'attached' })
        const r = await smallest(f, 'svg.stage')
        expect(r.vb).toBe(w < 700 ? '0 0 360 300' : '0 0 640 138')
        // the horizontal try-it labels are 8.5 units at a 918px frame (12.2px)
        expect(r.min, `${slug} "${r.text}"`).toBeGreaterThanOrEqual(11)
      }
      await page.goto(PAGE)
      const mission = await waitForMission(page)
      const m = await smallest(mission, '#bstage')
      expect(m.vb).toBe(w < 700 ? '0 0 360 514' : '0 0 640 244')
      expect(m.min, `mission "${m.text}"`).toBeGreaterThanOrEqual(11)
      await ctx.close()
    })
  }
})
