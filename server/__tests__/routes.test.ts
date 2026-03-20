import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Express } from "express";

// Force MemStorage regardless of environment so tests never hit a real DB
vi.stubEnv("DATABASE_URL", "");

describe("API Routes", () => {
  let app: Express;

  beforeAll(async () => {
    const result = await createApp();
    app = result.app;
  });

  describe("GET /api/dashboard", () => {
    it("returns 200 with dashboard data", async () => {
      const res = await request(app).get("/api/dashboard");
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
      const res = await request(app).get("/api/assets");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(20);
    });

    it("filters by type", async () => {
      const res = await request(app).get("/api/assets?type=Solar");
      expect(res.status).toBe(200);
      expect(res.body.every((a: { type: string }) => a.type === "Solar")).toBe(true);
    });

    it("filters by search", async () => {
      const res = await request(app).get("/api/assets?search=Brandenburg");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("returns empty array for non-matching search", async () => {
      const res = await request(app).get("/api/assets?search=zzz_nonexistent_zzz");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe("GET /api/assets/:id", () => {
    it("returns 200 for existing asset", async () => {
      const res = await request(app).get("/api/assets/asset-1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("asset-1");
      expect(res.body.name).toBe("Brandenburg Solar Park");
    });

    it("returns 404 for non-existent asset", async () => {
      const res = await request(app).get("/api/assets/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /api/predictions", () => {
    it("returns 200 with predictions array", async () => {
      const res = await request(app).get("/api/predictions");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(12);
    });

    it("filters by risk level", async () => {
      const res = await request(app).get("/api/predictions?risk=Critical");
      expect(res.status).toBe(200);
      expect(res.body.every((p: { riskLevel: string }) => p.riskLevel === "Critical")).toBe(true);
    });
  });

  describe("GET /api/digital-twin/:assetId", () => {
    it("returns 200 with twin data for existing asset", async () => {
      const res = await request(app).get("/api/digital-twin/asset-1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("asset");
      expect(res.body).toHaveProperty("realTimeMetrics");
      expect(res.body).toHaveProperty("scenarios");
      expect(res.body.asset.id).toBe("asset-1");
    });

    it("returns 404 for non-existent asset", async () => {
      const res = await request(app).get("/api/digital-twin/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/analytics", () => {
    it("returns 200 with analytics data", async () => {
      const res = await request(app).get("/api/analytics");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("curtailmentHistory");
      expect(res.body).toHaveProperty("lossBreakdown");
      expect(res.body).toHaveProperty("dispatchSchedule");
      expect(res.body).toHaveProperty("revenueCards");
    });
  });
});
