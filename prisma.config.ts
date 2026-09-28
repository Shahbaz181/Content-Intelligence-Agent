import "dotenv/config";
import { defineConfig } from "prisma/config";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/content_intelligence";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/content_intelligence" },
});
