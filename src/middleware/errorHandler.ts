import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { HindsightError } from "../memory/hindsightService.js";
import { logger } from "../services/logger.js";
import { AppError } from "./appError.js";
import { AgentError } from "../services/agentErrors.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (res.headersSent) return;
  const requestId = String(res.locals.requestId ?? "unknown");
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) } });
    return;
  }
  if (error instanceof HindsightError) {
    logger.error("Hindsight request failed", { requestId, operationCode: error.code, statusCode: error.statusCode });
    const status = error.code === "CONFIGURATION" ? 503 : error.code === "VALIDATION" ? 400 : 502;
    res.status(status).json({ error: { code: error.code === "CONFIGURATION" ? "HINDSIGHT_UNAVAILABLE" : "HINDSIGHT_ERROR", message: error.code === "CONFIGURATION" ? "Memory service is not configured." : "Memory service request failed." } });
    return;
  }
  if (error instanceof AgentError) {
    logger.error("Agent request failed", { requestId, operationCode: error.code, statusCode: error.statusCode });
    res.status(error.statusCode).json({ error: { code: `AGENT_${error.code}`, message: error.message } });
    return;
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: { code: error.code, message: error.code === "LIMIT_FILE_SIZE" ? "Uploaded file exceeds the 5 MB limit." : "Invalid file upload." } });
    return;
  }
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (status === 400) { res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body contains invalid JSON." } }); return; }
    if (status === 413) { res.status(413).json({ error: { code: "REQUEST_TOO_LARGE", message: "Request body exceeds the 1 MB limit." } }); return; }
  }
  logger.error("Unhandled API request error", { requestId, route: req.path, method: req.method, errorType: error instanceof Error ? error.name : "UnknownError" });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
};
