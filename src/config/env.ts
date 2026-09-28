import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().max(65535).default(8000),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]).default("info"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  HINDSIGHT_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  HINDSIGHT_BASE_URL: z.string().url().default("https://api.hindsight.vectorize.io"),
  HINDSIGHT_BANK_PREFIX: z.string().default("content-intelligence"),
  HINDSIGHT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  HINDSIGHT_RETRIES: z.coerce.number().int().nonnegative().default(2),
  HINDSIGHT_BRAND_ID: z.string().default("default"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  GROQ_RETRIES: z.coerce.number().int().nonnegative().max(2).default(1),
  APP_STATE_PATH: z.string().optional(),
  ENABLE_DEMO_DATA: z.enum(["true", "false"]).default("true"),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && !value.DATABASE_URL) context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATABASE_URL is required in production." });
  if (value.NODE_ENV === "production" && !value.HINDSIGHT_API_KEY?.trim()) context.addIssue({ code: "custom", path: ["HINDSIGHT_API_KEY"], message: "HINDSIGHT_API_KEY is required in production." });
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export const env = parsed.data;
export const allowedOrigins = [...new Set((env.CORS_ORIGINS ?? env.FRONTEND_ORIGIN).split(",").map((origin) => origin.trim()).filter(Boolean))];
