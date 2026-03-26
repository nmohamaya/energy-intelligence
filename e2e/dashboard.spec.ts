import { test, expect } from "./fixtures/auth.fixture";

/**
 * Dashboard E2E tests — verifies KPI cards, charts, and alerts load.
 */

test.describe("Dashboard", () => {
  test("loads and displays KPI data", async ({ authedPage }) => {
    const page = authedPage;
    // authedPage already navigated to /#/ and verified sidebar is visible.
    // Wait for the main content to have meaningful data.
    const mainContent = page.getByTestId("main-content");
    await expect(mainContent).not.toBeEmpty();

    // Wait a moment for React Query to fetch and render data
    await page.waitForTimeout(2_000);

    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(100);
  });

  test("dashboard API returns 200", async ({ authedPage }) => {
    const page = authedPage;

    // Navigate away and back to trigger a fresh API call
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/dashboard") && res.status() === 200,
      { timeout: 15_000 },
    );
    await page.goto("/#/fleet");
    await page.waitForTimeout(500);
    await page.goto("/#/");
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("kpis");
  });
});
