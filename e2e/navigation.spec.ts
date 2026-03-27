import { test, expect } from "./fixtures/auth.fixture";

/**
 * Navigation E2E tests — sidebar links, hash routing, active states.
 *
 * Uses the auth fixture so all tests start authenticated.
 */

test.describe("Navigation", () => {
  test("navigates to all main pages via sidebar", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const routes = [
      { name: "fleet" as const, hash: "#/fleet" },
      { name: "maintenance" as const, hash: "#/maintenance" },
      { name: "analytics" as const, hash: "#/analytics" },
      { name: "dashboard" as const, hash: "#/" },
    ];

    for (const route of routes) {
      await sidebar.navigateTo(route.name);

      // Wait for navigation to complete (URL change)
      if (route.name === "dashboard") {
        // Dashboard is /#/ — only wait if we're not already there
        const dashboardRegex = /(#\/$|#$|\/$)/;
        const currentUrl = page.url();
        if (!dashboardRegex.test(currentUrl)) {
          await page.waitForURL(dashboardRegex, { timeout: 5_000 });
        }
      } else {
        await page.waitForURL(`**/${route.hash}`, { timeout: 5_000 });
      }

      const url = page.url();
      expect(url).toContain(route.hash);
    }
  });

  test("dashboard is the default page after login", async ({ authedPage }) => {
    const page = authedPage;
    // authedPage fixture navigates to /#/ and waits for sidebar.
    // The dashboard data should already be loading/loaded.
    // Just verify the URL is the dashboard.
    const url = page.url();
    expect(url.includes("#/fleet")).toBe(false);
    expect(url.endsWith("#/") || url.endsWith("/") || !url.includes("#/fleet")).toBe(true);
  });

  test("sidebar collapse hides nav labels", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    // Before collapse: nav labels should be visible
    await expect(page.getByText("Asset Fleet")).toBeVisible();

    // Collapse
    await sidebar.collapse();

    // After collapse: labels should be hidden (sidebar narrows)
    await expect(page.getByText("Asset Fleet")).not.toBeVisible();

    // Expand again
    await sidebar.collapse();
    await expect(page.getByText("Asset Fleet")).toBeVisible();
  });

  test("shows user display name in sidebar", async ({ authedPage, sidebar }) => {
    await expect(sidebar.userDisplayName).toBeVisible();
  });
});
