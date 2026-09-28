import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../middleware/appError.js";
import { validated } from "../middleware/validateRequest.js";
import type { Brand } from "../types/index.js";
import { dbService, toFrontendBrand } from "../services/dbService.js";
import { hindsightAdapter } from "../services/hindsightService.js";
import type { SaveBrandInput } from "../schemas/brandSchemas.js";

type BrandQuery = { brandId?: string };
const brandId = (bodyId?: string, queryId?: string) => {
  if (bodyId && queryId && bodyId !== queryId) throw new AppError(400, "BRAND_ID_MISMATCH", "brandId values in the request must match.");
  return bodyId ?? queryId ?? env.HINDSIGHT_BRAND_ID;
};

export const saveBrandController: RequestHandler = async (_req, res) => {
  const input = validated<SaveBrandInput>(res, "body");
  const query = validated<BrandQuery>(res, "query");
  const id = brandId(input.brandId, query?.brandId);
  const stored = await dbService.saveBrand({ brandId: id, name: input.name, industry: input.industry, tone: input.tone, audience: input.audience, platforms: input.platforms, goals: input.goals, competitors: input.competitors, thingsToAvoid: input.thingsToAvoid });
  await hindsightAdapter.retainBrand(stored);
  res.status(200).json(toFrontendBrand(stored));
};

export const getBrandController: RequestHandler = async (_req, res) => {
  const query = validated<BrandQuery>(res, "query");
  const stored = await dbService.getBrand(query.brandId ?? env.HINDSIGHT_BRAND_ID);
  if (!stored) throw new AppError(404, "BRAND_NOT_FOUND", "No brand profile has been saved for this brandId.");
  const result: Brand & { brandId: string; thingsToAvoid: string[] } = { ...toFrontendBrand(stored), brandId: stored.brandId, thingsToAvoid: stored.thingsToAvoid };
  res.json(result);
};
