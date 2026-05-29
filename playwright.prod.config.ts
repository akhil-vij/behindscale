import { defineConfig, devices } from '@playwright/test'

// Production smoke config -- runs the same Playwright suite against a
// live deployed URL rather than a local build.
//
// Reads the target from the BASE_URL env var, defaulting to the
// canonical production URL (https://www.behindscale.com -- apex
// redirects here). Pass BASE_URL=https://<preview>.vercel.app for
// preview-deploy verification, or any other URL for ad hoc checks.
//
// No webServer block here: the target is already running externally.
// The existing playwright.config.ts (build + vite preview on :4173)
// remains the local CI/regression config.
const baseURL = process.env.BASE_URL ?? 'https://www.behindscale.com'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
