import { z } from "zod";
import { brandIdSchema, brandQuerySchema } from "./commonSchemas.js";

export const askAgentSchema = z.object({ brandId: brandIdSchema.optional(), question: z.string().trim().min(1).max(4000) }).strict();
export const feedbackSchema = z.object({ brandId: brandIdSchema.optional(), text: z.string().trim().min(1).max(4000) }).strict();
export const askAgentQuerySchema = brandQuerySchema;
