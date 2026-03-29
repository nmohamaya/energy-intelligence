import type { Express } from "express";
import type { Server } from "http";
import { apiLimiter, authLimiter } from "../middleware/rate-limit.js";
import { authRouter } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";
import { assetsRouter } from "./assets.js";
import { predictionsRouter } from "./predictions.js";
import { digitalTwinRouter } from "./digital-twin.js";
import { analyticsRouter } from "./analytics.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Apply catch-all rate limit to all /api routes (120 req/min), including auth
  app.use("/api", apiLimiter);

  // Auth routes — public (no requireAuth), with tighter rate limit (20 req/min)
  app.use("/api/auth", authLimiter, authRouter);

  // Data routes — all require authentication
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/api/predictions", predictionsRouter);
  app.use("/api/digital-twin", digitalTwinRouter);
  app.use("/api/analytics", analyticsRouter);

  return httpServer;
}
