import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the Fleet page (/#/fleet).
 *
 * Displays the asset fleet table with type/status filters
 * and a search box. Data from GET /api/assets.
 */
export class FleetPage {
  readonly page: Page;
  readonly mainContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainContent = page.getByTestId("main-content");
  }

  async goto() {
    await this.page.goto("/#/fleet");
  }

  async waitForData() {
    await this.page.waitForResponse(
      (res) => res.url().includes("/api/assets") && res.status() === 200,
      { timeout: 15_000 }
    );
  }
}
