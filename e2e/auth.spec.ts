import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

/**
 * Authentication E2E tests — registration, login, logout, and error handling.
 *
 * These tests run WITHOUT the auth fixture (each test starts unauthenticated)
 * since they're testing the auth flow itself.
 */

// Unique user per test run to avoid collisions
const uniqueId = Date.now().toString(36);

test.describe("Authentication", () => {
  test.describe("Login page", () => {
    test("shows login form by default", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.title.first()).toBeVisible();
      await expect(loginPage.signInTab).toBeVisible();
      await expect(loginPage.registerTab).toBeVisible();
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.signInButton).toBeVisible();
    });

    test("switches to register tab", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.registerTab.click();
      await expect(loginPage.regUsername).toBeVisible();
      await expect(loginPage.regEmail).toBeVisible();
      await expect(loginPage.regDisplayName).toBeVisible();
      await expect(loginPage.regPassword).toBeVisible();
      await expect(loginPage.createAccountButton).toBeVisible();
    });
  });

  test.describe("Registration", () => {
    test("registers a new user and redirects to dashboard", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.register(
        `auth_reg_${uniqueId}`,
        `auth_reg_${uniqueId}@test.com`,
        "Auth Test User",
        "testpassword123",
      );

      // Should redirect to dashboard (sidebar becomes visible)
      await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10_000 });
    });

    test("shows error for duplicate username", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Register first user
      const username = `auth_dup_${uniqueId}`;
      await loginPage.register(username, `${username}@test.com`, "Dup User", "testpassword123");
      await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10_000 });

      // Sign out and try to register with same username
      await page.getByRole("button", { name: /Sign Out/i }).click();
      await expect(loginPage.signInTab).toBeVisible({ timeout: 10_000 });

      await loginPage.register(username, `${username}_2@test.com`, "Dup User 2", "testpassword123");
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Login", () => {
    const loginUser = `auth_login_${uniqueId}`;

    test.beforeAll(async ({ request }) => {
      // Register user via API for login tests
      await request.post("/api/auth/register", {
        data: {
          username: loginUser,
          email: `${loginUser}@test.com`,
          displayName: "Login Test",
          password: "testpassword123",
        },
      });
    });

    test("logs in with valid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(loginUser, "testpassword123");

      await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10_000 });
    });

    test("shows error for wrong password", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(loginUser, "wrongpassword");

      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5_000 });
    });

    test("shows error for non-existent user", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login("nonexistent_user_xyz", "testpassword123");

      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Logout", () => {
    test("signs out and returns to login page", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Register and sign in
      const user = `auth_logout_${uniqueId}`;
      await loginPage.register(user, `${user}@test.com`, "Logout User", "testpassword123");
      await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10_000 });

      // Sign out
      await page.getByRole("button", { name: /Sign Out/i }).click();

      // Should see login page again
      await expect(loginPage.signInTab).toBeVisible({ timeout: 10_000 });
    });
  });
});
