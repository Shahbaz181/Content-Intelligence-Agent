import { z } from "zod";
import { brandIdSchema, brandQuerySchema, stringListSchema } from "./commonSchemas.js";

export const saveBrandSchema = z.object({
  brandId: brandIdSchema.optional(),
  name: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(200),
  tone: stringListSchema,
  audience: stringListSchema,
  platforms: stringListSchema,
  goals: stringListSchema,
  competitors: stringListSchema,
  thingsToAvoid: stringListSchema.optional(),
  avoid: stringListSchema.optional(),
}).transform((brand) => ({ ...brand, thingsToAvoid: brand.thingsToAvoid ?? brand.avoid ?? [], avoid: brand.thingsToAvoid ?? brand.avoid ?? [] }));

export const getBrandQuerySchema = brandQuerySchema;
export type SaveBrandInput = z.infer<typeof saveBrandSchema>;
