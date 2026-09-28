import Groq from "groq-sdk";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import { env } from "../config/env.js";
import { AgentError } from "./agentErrors.js";

export type GroqCompletionParams = ChatCompletionCreateParamsNonStreaming;
export type GroqCompletionClient = {
  chat: { completions: { create(params: GroqCompletionParams): Promise<ChatCompletion> } };
};

let client: Groq | undefined;

export function getGroqClient(): Groq {
  if (!env.GROQ_API_KEY?.trim()) {
    throw new AgentError("GROQ_API_KEY is not configured.", "CONFIGURATION", 503);
  }
  client ??= new Groq({ apiKey: env.GROQ_API_KEY, timeout: env.GROQ_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

export async function completeWithGroq(
  params: GroqCompletionParams,
  groq: GroqCompletionClient = getGroqClient(),
): Promise<ChatCompletion> {
  const attempts = env.GROQ_RETRIES + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await groq.chat.completions.create(params);
    } catch (cause) {
      const status = getStatus(cause);
      const timedOut = isTimeout(cause);
      const retryable = timedOut || status === 429 || (status !== undefined && status >= 500) || isNetworkError(cause);
      const retryAfterMs = status === 429 ? getRetryAfterMs(cause) : undefined;
      if (status === 429 && retryAfterMs !== undefined && retryAfterMs > 5_000) throw toAgentError(cause);
      if (!retryable || attempt + 1 >= attempts) throw toAgentError(cause);
      await delay(retryAfterMs ?? Math.min(250 * 2 ** attempt, 1000));
    }
  }
  throw new AgentError("Groq request failed.", "UPSTREAM", 502);
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function isTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === "APIConnectionTimeoutError" || candidate.code === "ETIMEDOUT" || candidate.code === "ABORT_ERR" || getStatus(error) === 408;
}

function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT"].includes(code);
}

function getRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { headers?: { get?: (name: string) => string | null }; message?: unknown };
  const header = candidate.headers?.get?.("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const message = typeof candidate.message === "string" ? candidate.message.match(/try again in ([\d.]+)s/i) : undefined;
  return message ? Math.max(0, Number(message[1]) * 1000) : undefined;
}

function toAgentError(cause: unknown): AgentError {
  if (cause instanceof AgentError) return cause;
  const status = getStatus(cause);
  const code = isTimeout(cause) ? "TIMEOUT" : status === 429 ? "RATE_LIMIT" : "UPSTREAM";
  const retryAfterMs = code === "RATE_LIMIT" ? getRetryAfterMs(cause) : undefined;
  const retryHint = retryAfterMs === undefined ? "" : ` Try again in about ${Math.ceil(retryAfterMs / 1000)} seconds.`;
  const message = code === "TIMEOUT" ? "Groq request timed out." : code === "RATE_LIMIT" ? `Groq rate limit was reached.${retryHint}` : "Groq request failed.";
  return new AgentError(message, code, code === "RATE_LIMIT" ? 429 : code === "TIMEOUT" ? 504 : status && status >= 400 ? status : 502, { cause });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
