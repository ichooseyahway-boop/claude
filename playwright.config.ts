import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke configuration.
 *
 * PRD ref: 21.1 step 8 ("Targeted E2E smoke tests").
 *
 * "Targeted" is the operative word. These run against a production build with
 * no vendor credentials, so they cover exactly what is verifiable in that
 * state: that the public site renders in both languages, that unauthenticated
 * requests to the authenticated surfaces do not serve content, and that a
 * feature with no provider says so rather than presenting a form that fails
 * silently.
 *
 * They deliberately do not attempt a sign-in. There is no auth provider in CI,
 * and a smoke test that stubs one would be asserting the stub.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The environment pre-installs Chromium and sets
        // PLAYWRIGHT_BROWSERS_PATH; `playwright install` must not run.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? {
              launchOptions: {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
              },
            }
          : {}),
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- --port 3100',
        url: 'http://127.0.0.1:3100/en',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
