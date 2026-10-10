import { test, expect, type Page } from '@playwright/test'

// The search result line counts exactly what is listed (pre-distribution
// batch A, item 4). Oct 9 review: searching "kafka" on /problems listed 6
// breakdowns under "Showing 1 of 41", because breakdowns surfaced through a
// problem-class match weren't counted.

async function shownCount(page: Page, selector: string): Promise<number> {
  const text = (await page.locator(selector).textContent()) ?? ''
  const m = /Showing (\d+) of (\d+)/.exec(text)
  expect(m, `count line: ${text}`).not.toBeNull()
  return Number(m![1])
}

for (const q of ['kafka', 'idempotency', 'shard']) {
  test(`/problems: the count matches the breakdowns listed for "${q}"`, async ({ page }) => {
    await page.goto('/problems')
    await page.locator('#problems-search').fill(q)
    await expect(page).toHaveURL(new RegExp(`q=${q}`))
    const listed = await page.locator('main article').count()
    expect(listed).toBeGreaterThan(0)
    expect(await shownCount(page, '#problems-count')).toBe(listed)
  })
}

test('/problems: "kafka" lists and counts the class match plus the article match', async ({ page }) => {
  await page.goto('/problems?q=kafka')
  await expect(page.locator('#problems-search')).toHaveValue('kafka')
  const listed = await page.locator('main article').count()
  expect(await shownCount(page, '#problems-count')).toBe(listed)
  expect(listed).toBeGreaterThan(1)
})

for (const q of ['kafka', 'retry']) {
  test(`/patterns: the count matches the patterns listed for "${q}"`, async ({ page }) => {
    await page.goto('/patterns')
    await page.locator('#patterns-search').fill(q)
    const listed = await page.locator('main [id^="term-"]').count()
    expect(await shownCount(page, '#patterns-count')).toBe(listed)
  })
}
