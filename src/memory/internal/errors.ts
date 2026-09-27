export type HindsightErrorCode = "CONFIGURATION" | "VALIDATION" | "UPSTREAM" | "TIMEOUT";

export class HindsightError extends Error {
  readonly success = false;
  readonly code: HindsightErrorCode;
  readonly statusCode: number;
  readonly memoryId?: string;

  constructor(message: string, code: HindsightErrorCode, statusCode: number, options?: ErrorOptions & { memoryId?: string }) {
    super(message, options);
    this.name = "HindsightError";
    this.code = code;
    this.statusCode = statusCode;
    this.memoryId = options?.memoryId;
  }
}
