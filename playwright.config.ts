import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 *
 * Auth tests run first (no pre-existing session), then all other
 * tests run with auth handled by the auth fixture (API-level login).
 * Single worker avoids rate limit exhaustion.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Auth tests run first — they test the auth flow itself (no stored session)
    {
      name: "auth",
      testMatch: "auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // All other tests — auth fixture handles login via API
    {
      name: "authenticated",
      testIgnore: "auth.spec.ts",
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "NODE_ENV=test tsx server/index.ts",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
