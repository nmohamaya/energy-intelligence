import { test, expect } from "./fixtures/auth.fixture";

/**
 * Fleet page E2E tests — asset list, API response validation.
 */

test.describe("Fleet", () => {
  test("loads and displays asset data", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/assets") && !res.url().includes("/api/assets/") && res.status() === 200,
      { timeout: 15_000 },
    );
    await sidebar.navigateTo("fleet");
    await responsePromise;

    const mainContent = page.getByTestId("main-content");
    await expect(mainContent).not.toBeEmpty();

    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(100);
  });

  test("assets API returns array of assets", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/assets") && !res.url().includes("/api/assets/") && res.status() === 200,
      { timeout: 15_000 },
    );
    await sidebar.navigateTo("fleet");
    const response = await responsePromise;
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty("name");
    expect(body[0]).toHaveProperty("type");
    expect(body[0]).toHaveProperty("status");
  });
});
