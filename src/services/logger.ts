import winston from "winston";
import { env } from "../config/env.js";

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: false }), winston.format.json()),
  defaultMeta: { service: "content-intelligence-agent-api", environment: env.NODE_ENV },
  transports: [new winston.transports.Console()],
});
