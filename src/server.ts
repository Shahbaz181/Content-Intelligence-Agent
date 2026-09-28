import express from "express";
import cors from "cors";
import { env, allowedOrigins } from "./config/env.js";
import { AppError } from "./middleware/appError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId, requestLogger } from "./middleware/requestLogger.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { validateRequest } from "./middleware/validateRequest.js";
import { emptyQuerySchema } from "./schemas/commonSchemas.js";
import { logger } from "./services/logger.js";
import brandRoutes from "./routes/brand.js";
import contentRoutes from "./routes/content.js";
import agentRoutes from "./routes/agent.js";
import memoryRoutes from "./routes/memory.js";
import analyticsRoutes from "./routes/analytics.js";

export const app = express();
app.disable("x-powered-by");
app.use(requestId);
app.use(requestLogger);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (env.NODE_ENV === "development" && isLocalDevelopmentOrigin(origin))) { callback(null, true); return; }
    callback(new AppError(403, "CORS_ORIGIN_NOT_ALLOWED", "This origin is not allowed to access the API."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", validateRequest({ query: emptyQuerySchema }), asyncHandler(async (_req, res) => {
  res.json({ status: "ok", service: "content-intelligence-agent-api" });
}));
app.use("/brand", brandRoutes);
app.use("/content", contentRoutes);
app.use("/agent", agentRoutes);
app.use("/memory", memoryRoutes);
app.use("/analytics", analyticsRoutes);

app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Route not found.")));
app.use(errorHandler);

const host = env.HOST;
const port = env.PORT;
app.listen(port, host, (error?: Error) => {
  if (error) {
    logger.error("API server failed to listen", {
      host,
      port,
      error: error.message,
      code: (error as NodeJS.ErrnoException).code,
    });
    process.exitCode = 1;
    return;
  }
  logger.info("API server listening", { host, port });
});

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
