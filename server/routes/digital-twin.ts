import { Router } from "express";
import { storage } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";

export const digitalTwinRouter = Router();

// GET /api/digital-twin/:assetId — Digital twin metrics + simulations
digitalTwinRouter.get("/:assetId", requireAuth, async (req, res) => {
  const data = await storage.getDigitalTwinData(req.params.assetId as string);
  if (!data) {
    return res.status(404).json({ message: "Asset not found" });
  }
  res.json(data);
});
