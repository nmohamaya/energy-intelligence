import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Dashboard — KPIs + chart data
  app.get("/api/dashboard", async (_req, res) => {
    const data = await storage.getDashboardData();
    res.json(data);
  });

  // Fleet — all assets with optional filters
  app.get("/api/assets", async (req, res) => {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const data = await storage.getAssets({ type, status, search });
    res.json(data);
  });

  // Single asset detail
  app.get("/api/assets/:id", async (req, res) => {
    const data = await storage.getAssetById(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(data);
  });

  // Predictive maintenance predictions
  app.get("/api/predictions", async (req, res) => {
    const risk = req.query.risk as string | undefined;
    const data = await storage.getPredictions({ risk });
    res.json(data);
  });

  // Digital twin data for a specific asset
  app.get("/api/digital-twin/:assetId", async (req, res) => {
    const data = await storage.getDigitalTwinData(req.params.assetId);
    if (!data) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(data);
  });

  // Energy analytics
  app.get("/api/analytics", async (_req, res) => {
    const data = await storage.getAnalyticsData();
    res.json(data);
  });

  return httpServer;
}
