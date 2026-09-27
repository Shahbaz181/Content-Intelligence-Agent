import { ensureBrandBank, getHindsightClient } from "../hindsightClient.js";
import { HindsightError } from "../internal/errors.js";
import { withHindsightRetry } from "../internal/runtime.js";
import type {
  BatchRetainResult, BrandMemory, ContentMemory, ContentMetrics, ExperimentMemory, FeedbackMemory,
  RetainFailure, RetainKind, RetainResult, StrategicMemory,
} from "../schema/types.js";

const tag = (kind: RetainKind) => `memory:${kind}`;
const brandTag = (brandId: string) => `brand:${brandId}`;

function factualContent(kind: RetainKind, record: object): string {
  return `${kind} memory: ${JSON.stringify(record)}`;
}

function itemId(kind: RetainKind, id: string): string {
  return `${kind}:${id}`;
}

function isoTimestamp(value: Date | string | undefined, field: string): string {
  const date = value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime())) throw new HindsightError(`${field} must be a valid date`, "VALIDATION", 400);
  return date.toISOString();
}

export function createSnapshotMemoryId(kind: "brand" | "metrics", sourceId: string, timestamp: Date | string): string {
  const field = kind === "brand" ? "capturedAt" : "measuredAt";
  return itemId(kind, `${sourceId}:${isoTimestamp(timestamp, field)}`);
}

function logRetain(kind: RetainKind, brandId: string, memoryId: string): void {
  console.info("[hindsight] retained", { kind, brandId, memoryId, timestamp: new Date().toISOString() });
}

async function retainOne(kind: RetainKind, brandId: string, memoryId: string, record: object): Promise<RetainResult> {
  if (!brandId.trim()) throw new HindsightError("brandId is required", "VALIDATION", 400);
  const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
  try {
    await withHindsightRetry(`retain ${kind}`, (signal) => getHindsightClient().retain(
      bankId,
      factualContent(kind, record),
      {
        documentId: memoryId,
        metadata: { brandId, kind, memoryId },
        tags: [brandTag(brandId), tag(kind)],
        signal,
      },
    ));
  } catch (cause) {
    if (cause instanceof HindsightError) {
      throw new HindsightError(cause.message, cause.code, cause.statusCode, { cause, memoryId });
    }
    throw new HindsightError(`retain ${kind} failed`, "UPSTREAM", 502, { cause, memoryId });
  }
  logRetain(kind, brandId, memoryId);
  return { success: true, memoryId, brandId, kind };
}

export function retainBrand(
  brandId: string,
  brandData: Omit<BrandMemory, "brandId" | "capturedAt"> | BrandMemory,
  options: { capturedAt?: Date | string } = {},
) {
  const capturedAt = isoTimestamp(options.capturedAt ?? ("capturedAt" in brandData ? brandData.capturedAt : undefined), "capturedAt");
  const record: BrandMemory = { ...brandData, brandId, capturedAt };
  return retainOne("brand", brandId, createSnapshotMemoryId("brand", "profile", capturedAt), record);
}

export function retainPost(brandId: string, postData: Omit<ContentMemory, "brandId"> | ContentMemory) {
  const record: ContentMemory = { ...postData, brandId };
  return retainOne("content", brandId, itemId("content", record.postId), record);
}

export function retainMetrics(
  brandId: string,
  postId: string,
  metrics: ContentMetrics,
  options: { measuredAt?: Date | string } = {},
) {
  const measuredAt = isoTimestamp(options.measuredAt, "measuredAt");
  const record = { brandId, postId, metrics, measuredAt };
  return retainOne("metrics", brandId, createSnapshotMemoryId("metrics", postId, measuredAt), record);
}

export function retainExperiment(brandId: string, experimentData: Omit<ExperimentMemory, "brandId"> | ExperimentMemory) {
  const record: ExperimentMemory = { ...experimentData, brandId };
  return retainOne("experiment", brandId, itemId("experiment", record.experimentId), record);
}

export function retainFeedback(brandId: string, feedbackData: Omit<FeedbackMemory, "brandId"> | FeedbackMemory) {
  const record: FeedbackMemory = { ...feedbackData, brandId };
  return retainOne("feedback", brandId, itemId("feedback", record.feedbackId), record);
}

export function retainDecision(brandId: string, decisionData: Omit<StrategicMemory, "brandId"> | StrategicMemory) {
  const record: StrategicMemory = { ...decisionData, brandId };
  return retainOne("decision", brandId, itemId("decision", record.decisionId), record);
}

export type SeedMemory =
  | { kind: "brand"; brandId: string; data: Omit<BrandMemory, "brandId"> | BrandMemory; capturedAt?: Date | string }
  | { kind: "content"; brandId: string; data: Omit<ContentMemory, "brandId"> | ContentMemory }
  | { kind: "feedback"; brandId: string; data: Omit<FeedbackMemory, "brandId"> | FeedbackMemory }
  | { kind: "experiment"; brandId: string; data: Omit<ExperimentMemory, "brandId"> | ExperimentMemory }
  | { kind: "decision"; brandId: string; data: Omit<StrategicMemory, "brandId"> | StrategicMemory }
  | { kind: "metrics"; brandId: string; postId: string; data: ContentMetrics; measuredAt?: Date | string };

/** Store bulk seed records through Hindsight's retainBatch endpoint, in bounded chunks. */
export async function retainBatch(records: SeedMemory[], chunkSize = 50): Promise<BatchRetainResult> {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 100) {
    throw new HindsightError("chunkSize must be between 1 and 100", "VALIDATION", 400);
  }
  const output: BatchRetainResult = { succeeded: [], failed: [] };
  if (records.length === 0) return output;
  const client = getHindsightClient();
  const byBrand = new Map<string, SeedMemory[]>();
  for (const record of records) {
    const brandRecords = byBrand.get(record.brandId) ?? [];
    brandRecords.push(record);
    byBrand.set(record.brandId, brandRecords);
  }
  for (const [brandId, brandRecords] of byBrand) {
    const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
    for (let start = 0; start < brandRecords.length; start += chunkSize) {
      const chunk = brandRecords.slice(start, start + chunkSize);
      const prepared = chunk.map((entry) => {
        const kind = entry.kind as RetainKind;
        let memoryId: string;
        let data: object;
        if (entry.kind === "metrics") {
          const measuredAt = isoTimestamp(entry.measuredAt, "measuredAt");
          memoryId = createSnapshotMemoryId("metrics", entry.postId, measuredAt);
          data = { brandId: entry.brandId, postId: entry.postId, metrics: entry.data, measuredAt };
        } else if (entry.kind === "brand") {
          const capturedAt = isoTimestamp(entry.capturedAt ?? ("capturedAt" in entry.data ? entry.data.capturedAt : undefined), "capturedAt");
          memoryId = createSnapshotMemoryId("brand", "profile", capturedAt);
          data = { ...entry.data, brandId: entry.brandId, capturedAt };
        } else {
          const id = "postId" in entry.data ? entry.data.postId : "feedbackId" in entry.data ? entry.data.feedbackId :
            "experimentId" in entry.data ? entry.data.experimentId : "decisionId" in entry.data ? entry.data.decisionId : "unknown";
          memoryId = itemId(kind, id);
          data = { ...entry.data, brandId: entry.brandId };
        }
        return { entry, kind, memoryId, data };
      });
      try {
        await withHindsightRetry("batch retain", (signal) => client.retainBatch(
          bankId,
          prepared.map(({ entry, kind, memoryId, data }) => ({
            content: factualContent(kind, data),
            documentId: memoryId,
            metadata: { brandId: entry.brandId, kind, memoryId },
            tags: [brandTag(entry.brandId), tag(kind)],
          })),
          { signal },
        ));
        for (const { entry, kind, memoryId } of prepared) {
          const result = { success: true as const, memoryId, brandId: entry.brandId, kind };
          output.succeeded.push(result);
          logRetain(kind, entry.brandId, memoryId);
        }
      } catch (cause) {
        const error = cause instanceof HindsightError
          ? cause
          : new HindsightError("batch retain failed", "UPSTREAM", 502, { cause });
        for (const { entry, kind, memoryId } of prepared) {
          output.failed.push({
            success: false,
            memoryId,
            brandId: entry.brandId,
            kind,
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
          });
          console.warn("[hindsight] retain failed", {
            kind,
            brandId: entry.brandId,
            memoryId,
            code: error.code,
            statusCode: error.statusCode,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }
  return output;
}

export type { RetainFailure };
