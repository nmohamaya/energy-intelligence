import { describe, it, expect } from "vitest";
import {
  assetSchema,
  alertSchema,
  predictionSchema,
  assetTypeEnum,
  assetStatusEnum,
  riskLevelEnum,
  alertSeverityEnum,
} from "../schema";

describe("Zod Schemas", () => {
  describe("assetTypeEnum", () => {
    it("accepts valid types", () => {
      expect(assetTypeEnum.parse("Solar")).toBe("Solar");
      expect(assetTypeEnum.parse("Wind")).toBe("Wind");
      expect(assetTypeEnum.parse("BESS")).toBe("BESS");
      expect(assetTypeEnum.parse("Hydro")).toBe("Hydro");
    });

    it("rejects invalid types", () => {
      expect(() => assetTypeEnum.parse("Nuclear")).toThrow();
      expect(() => assetTypeEnum.parse("")).toThrow();
      expect(() => assetTypeEnum.parse("solar")).toThrow(); // case-sensitive
    });
  });

  describe("assetStatusEnum", () => {
    it("accepts valid statuses", () => {
      expect(assetStatusEnum.parse("Online")).toBe("Online");
      expect(assetStatusEnum.parse("Warning")).toBe("Warning");
      expect(assetStatusEnum.parse("Offline")).toBe("Offline");
      expect(assetStatusEnum.parse("Maintenance")).toBe("Maintenance");
    });

    it("rejects invalid statuses", () => {
      expect(() => assetStatusEnum.parse("Active")).toThrow();
    });
  });

  describe("riskLevelEnum", () => {
    it("accepts valid risk levels", () => {
      expect(riskLevelEnum.parse("Critical")).toBe("Critical");
      expect(riskLevelEnum.parse("Low")).toBe("Low");
    });

    it("rejects invalid risk levels", () => {
      expect(() => riskLevelEnum.parse("Extreme")).toThrow();
    });
  });

  describe("assetSchema", () => {
    const validAsset = {
      id: "asset-1",
      name: "Brandenburg Solar Park",
      type: "Solar",
      location: "Brandenburg, DE",
      capacity: 52000,
      status: "Online",
      performanceRatio: 95.2,
      lastCommunication: "2026-03-20T10:00:00Z",
      healthScore: 92,
      latitude: 52.5,
      longitude: 13.4,
      installedDate: "2020-06-01",
      inverterCount: 12,
      currentOutput: 32000,
      dailyYield: 180000,
    };

    it("accepts valid asset data", () => {
      const result = assetSchema.safeParse(validAsset);
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const { name, ...incomplete } = validAsset;
      const result = assetSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("rejects invalid asset type", () => {
      const result = assetSchema.safeParse({ ...validAsset, type: "Nuclear" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = assetSchema.safeParse({ ...validAsset, status: "Active" });
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric capacity", () => {
      const result = assetSchema.safeParse({ ...validAsset, capacity: "big" });
      expect(result.success).toBe(false);
    });
  });

  describe("alertSchema", () => {
    const validAlert = {
      id: "alert-1",
      assetId: "asset-1",
      assetName: "Brandenburg Solar Park",
      severity: "critical",
      message: "Inverter failure",
      timestamp: "2026-03-20T10:00:00Z",
    };

    it("accepts valid alert", () => {
      const result = alertSchema.safeParse(validAlert);
      expect(result.success).toBe(true);
    });

    it("rejects invalid severity", () => {
      const result = alertSchema.safeParse({ ...validAlert, severity: "urgent" });
      expect(result.success).toBe(false);
    });
  });

  describe("predictionSchema", () => {
    const validPrediction = {
      id: "pred-1",
      assetId: "asset-1",
      assetName: "Brandenburg Solar Park",
      component: "Main Inverter",
      predictedFailureDate: "2026-04-15",
      confidence: 92.5,
      riskLevel: "Critical",
      recommendedAction: "Schedule replacement",
    };

    it("accepts valid prediction", () => {
      const result = predictionSchema.safeParse(validPrediction);
      expect(result.success).toBe(true);
    });

    it("rejects invalid risk level", () => {
      const result = predictionSchema.safeParse({ ...validPrediction, riskLevel: "Extreme" });
      expect(result.success).toBe(false);
    });
  });
});
