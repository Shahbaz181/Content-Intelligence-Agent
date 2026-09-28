import { z } from "zod";
import { brandIdSchema, brandQuerySchema, dateStringSchema } from "./commonSchemas.js";

export const metricsSchema = z.object({
  likes: z.number().finite().nonnegative().optional(), comments: z.number().finite().nonnegative().optional(),
  shares: z.number().finite().nonnegative().optional(), saves: z.number().finite().nonnegative().optional(),
  clicks: z.number().finite().nonnegative().optional(), impressions: z.number().finite().nonnegative().optional(),
}).strict();

export const ingestContentSchema = z.object({
  brandId: brandIdSchema.optional(),
  title: z.string().trim().min(1).max(300),
  platform: z.string().trim().min(1).max(100),
  format: z.string().trim().min(1).max(100),
  publishedAt: dateStringSchema,
  measuredAt: dateStringSchema.optional(),
  text: z.string().trim().max(20000).default(""),
  metrics: metricsSchema.default({}),
}).strict();

export const ingestContentQuerySchema = brandQuerySchema;
export const listContentQuerySchema = brandQuerySchema;
export const contentParamsSchema = z.object({ contentId: z.string().trim().min(1).max(160) });
export type IngestContentInput = z.infer<typeof ingestContentSchema>;
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const planItemSchema = z.object({ day: z.enum(weekDays), format: z.string().max(100).optional(), topic: z.string().trim().min(1).max(500), platform: z.string().max(100).optional(), reasoning: z.string().max(2000) }).strict();
export const savePlanSchema = z.object({ items: z.array(planItemSchema).length(7) }).strict();
export const generateContentSchema = planItemSchema;
