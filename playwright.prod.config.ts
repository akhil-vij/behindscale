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
    // Override Playwright's default user-agent (which includes
    // "HeadlessChrome") with a normal Desktop Chrome UA. Vercel's
    // bot-detection serves a JS security checkpoint to anything that
    // looks scripted, and the checkpoint page doesn't include the
    // navbar/articles the smoke asserts on -- so the test fails
    // before the real app ever loads. The override only affects
    // prod-target runs; the local config (vite preview at :4173) has
    // no such gate.
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
