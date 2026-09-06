import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The click-through suite renders the mission artifact SOURCE (.jsx) with
  // React; the artifacts use the automatic JSX runtime (same as
  // scripts/compile-artifacts.ts).
  esbuild: { jsx: 'automatic' },
  test: {
    include: [
      'src/**/__tests__/**/*.test.ts',
      'scripts/**/__tests__/**/*.test.ts',
      // The problem-page v7.3 port suites (§5.1 rules parity, §5.2/§5.3
      // click-through + cue exclusivity). The click-through opts into jsdom
      // per file (`// @vitest-environment jsdom`).
      'tests/unit/**/*.test.ts',
    ],
    environment: 'node',
  },
})
