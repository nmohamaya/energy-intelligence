import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  assetTypeEnum,
  assetStatusEnum,
  riskLevelEnum,
} from "@shared/schema";
import { apiLimiter, authLimiter, dashboardLimiter, predictionLimiter } from "./middleware/rate-limit";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";

// Valid enum values for query param validation
const validAssetTypes: readonly string[] = assetTypeEnum.options;
const validAssetStatuses: readonly string[] = assetStatusEnum.options;
const validRiskLevels: readonly string[] = riskLevelEnum.options;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply catch-all rate limit to all /api routes (120 req/min), including auth
  app.use("/api", apiLimiter);

  // Auth routes — public (no requireAuth), with tighter rate limit (20 req/min)
  app.use("/api/auth", authLimiter, authRouter);

  // Dashboard — KPIs + chart data (tighter limit: 60 req/min)
  app.get("/api/dashboard", requireAuth, dashboardLimiter, async (_req, res) => {
    const data = await storage.getDashboardData();
    res.json(data);
  });

  // Fleet — all assets with optional filters
  app.get("/api/assets", requireAuth, async (req, res) => {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    if (type && !validAssetTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be one of: " + validAssetTypes.join(", "),
      });
    }
    if (status && !validAssetStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: " + validAssetStatuses.join(", "),
      });
    }

    const data = await storage.getAssets({ type, status, search });
    res.json(data);
  });

  // Single asset detail
  app.get("/api/assets/:id", requireAuth, async (req, res) => {
    const data = await storage.getAssetById(req.params.id as string);
    if (!data) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(data);
  });

  // Predictive maintenance predictions (tighter limit: 30 req/min)
  app.get("/api/predictions", requireAuth, predictionLimiter, async (req, res) => {
    const risk = req.query.risk as string | undefined;

    if (risk && !validRiskLevels.includes(risk)) {
      return res.status(400).json({
        message: "Invalid risk. Must be one of: " + validRiskLevels.join(", "),
      });
    }

    const data = await storage.getPredictions({ risk });
    res.json(data);
  });

  // Digital twin data for a specific asset
  app.get("/api/digital-twin/:assetId", requireAuth, async (req, res) => {
    const data = await storage.getDigitalTwinData(req.params.assetId as string);
    if (!data) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(data);
  });

  // Energy analytics
  app.get("/api/analytics", requireAuth, async (_req, res) => {
    const data = await storage.getAnalyticsData();
    res.json(data);
  });

  return httpServer;
}
