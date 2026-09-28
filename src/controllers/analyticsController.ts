import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { validated } from "../middleware/validateRequest.js";
import { dbService } from "../services/dbService.js";
import { hindsightAdapter } from "../services/hindsightService.js";
import { logger } from "../services/logger.js";

type BrandQuery = { brandId?: string };
export const getAnalyticsController: RequestHandler = async (_req, res) => {
  const brandId = validated<BrandQuery>(res, "query").brandId ?? env.HINDSIGHT_BRAND_ID;
  const analytics = await dbService.getAnalytics(brandId);
  try {
    const memories = await hindsightAdapter.recallForExplorer(brandId);
    analytics.memory = { strategic: memories.decisions.length, audience: memories.audience.length + memories.preferences.length, gaps: memories.gaps.length };
  } catch { logger.warn("Memory analytics unavailable; returning application analytics without memory totals", { brandId }); }
  res.json(analytics);
};
