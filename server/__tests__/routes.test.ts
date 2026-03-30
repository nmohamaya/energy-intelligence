import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";

// Force MemStorage regardless of environment so tests never hit a real DB
vi.stubEnv("DATABASE_URL", "");

const TEST_USER = {
  username: "testuser",
  email: "test@example.com",
  displayName: "Test User",
  password: "testpassword123",
};

describe("API Routes", () => {
  let app: Express;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await createApp();
    app = result.app;

    // Create an agent that persists cookies (session) across requests
    agent = request.agent(app);

    // Register a test user — auto-logs in and persists the session cookie
    await agent
      .post("/api/auth/register")
      .send(TEST_USER)
      .expect(201);
  });

  // --- Auth routes ---

  describe("POST /api/auth/register", () => {
    it("rejects duplicate username", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...TEST_USER, email: "other@example.com" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Username already taken");
    });

    it("rejects duplicate email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...TEST_USER, username: "otheruser" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already in use");
    });

    it("rejects invalid input", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "ab", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: TEST_USER.username, password: TEST_USER.password });
      expect(res.status).toBe(200);
      expect(res.body.username).toBe(TEST_USER.username);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("rejects invalid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: TEST_USER.username, password: "wrongpassword" });
      expect(res.status).toBe(401);
    });

    it("rejects invalid input", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "ab", password: "short" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns current user when authenticated", async () => {
      const res = await agent.get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body.username).toBe(TEST_USER.username);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("returns 401 when not authenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });

  // --- Protected routes: unauthenticated access ---

  describe("Unauthenticated access", () => {
    it("returns 401 for GET /api/dashboard", async () => {
      const res = await request(app).get("/api/dashboard");
      expect(res.status).toBe(401);
    });

    it("returns 401 for GET /api/assets", async () => {
      const res = await request(app).get("/api/assets");
      expect(res.status).toBe(401);
    });

    it("returns 401 for GET /api/predictions", async () => {
      const res = await request(app).get("/api/predictions");
      expect(res.status).toBe(401);
    });

    it("returns 401 for GET /api/analytics", async () => {
      const res = await request(app).get("/api/analytics");
      expect(res.status).toBe(401);
    });
  });

  // --- Protected routes: authenticated access ---

  describe("GET /api/dashboard", () => {
    it("returns 200 with dashboard data", async () => {
      const res = await agent.get("/api/dashboard");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("kpis");
      expect(res.body).toHaveProperty("productionHistory");
      expect(res.body).toHaveProperty("assetBreakdown");
      expect(res.body).toHaveProperty("topAssets");
      expect(res.body).toHaveProperty("recentAlerts");
    });
  });

  describe("GET /api/assets", () => {
    it("returns 200 with array of assets", async () => {
      const res = await agent.get("/api/assets");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(20);
    });

    it("filters by type", async () => {
      const res = await agent.get("/api/assets?type=Solar");
      expect(res.status).toBe(200);
      expect(res.body.every((a: { type: string }) => a.type === "Solar")).toBe(true);
    });

    it("filters by search", async () => {
      const res = await agent.get("/api/assets?search=Brandenburg");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("returns empty array for non-matching search", async () => {
      const res = await agent.get("/api/assets?search=zzz_nonexistent_zzz");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe("GET /api/assets/:id", () => {
    it("returns 200 for existing asset", async () => {
      const res = await agent.get("/api/assets/asset-1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("asset-1");
      expect(res.body.name).toBe("Brandenburg Solar Park");
    });

    it("returns 404 for non-existent asset", async () => {
      const res = await agent.get("/api/assets/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /api/predictions", () => {
    it("returns 200 with predictions array", async () => {
      const res = await agent.get("/api/predictions");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(12);
    });

    it("filters by risk level", async () => {
      const res = await agent.get("/api/predictions?risk=Critical");
      expect(res.status).toBe(200);
      expect(res.body.every((p: { riskLevel: string }) => p.riskLevel === "Critical")).toBe(true);
    });
  });

  describe("GET /api/digital-twin/:assetId", () => {
    it("returns 200 with twin data for existing asset", async () => {
      const res = await agent.get("/api/digital-twin/asset-1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("asset");
      expect(res.body).toHaveProperty("realTimeMetrics");
      expect(res.body).toHaveProperty("scenarios");
      expect(res.body.asset.id).toBe("asset-1");
    });

    it("returns 404 for non-existent asset", async () => {
      const res = await agent.get("/api/digital-twin/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/analytics", () => {
    it("returns 200 with analytics data", async () => {
      const res = await agent.get("/api/analytics");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("curtailmentHistory");
      expect(res.body).toHaveProperty("lossBreakdown");
      expect(res.body).toHaveProperty("dispatchSchedule");
      expect(res.body).toHaveProperty("revenueCards");
    });
  });

  // --- Security headers (Helmet.js) ---

  describe("Security headers", () => {
    it("sets X-Content-Type-Options on API responses", async () => {
      const res = await agent.get("/api/dashboard");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("sets X-Frame-Options on API responses", async () => {
      const res = await agent.get("/api/dashboard");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("sets Referrer-Policy on API responses", async () => {
      const res = await agent.get("/api/dashboard");
      expect(res.headers["referrer-policy"]).toBeDefined();
    });

    it("does not expose X-Powered-By header", async () => {
      const res = await agent.get("/api/dashboard");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  // --- Logout ---

  describe("POST /api/auth/logout", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(401);
    });

    it("logs out and invalidates session", async () => {
      // Create a fresh agent, register + login
      const logoutAgent = request.agent(app);
      await logoutAgent
        .post("/api/auth/register")
        .send({
          username: "logouttest",
          email: "logout@example.com",
          displayName: "Logout Tester",
          password: "testpassword123",
        })
        .expect(201);

      // Verify session works
      await logoutAgent.get("/api/auth/me").expect(200);

      // Logout
      await logoutAgent.post("/api/auth/logout").expect(200);

      // Session should be invalid now
      const res = await logoutAgent.get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });
});
