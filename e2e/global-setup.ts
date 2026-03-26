import { request } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, ".auth", "user.json");

/**
 * Global setup — runs once before all tests.
 *
 * Registers a test user via the API and saves the authenticated
 * session (cookies) to a file. All tests that need auth reuse
 * this stored session, avoiding per-test login overhead and
 * rate limit exhaustion.
 */
async function globalSetup() {
  const baseURL = "http://localhost:5000";
  const ctx = await request.newContext({ baseURL });

  const user = {
    username: "e2e_global_user",
    email: "e2e_global@test.com",
    displayName: "E2E Global User",
    password: "testpassword123",
  };

  // Register (ignore 409 if already exists)
  const regRes = await ctx.post("/api/auth/register", { data: user });

  if (regRes.status() === 409) {
    // User exists — login instead
    const loginRes = await ctx.post("/api/auth/login", {
      data: { username: user.username, password: user.password },
    });
    if (loginRes.status() !== 200) {
      throw new Error(`Global setup login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }
  } else if (regRes.status() !== 201) {
    throw new Error(`Global setup register failed: ${regRes.status()} ${await regRes.text()}`);
  }

  // Save the authenticated session state (cookies)
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.dispose();
}

export default globalSetup;
export { AUTH_FILE };
