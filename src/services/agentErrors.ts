export type AgentErrorCode = "CONFIGURATION" | "VALIDATION" | "TIMEOUT" | "RATE_LIMIT" | "UPSTREAM" | "INVALID_RESPONSE";

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: AgentErrorCode, statusCode: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "AgentError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
