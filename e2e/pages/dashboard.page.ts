import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the Dashboard page (/#/).
 *
 * The dashboard displays portfolio KPIs, charts, alerts, and
 * a fleet status summary — all fetched from GET /api/dashboard.
 */
export class DashboardPage {
  readonly page: Page;

  // The main content area (inside sidebar layout)
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContent = page.getByTestId("main-content");
  }

  async goto() {
    await this.page.goto("/#/");
  }

  /** Wait for the dashboard data to load (API response received). */
  async waitForData() {
    await this.page.waitForResponse(
      (res) => res.url().includes("/api/dashboard") && res.status() === 200,
      { timeout: 15_000 }
    );
  }
}
