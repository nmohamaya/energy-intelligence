import { Router } from "express";
import { storage } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { assetTypeEnum, assetStatusEnum } from "@shared/schema";

export const assetsRouter = Router();

// Valid enum values for query param validation
const validAssetTypes: readonly string[] = assetTypeEnum.options;
const validAssetStatuses: readonly string[] = assetStatusEnum.options;

// GET /api/assets — Fleet data with optional filters (?type=, ?status=, ?search=)
assetsRouter.get("/", requireAuth, async (req, res) => {
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

// GET /api/assets/:id — Single asset detail
assetsRouter.get("/:id", requireAuth, async (req, res) => {
  const data = await storage.getAssetById(req.params.id as string);
  if (!data) {
    return res.status(404).json({ message: "Asset not found" });
  }
  res.json(data);
});
