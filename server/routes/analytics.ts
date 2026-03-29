import { Router } from "express";
import { storage } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

// GET /api/analytics — Production, curtailment, dispatch, revenue
analyticsRouter.get("/", requireAuth, async (_req, res) => {
  const data = await storage.getAnalyticsData();
  res.json(data);
});
