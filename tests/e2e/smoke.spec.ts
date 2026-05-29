import { test, expect } from '@playwright/test'

// Single smoke test covering all four routes per testing-strategy in
// code-standards.md. The goal is to catch routing/rendering regressions
// cheaply -- after each navigation we assert the URL is correct AND that
// a page-specific element rendered (so a silent crash to a blank page
// fails the test, not just routing).
test('navigates / -> article -> pattern via chip -> patterns via navbar without crash', async ({
  page,
}) => {
  // 1. Load the article index.
  await page.goto('/')
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: /designing robust and predictable apis with idempotency/i,
    }),
  ).toBeVisible()

  // 2. Click the article title -> /articles/:slug.
  await page
    .getByRole('link', {
      name: /designing robust and predictable apis with idempotency/i,
    })
    .click()
  await expect(page).toHaveURL(/#\/articles\/stripe-idempotency$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /designing robust and predictable apis with idempotency/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Problem' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Solution' })).toBeVisible()

  // 3. Click the Atomic Phases pattern chip -> /patterns/:slug.
  await page.getByRole('link', { name: 'Atomic Phases' }).first().click()
  await expect(page).toHaveURL(/#\/patterns\/atomic-phases$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Atomic Phases' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Definition' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'When it applies' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Seen in' }),
  ).toBeVisible()

  // 4. Click "Patterns" in the navbar -> /patterns.
  await page.getByRole('navigation').getByRole('link', { name: 'Patterns' }).click()
  await expect(page).toHaveURL(/#\/patterns$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Patterns' }),
  ).toBeVisible()
  // The single sample PatternCard renders.
  await expect(
    page.getByRole('heading', { level: 3, name: 'Atomic Phases' }),
  ).toBeVisible()
})
