import { test, expect } from '@playwright/test'

// The 404 page leads home (pre-distribution batch A, item 5). Same for the
// unknown-article state, which is the same dead end one level down.
for (const path of ['/404', '/no-such-page', '/articles/no-such-article']) {
  test(`${path}: "Back to home" links to /`, async ({ page }) => {
    await page.goto(path)
    const back = page.getByRole('link', { name: /Back to home/ })
    await expect(back).toHaveAttribute('href', '/')
    await back.click()
    await expect(page).toHaveURL(/\/$/)
  })
}
