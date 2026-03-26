import { test, expect } from "./fixtures/auth.fixture";

/**
 * Theme toggle E2E tests — dark/light mode switching.
 *
 * The ThemeProvider applies a "dark" class to the <html> element.
 */

test.describe("Theme", () => {
  test("toggles between light and dark mode", async ({ authedPage, sidebar }) => {
    const page = authedPage;
    const html = page.locator("html");

    // Get initial theme state
    const initialClass = await html.getAttribute("class") ?? "";
    const startsInDark = initialClass.includes("dark");

    // Toggle theme
    await sidebar.toggleTheme();

    // Theme should change
    if (startsInDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    // Toggle back
    await sidebar.toggleTheme();

    // Should be back to original
    if (startsInDark) {
      await expect(html).toHaveClass(/dark/);
    } else {
      await expect(html).not.toHaveClass(/dark/);
    }
  });

  test("theme persists across navigation", async ({ authedPage, sidebar }) => {
    const page = authedPage;
    const html = page.locator("html");

    // Toggle to ensure we're in dark mode
    const initialClass = await html.getAttribute("class") ?? "";
    if (!initialClass.includes("dark")) {
      await sidebar.toggleTheme();
    }
    await expect(html).toHaveClass(/dark/);

    // Navigate to another page — set up response listener before navigating
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/assets") && res.status() === 200,
      { timeout: 15_000 },
    );
    await sidebar.navigateTo("fleet");
    await responsePromise;

    // Theme should still be dark
    await expect(html).toHaveClass(/dark/);
  });
});
