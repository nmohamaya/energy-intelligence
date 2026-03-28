import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the sidebar navigation component.
 *
 * The sidebar is always visible when authenticated and provides
 * navigation links, theme toggle, collapse, and sign-out.
 */
export class SidebarComponent {
  readonly page: Page;

  readonly sidebar: Locator;
  readonly mainContent: Locator;

  // Navigation links (by data-testid)
  readonly navDashboard: Locator;
  readonly navFleet: Locator;
  readonly navMaintenance: Locator;
  readonly navDigitalTwin: Locator;
  readonly navAnalytics: Locator;
  readonly navMap: Locator;

  // Bottom controls
  readonly themeToggle: Locator;
  readonly collapseButton: Locator;
  readonly signOutButton: Locator;

  // User profile
  readonly userDisplayName: Locator;
  readonly userRoleBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sidebar = page.getByTestId("sidebar");
    this.mainContent = page.getByTestId("main-content");

    this.navDashboard = page.getByTestId("nav-dashboard");
    this.navFleet = page.getByTestId("nav-fleet");
    this.navMaintenance = page.getByTestId("nav-maintenance");
    this.navDigitalTwin = page.getByTestId("nav-digital-twin");
    this.navAnalytics = page.getByTestId("nav-analytics");
    this.navMap = page.getByTestId("nav-map");

    this.themeToggle = page.getByTestId("button-theme-toggle");
    this.collapseButton = page.getByTestId("button-collapse-sidebar");
    this.signOutButton = page.getByRole("button", { name: /Sign Out/i });

    this.userDisplayName = this.sidebar.locator("p.text-xs.font-medium");
    this.userRoleBadge = this.sidebar.locator("div.border-t").getByRole("status").or(
      this.sidebar.locator("div.border-t .text-\\[10px\\]")
    );
  }

  async navigateTo(name: "dashboard" | "fleet" | "maintenance" | "digital-twin" | "analytics" | "map") {
    const nav: Record<string, Locator> = {
      dashboard: this.navDashboard,
      fleet: this.navFleet,
      maintenance: this.navMaintenance,
      "digital-twin": this.navDigitalTwin,
      analytics: this.navAnalytics,
      map: this.navMap,
    };
    await nav[name].click();
  }

  async signOut() {
    await this.signOutButton.click();
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async collapse() {
    await this.collapseButton.click();
  }
}
