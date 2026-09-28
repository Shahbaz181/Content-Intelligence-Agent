import { z } from "zod";

export const brandIdSchema = z.string().trim().min(1).max(120).regex(/^[\w.-]+$/, "Use letters, numbers, dots, underscores, or hyphens");
export const brandQuerySchema = z.object({ brandId: brandIdSchema.optional() }).passthrough();
export const emptyQuerySchema = z.object({}).passthrough();
export const brandParamsSchema = z.object({ brandId: brandIdSchema });
export const stringListSchema = z.union([z.array(z.string().trim().min(1).max(300)).max(50), z.string().max(3000)]).transform((value) => typeof value === "string" ? value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) : value);
export const dateStringSchema = z.string().datetime({ offset: true });
