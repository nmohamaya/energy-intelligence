import { Router } from "express";
import { storage } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { dashboardLimiter } from "../middleware/rate-limit.js";

export const dashboardRouter = Router();

// GET /api/dashboard — Portfolio KPIs + charts + alerts
dashboardRouter.get("/", requireAuth, dashboardLimiter, async (_req, res) => {
  const data = await storage.getDashboardData();
  res.json(data);
});
