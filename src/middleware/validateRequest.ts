import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "./appError.js";

export interface RequestSchemas { body?: ZodType; query?: ZodType; params?: ZodType }

export const validateRequest = (schemas: RequestSchemas): RequestHandler => (req, res, next) => {
  const issues: Array<{ path: string; message: string }> = [];
  const parsed: Record<string, unknown> = {};
  for (const key of ["params", "query", "body"] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(req[key]);
    if (!result.success) issues.push(...result.error.issues.map((issue) => ({ path: `${key}${issue.path.length ? `.${issue.path.join(".")}` : ""}`, message: issue.message })));
    else parsed[key] = result.data;
  }
  if (issues.length) { next(new AppError(400, "VALIDATION_ERROR", "Invalid request", issues)); return; }
  res.locals.validated = parsed;
  next();
};

export function validated<T>(res: import("express").Response, key: "body" | "query" | "params"): T {
  return (res.locals.validated as Record<string, unknown> | undefined)?.[key] as T;
}
