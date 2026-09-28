import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { validated } from "../middleware/validateRequest.js";
import { AppError } from "../middleware/appError.js";
import type { askAgentSchema } from "../schemas/agentSchemas.js";
import { agentService } from "../services/agentService.js";

type AskInput = typeof askAgentSchema._output;
type BrandQuery = { brandId?: string };
export const askAgentController: RequestHandler = async (_req, res) => {
  const input = validated<AskInput>(res, "body");
  const query = validated<BrandQuery>(res, "query");
  if (input.brandId && query?.brandId && input.brandId !== query.brandId) throw new AppError(400, "BRAND_ID_MISMATCH", "brandId values in the request must match.");
  res.json(await agentService.askAgent(input.brandId ?? query?.brandId ?? env.HINDSIGHT_BRAND_ID, input.question));
};
