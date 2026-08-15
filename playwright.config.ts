import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Prefer the Chromium pre-installed in this container (its revision may differ
// from the one @playwright/test pins, so point at it explicitly and never
// trigger a download). If it's absent — e.g. GitHub CI, where
// `playwright install` provisions the managed browser — fall back to undefined
// so Playwright uses its own.
const candidate =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const CHROMIUM_PATH = existsSync(candidate) ? candidate : undefined;

// Running as root in a container requires disabling the sandbox.
const launchOptions = {
  executablePath: CHROMIUM_PATH,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
};

/**
 * E2E smoke tests run against a production build (`next start`) for realism.
 * Chromium is pre-installed in this environment; do not run `playwright install`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions,
      },
    },
    {
      // Plain Chromium at a phone-width viewport. This exercises the responsive
      // breakpoints (mobile nav, stacked hero) without the device-emulation
      // path, which is unstable on this container's Chromium build.
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        launchOptions,
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
