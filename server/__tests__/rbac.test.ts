/**
 * RBAC integration tests — verifies role-based access control
 * through the full Express middleware chain using supertest.
 *
 * Mounts test-only routes with requireRole middleware, then
 * exercises them with users of different roles to verify
 * the complete auth + RBAC pipeline end-to-end.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";

// Force MemStorage
vi.stubEnv("DATABASE_URL", "");

const ADMIN_USER = {
  username: "rbac_admin",
  email: "rbac_admin@test.com",
  displayName: "RBAC Admin",
  password: "testpassword123",
};

const OPERATOR_USER = {
  username: "rbac_operator",
  email: "rbac_operator@test.com",
  displayName: "RBAC Operator",
  password: "testpassword123",
};

describe("RBAC Integration", () => {
  let app: Express;
  let adminAgent: ReturnType<typeof request.agent>;
  let operatorAgent: ReturnType<typeof request.agent>;
  let unauthAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await createApp();
    app = result.app;

    // Mount test-only routes with role restrictions
    app.get(
      "/test/admin-only",
      requireAuth,
      requireRole("admin"),
      (_req, res) => { res.json({ access: "admin" }); },
    );
    app.get(
      "/test/engineer-or-admin",
      requireAuth,
      requireRole("engineer", "admin"),
      (_req, res) => { res.json({ access: "engineer-or-admin" }); },
    );
    app.get(
      "/test/any-role",
      requireAuth,
      requireRole("operator", "engineer", "manager", "admin"),
      (_req, res) => { res.json({ access: "any" }); },
    );

    // Register admin user, then manually update role via storage
    adminAgent = request.agent(app);
    await adminAgent.post("/api/auth/register").send(ADMIN_USER).expect(201);

    // The register endpoint creates users as "operator" by default.
    // To test admin role, we need to update the user's role directly.
    // Import storage and update the user.
    const { storage } = await import("../storage");
    const adminStored = await storage.getUserByUsername(ADMIN_USER.username);
    if (adminStored) {
      // Directly mutate the role (MemStorage stores by reference)
      (adminStored as { role: string }).role = "admin";
    }

    // Re-login to refresh the session with updated role
    await adminAgent
      .post("/api/auth/login")
      .send({ username: ADMIN_USER.username, password: ADMIN_USER.password })
      .expect(200);

    // Register operator user (default role is "operator")
    operatorAgent = request.agent(app);
    await operatorAgent.post("/api/auth/register").send(OPERATOR_USER).expect(201);

    // Unauthenticated agent
    unauthAgent = request.agent(app);
  });

  describe("admin-only route", () => {
    it("allows admin access", async () => {
      const res = await adminAgent.get("/test/admin-only");
      expect(res.status).toBe(200);
      expect(res.body.access).toBe("admin");
    });

    it("rejects operator with 403", async () => {
      const res = await operatorAgent.get("/test/admin-only");
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/);
    });

    it("rejects unauthenticated with 401", async () => {
      const res = await unauthAgent.get("/test/admin-only");
      expect(res.status).toBe(401);
    });
  });

  describe("engineer-or-admin route", () => {
    it("allows admin access", async () => {
      const res = await adminAgent.get("/test/engineer-or-admin");
      expect(res.status).toBe(200);
    });

    it("rejects operator with 403", async () => {
      const res = await operatorAgent.get("/test/engineer-or-admin");
      expect(res.status).toBe(403);
    });
  });

  describe("any-role route", () => {
    it("allows admin access", async () => {
      const res = await adminAgent.get("/test/any-role");
      expect(res.status).toBe(200);
    });

    it("allows operator access", async () => {
      const res = await operatorAgent.get("/test/any-role");
      expect(res.status).toBe(200);
    });

    it("rejects unauthenticated with 401", async () => {
      const res = await unauthAgent.get("/test/any-role");
      expect(res.status).toBe(401);
    });
  });

  describe("role reported in /api/auth/me", () => {
    it("returns admin role for admin user", async () => {
      const res = await adminAgent.get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body.role).toBe("admin");
    });

    it("returns operator role for operator user", async () => {
      const res = await operatorAgent.get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body.role).toBe("operator");
    });
  });
});
