import { defineConfig, devices } from '@playwright/test';

/**
 * F.A.S. Motorsports — Playwright E2E Configuration
 * Tests run against production (https://fasmotorsports.com)
 * unless BASE_URL env var is set to a local dev server.
 *
 * Usage:
 *   yarn playwright test                             # all tests
 *   yarn playwright test tests/e2e/checkout.spec.ts  # single file
 *   yarn playwright test --headed                    # watch mode
 */

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // run sequentially to avoid cart collision on shared state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://fasmotorsports.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
