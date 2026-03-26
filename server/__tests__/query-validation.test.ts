/**
 * Query parameter validation tests for API endpoints.
 *
 * The route handlers in server/routes.ts validate query params
 * against Zod enum values. These tests verify that invalid enum
 * values return 400 with a helpful error message.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";

// Force MemStorage
vi.stubEnv("DATABASE_URL", "");

const TEST_USER = {
  username: "validation_tester",
  email: "validation@test.com",
  displayName: "Validation Tester",
  password: "testpassword123",
};

describe("Query parameter validation", () => {
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const result = await createApp();
    const app: Express = result.app;
    agent = request.agent(app);
    await agent.post("/api/auth/register").send(TEST_USER).expect(201);
  });

  // --- GET /api/assets?type= ---

  describe("GET /api/assets?type=", () => {
    it("returns 400 for invalid type 'Nuclear'", async () => {
      const res = await agent.get("/api/assets?type=Nuclear");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid type/);
    });

    it("returns 400 for case-sensitive mismatch 'solar'", async () => {
      const res = await agent.get("/api/assets?type=solar");
      expect(res.status).toBe(400);
    });

    it("returns 200 for valid type 'Solar'", async () => {
      const res = await agent.get("/api/assets?type=Solar");
      expect(res.status).toBe(200);
      expect(res.body.every((a: { type: string }) => a.type === "Solar")).toBe(true);
    });

    it("returns 200 for valid type 'Wind'", async () => {
      const res = await agent.get("/api/assets?type=Wind");
      expect(res.status).toBe(200);
    });

    it("returns 200 for valid type 'BESS'", async () => {
      const res = await agent.get("/api/assets?type=BESS");
      expect(res.status).toBe(200);
    });

    it("returns 200 for valid type 'Hydro'", async () => {
      const res = await agent.get("/api/assets?type=Hydro");
      expect(res.status).toBe(200);
    });

    it("treats empty type as no filter (returns all assets)", async () => {
      const res = await agent.get("/api/assets?type=");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(20); // all assets
    });
  });

  // --- GET /api/assets?status= ---

  describe("GET /api/assets?status=", () => {
    it("returns 400 for invalid status 'Active'", async () => {
      const res = await agent.get("/api/assets?status=Active");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status/);
    });

    it("returns 400 for case-sensitive mismatch 'online'", async () => {
      const res = await agent.get("/api/assets?status=online");
      expect(res.status).toBe(400);
    });

    it("returns 200 for valid status 'Online'", async () => {
      const res = await agent.get("/api/assets?status=Online");
      expect(res.status).toBe(200);
      expect(res.body.every((a: { status: string }) => a.status === "Online")).toBe(true);
    });

    it("returns 200 for valid status 'Maintenance'", async () => {
      const res = await agent.get("/api/assets?status=Maintenance");
      expect(res.status).toBe(200);
    });

    it("checks type before status when both are invalid", async () => {
      const res = await agent.get("/api/assets?type=Bad&status=Bad");
      expect(res.status).toBe(400);
      // Type is checked first in the route handler
      expect(res.body.message).toMatch(/Invalid type/);
    });
  });

  // --- GET /api/predictions?risk= ---

  describe("GET /api/predictions?risk=", () => {
    it("returns 400 for invalid risk 'Extreme'", async () => {
      const res = await agent.get("/api/predictions?risk=Extreme");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid risk/);
    });

    it("returns 400 for case-sensitive mismatch 'critical'", async () => {
      const res = await agent.get("/api/predictions?risk=critical");
      expect(res.status).toBe(400);
    });

    it("returns 200 for valid risk 'Critical'", async () => {
      const res = await agent.get("/api/predictions?risk=Critical");
      expect(res.status).toBe(200);
      expect(res.body.every((p: { riskLevel: string }) => p.riskLevel === "Critical")).toBe(true);
    });

    it("returns 200 for valid risk 'Low'", async () => {
      const res = await agent.get("/api/predictions?risk=Low");
      expect(res.status).toBe(200);
    });

    it("returns all predictions when no risk filter", async () => {
      const res = await agent.get("/api/predictions");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(12);
    });
  });
});
