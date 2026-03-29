import { Router } from "express";
import { storage } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { predictionLimiter } from "../middleware/rate-limit.js";
import { riskLevelEnum } from "@shared/schema";

export const predictionsRouter = Router();

const validRiskLevels: readonly string[] = riskLevelEnum.options;

// GET /api/predictions — AI predictions with optional risk filter (?risk=)
predictionsRouter.get("/", requireAuth, predictionLimiter, async (req, res) => {
  const risk = req.query.risk as string | undefined;

  if (risk && !validRiskLevels.includes(risk)) {
    return res.status(400).json({
      message: "Invalid risk. Must be one of: " + validRiskLevels.join(", "),
    });
  }

  const data = await storage.getPredictions({ risk });
  res.json(data);
});
