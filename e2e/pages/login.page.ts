import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the Login / Register page.
 *
 * Encapsulates all selectors and actions for authentication flows.
 * The app uses hash-based routing, so the login page is at /#/ (no dedicated route —
 * it's shown whenever there is no authenticated session).
 */
export class LoginPage {
  readonly page: Page;

  // Tab triggers
  readonly signInTab: Locator;
  readonly registerTab: Locator;

  // Login form
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  // Register form
  readonly regUsername: Locator;
  readonly regEmail: Locator;
  readonly regDisplayName: Locator;
  readonly regPassword: Locator;
  readonly createAccountButton: Locator;

  // Feedback
  readonly errorMessage: Locator;

  // Branding
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;

    this.signInTab = page.getByRole("tab", { name: "Sign In" });
    this.registerTab = page.getByRole("tab", { name: "Register" });

    // Login form fields (by label)
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign In" });

    // Register form fields (by id — needed because labels repeat across tabs)
    this.regUsername = page.locator("#reg-username");
    this.regEmail = page.locator("#reg-email");
    this.regDisplayName = page.locator("#reg-displayName");
    this.regPassword = page.locator("#reg-password");
    this.createAccountButton = page.getByRole("button", { name: "Create Account" });

    this.errorMessage = page.locator(".text-destructive.bg-destructive\\/10");
    this.title = page.getByText("Energy Intelligence");
  }

  async goto() {
    await this.page.goto("/");
  }

  async login(username: string, password: string) {
    await this.signInTab.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async register(username: string, email: string, displayName: string, password: string) {
    await this.registerTab.click();
    await this.regUsername.fill(username);
    await this.regEmail.fill(email);
    await this.regDisplayName.fill(displayName);
    await this.regPassword.fill(password);
    await this.createAccountButton.click();
  }
}
