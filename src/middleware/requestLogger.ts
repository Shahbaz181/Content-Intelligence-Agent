import { randomUUID } from "node:crypto";
import morgan from "morgan";
import type { RequestHandler } from "express";
import { logger } from "../services/logger.js";

export const requestId: RequestHandler = (req, res, next) => {
  res.locals.requestId = randomUUID();
  res.setHeader("x-request-id", res.locals.requestId);
  logger.info("HTTP request started", { requestId: res.locals.requestId, method: req.method, route: req.path });
  next();
};

export const requestLogger = morgan((tokens, req, res) => JSON.stringify({
  event: "http_request", requestId: res.getHeader("x-request-id"), method: tokens.method(req, res), route: req.url?.split("?")[0],
  status: Number(tokens.status(req, res)), durationMs: Number(tokens["response-time"](req, res)),
}), { stream: { write: (line) => logger.http(line.trim()) } });
