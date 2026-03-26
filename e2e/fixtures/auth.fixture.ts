import { test as base, expect } from "@playwright/test";
import { SidebarComponent } from "../pages/sidebar.page";

/**
 * Auth fixture — provides a pre-authenticated page and sidebar component.
 *
 * Registers a user via the API (or logs in if already registered),
 * using the browser context's request API so the session cookie
 * is automatically shared with the browser page.
 */

let registered = false;

const USER = {
  username: "e2e_fixture_user",
  email: "e2e_fixture@test.com",
  displayName: "E2E Fixture User",
  password: "testpassword123",
};

export const test = base.extend<{
  authedPage: ReturnType<typeof base.extend> extends infer T ? T : never;
  sidebar: SidebarComponent;
}>({
  authedPage: async ({ page, context }, use) => {
    const baseURL = "http://localhost:5000";

    if (!registered) {
      // Try registering first
      const regRes = await context.request.post(`${baseURL}/api/auth/register`, {
        data: USER,
      });
      if (regRes.status() === 201) {
        registered = true;
      }
    }

    if (!registered) {
      // User already exists — login
      const loginRes = await context.request.post(`${baseURL}/api/auth/login`, {
        data: { username: USER.username, password: USER.password },
      });
      if (loginRes.status() !== 200) {
        throw new Error(`Auth fixture login failed: ${loginRes.status()}`);
      }
      registered = true;
    }

    // Verify session is valid by checking /api/auth/me
    const meRes = await context.request.get(`${baseURL}/api/auth/me`);
    if (meRes.status() !== 200) {
      // Session invalid — re-login
      const loginRes = await context.request.post(`${baseURL}/api/auth/login`, {
        data: { username: USER.username, password: USER.password },
      });
      if (loginRes.status() !== 200) {
        throw new Error(`Auth fixture re-login failed: ${loginRes.status()}`);
      }
    }

    await page.goto("/#/");
    await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 15_000 });
    await use(page);
  },

  sidebar: async ({ page }, use) => {
    await use(new SidebarComponent(page));
  },
});

export { expect } from "@playwright/test";
