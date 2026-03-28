import { test, expect } from "./fixtures/auth.fixture";

/**
 * Maintenance & Analytics page E2E tests.
 */

test.describe("Predictive Maintenance", () => {
  test("loads prediction data", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/predictions") && res.status() === 200,
      { timeout: 15_000 },
    );

    await sidebar.navigateTo("maintenance");
    const response = await responsePromise;
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty("riskLevel");
  });

  test("displays content after data loads", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/predictions") && res.status() === 200,
      { timeout: 15_000 },
    );
    await sidebar.navigateTo("maintenance");
    await responsePromise;

    const mainContent = page.getByTestId("main-content");
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(50);
  });
});

test.describe("Energy Analytics", () => {
  test("loads analytics data", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/analytics") && res.status() === 200,
      { timeout: 15_000 },
    );

    await sidebar.navigateTo("analytics");
    const response = await responsePromise;
    const body = await response.json();

    expect(body).toBeTruthy();
    expect(typeof body).toBe("object");
  });

  test("displays analytics content", async ({ authedPage, sidebar }) => {
    const page = authedPage;

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/analytics") && res.status() === 200,
      { timeout: 15_000 },
    );
    await sidebar.navigateTo("analytics");
    await responsePromise;

    const mainContent = page.getByTestId("main-content");
    const text = await mainContent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(50);
  });
});
