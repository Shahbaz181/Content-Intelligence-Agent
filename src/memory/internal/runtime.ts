import { HindsightError, type HindsightErrorCode } from "./errors.js";
import { getHindsightClient } from "../hindsightClient.js";

const timeoutMs = () => Number(process.env.HINDSIGHT_TIMEOUT_MS || 15_000);
const maxRetries = () => Math.max(0, Number(process.env.HINDSIGHT_RETRIES ?? 2));

export async function withHindsightRetry<T>(operation: string, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const attempts = maxRetries() + 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new HindsightError(`${operation} timed out after ${timeoutMs()}ms`, "TIMEOUT", 504));
          }, timeoutMs());
        }),
      ]);
    } catch (cause) {
      lastError = cause;
      if (attempt < attempts && isRetryable(cause)) {
        await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attempt - 1)));
        continue;
      }
      break;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (lastError instanceof HindsightError) throw lastError;
  const statusCode = readStatusCode(lastError);
  const code: HindsightErrorCode = statusCode === 408 || statusCode === 504 ? "TIMEOUT" : "UPSTREAM";
  const message = lastError instanceof Error ? lastError.message : "Unknown Hindsight service failure";
  throw new HindsightError(`${operation} failed: ${message}`, code, statusCode && statusCode >= 400 ? statusCode : 502, { cause: lastError });
}

function readStatusCode(value: unknown): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
  const status = candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  return typeof status === "number" ? status : undefined;
}

function isRetryable(value: unknown): boolean {
  if (value instanceof HindsightError) return value.code === "TIMEOUT";
  const status = readStatusCode(value);
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

export function toShortStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toShortStrings).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  if (typeof value === "string") return value.split(/\n|[•;]+/).map((item) => item.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 12);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["items", "insights", "facts", "themes", "results", "text", "answer"]) {
      if (key in record) return toShortStrings(record[key]);
    }
  }
  return [];
}

export function recallRows(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const results = (value as { results?: unknown }).results;
  return Array.isArray(results) ? results.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

export function rowToMemoryItem(row: Record<string, unknown>) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : undefined;
  const tags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const kind = typeof metadata?.kind === "string" ? metadata.kind : tags.find((tag) => tag.startsWith("memory:"))?.slice("memory:".length);
  const date = row.timestamp ?? row.date ?? row.occurred_start ?? row.mentioned_at ?? row.updated_at;
  const type = row.type ?? row.fact_type ?? kind;
  return {
    text: String(row.text ?? row.content ?? ""),
    ...(typeof row.id === "string" ? { memoryId: row.id } : typeof row.memory_id === "string" ? { memoryId: row.memory_id } : {}),
    ...(typeof type === "string" ? { type } : {}),
    ...(typeof date === "string" ? { timestamp: date } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

export async function listAllMemoryRows(bankId: string): Promise<Array<Record<string, unknown>>> {
  const rows: Array<Record<string, unknown>> = [];
  const pageSize = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await withHindsightRetry("list memories", (signal) => getClient().listMemories(bankId, { limit: pageSize, offset, signal }));
    const items = Array.isArray(page.items) ? page.items as Array<Record<string, unknown>> : [];
    total = Number.isFinite(page.total) ? page.total : offset + items.length;
    rows.push(...items);
    if (items.length === 0) break;
    offset += items.length;
  }
  return rows;
}

function getClient() {
  // Kept as a local import target to avoid exporting the low-level SDK client.
  return getHindsightClient();
}
