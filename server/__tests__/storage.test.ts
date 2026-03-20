import { describe, it, expect, beforeAll } from "vitest";
import { MemStorage } from "../storage";

describe("MemStorage", () => {
  let storage: MemStorage;

  beforeAll(() => {
    storage = new MemStorage();
  });

  describe("getAssets", () => {
    it("returns all 20 assets", async () => {
      const assets = await storage.getAssets();
      expect(assets).toHaveLength(20);
    });

    it("returns assets with correct shape", async () => {
      const assets = await storage.getAssets();
      const asset = assets[0];
      expect(asset).toHaveProperty("id");
      expect(asset).toHaveProperty("name");
      expect(asset).toHaveProperty("type");
      expect(asset).toHaveProperty("location");
      expect(asset).toHaveProperty("capacity");
      expect(asset).toHaveProperty("status");
      expect(asset).toHaveProperty("performanceRatio");
      expect(asset).toHaveProperty("healthScore");
      expect(asset).toHaveProperty("latitude");
      expect(asset).toHaveProperty("longitude");
      expect(asset).toHaveProperty("installedDate");
      expect(asset).toHaveProperty("inverterCount");
      expect(asset).toHaveProperty("currentOutput");
      expect(asset).toHaveProperty("dailyYield");
    });

    it("filters by type", async () => {
      const solar = await storage.getAssets({ type: "Solar" });
      expect(solar.length).toBeGreaterThan(0);
      expect(solar.every((a) => a.type === "Solar")).toBe(true);
    });

    it("filters by status", async () => {
      const all = await storage.getAssets();
      const online = await storage.getAssets({ status: "Online" });
      expect(online.length).toBeLessThanOrEqual(all.length);
      expect(online.every((a) => a.status === "Online")).toBe(true);
    });

    it("filters by search term (name)", async () => {
      const results = await storage.getAssets({ search: "Brandenburg" });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (a) =>
            a.name.toLowerCase().includes("brandenburg") ||
            a.location.toLowerCase().includes("brandenburg"),
        ),
      ).toBe(true);
    });

    it("returns empty array for non-matching search", async () => {
      const results = await storage.getAssets({ search: "zzz_nonexistent_zzz" });
      expect(results).toHaveLength(0);
    });

    it("combines multiple filters", async () => {
      const results = await storage.getAssets({ type: "Solar", search: "Solar" });
      expect(results.every((a) => a.type === "Solar")).toBe(true);
    });
  });

  describe("getAssetById", () => {
    it("returns asset for valid id", async () => {
      const asset = await storage.getAssetById("asset-1");
      expect(asset).toBeDefined();
      expect(asset!.id).toBe("asset-1");
      expect(asset!.name).toBe("Brandenburg Solar Park");
    });

    it("returns undefined for non-existent id", async () => {
      const asset = await storage.getAssetById("nonexistent");
      expect(asset).toBeUndefined();
    });
  });

  describe("getPredictions", () => {
    it("returns all 12 predictions", async () => {
      const predictions = await storage.getPredictions();
      expect(predictions).toHaveLength(12);
    });

    it("returns predictions with correct shape", async () => {
      const predictions = await storage.getPredictions();
      const pred = predictions[0];
      expect(pred).toHaveProperty("id");
      expect(pred).toHaveProperty("assetId");
      expect(pred).toHaveProperty("assetName");
      expect(pred).toHaveProperty("component");
      expect(pred).toHaveProperty("predictedFailureDate");
      expect(pred).toHaveProperty("confidence");
      expect(pred).toHaveProperty("riskLevel");
      expect(pred).toHaveProperty("recommendedAction");
    });

    it("filters by risk level", async () => {
      const critical = await storage.getPredictions({ risk: "Critical" });
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every((p) => p.riskLevel === "Critical")).toBe(true);
    });

    it("returns all when no filter", async () => {
      const all = await storage.getPredictions();
      const risks = new Set(all.map((p) => p.riskLevel));
      expect(risks.size).toBeGreaterThan(1);
    });
  });

  describe("getDashboardData", () => {
    it("returns correct shape", async () => {
      const data = await storage.getDashboardData();
      expect(data).toHaveProperty("kpis");
      expect(data).toHaveProperty("productionHistory");
      expect(data).toHaveProperty("assetBreakdown");
      expect(data).toHaveProperty("topAssets");
      expect(data).toHaveProperty("recentAlerts");
    });

    it("has valid KPIs", async () => {
      const { kpis } = await storage.getDashboardData();
      expect(kpis.totalCapacity).toBeGreaterThan(0);
      expect(kpis.activeAssets).toBeGreaterThan(0);
      expect(kpis.availability).toBeGreaterThanOrEqual(0);
      expect(kpis.availability).toBeLessThanOrEqual(100);
    });

    it("has 24 hours of production history", async () => {
      const { productionHistory } = await storage.getDashboardData();
      expect(productionHistory).toHaveLength(24);
      expect(productionHistory[0]).toHaveProperty("hour");
      expect(productionHistory[0]).toHaveProperty("production");
      expect(productionHistory[0]).toHaveProperty("forecast");
    });

    it("has top assets sorted by performance ratio descending", async () => {
      const { topAssets } = await storage.getDashboardData();
      expect(topAssets.length).toBeGreaterThan(0);
      expect(topAssets.length).toBeLessThanOrEqual(10);
      for (let i = 1; i < topAssets.length; i++) {
        expect(topAssets[i - 1].performanceRatio).toBeGreaterThanOrEqual(
          topAssets[i].performanceRatio,
        );
      }
    });

    it("has at most 7 recent alerts", async () => {
      const { recentAlerts } = await storage.getDashboardData();
      expect(recentAlerts.length).toBeLessThanOrEqual(7);
    });
  });

  describe("getDigitalTwinData", () => {
    it("returns twin data for valid asset", async () => {
      const data = await storage.getDigitalTwinData("asset-1");
      expect(data).toBeDefined();
      expect(data!.asset.id).toBe("asset-1");
      expect(data!.realTimeMetrics).toHaveProperty("powerOutput");
      expect(data!.realTimeMetrics).toHaveProperty("temperature");
      expect(data!.realTimeMetrics).toHaveProperty("humidity");
      expect(data!.realTimeMetrics).toHaveProperty("efficiency");
      expect(data!.scenarios).toHaveLength(3);
    });

    it("returns undefined for non-existent asset", async () => {
      const data = await storage.getDigitalTwinData("nonexistent");
      expect(data).toBeUndefined();
    });

    it("includes irradiance for solar assets", async () => {
      // asset-1 is Brandenburg Solar Park
      const data = await storage.getDigitalTwinData("asset-1");
      expect(data!.realTimeMetrics.irradiance).toBeDefined();
    });

    it("includes windSpeed for wind assets", async () => {
      // asset-2 is Nordfriesland Wind Farm
      const data = await storage.getDigitalTwinData("asset-2");
      expect(data!.realTimeMetrics.windSpeed).toBeDefined();
    });
  });

  describe("getAnalyticsData", () => {
    it("returns correct shape", async () => {
      const data = await storage.getAnalyticsData();
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("curtailmentHistory");
      expect(data).toHaveProperty("lossBreakdown");
      expect(data).toHaveProperty("dispatchSchedule");
      expect(data).toHaveProperty("revenueCards");
    });

    it("has 30 days of curtailment history", async () => {
      const { curtailmentHistory } = await storage.getAnalyticsData();
      expect(curtailmentHistory).toHaveLength(30);
    });

    it("has 5 loss categories", async () => {
      const { lossBreakdown } = await storage.getAnalyticsData();
      expect(lossBreakdown).toHaveLength(5);
      expect(lossBreakdown.every((l: { percentage: number }) => l.percentage > 0)).toBe(true);
    });

    it("has 7 days × 24 hours = 168 dispatch entries", async () => {
      const { dispatchSchedule } = await storage.getAnalyticsData();
      expect(dispatchSchedule).toHaveLength(168);
    });

    it("dispatch statuses are valid", async () => {
      const { dispatchSchedule } = await storage.getAnalyticsData();
      const validStatuses = ["dispatched", "curtailed", "standby"];
      expect(
        dispatchSchedule.every((d: { status: string }) => validStatuses.includes(d.status)),
      ).toBe(true);
    });
  });
});
