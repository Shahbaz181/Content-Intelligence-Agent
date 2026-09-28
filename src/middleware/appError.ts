export class AppError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string, readonly issues?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = "AppError";
  }
}
