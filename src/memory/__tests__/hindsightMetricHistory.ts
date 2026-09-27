import "dotenv/config";
import { hindsightService } from "../hindsightService.js";

const brandId = `hindsight-metrics-smoke-${Date.now()}`;
const postId = `post-${Date.now()}`;
const firstMeasuredAt = "2026-09-20T12:00:00.000Z";
const secondMeasuredAt = "2026-09-27T12:00:00.000Z";

async function main(): Promise<void> {
  const first = await hindsightService.retainMetrics(
    brandId,
    postId,
    { saves: 12, clicks: 35 },
    { measuredAt: firstMeasuredAt },
  );
  const second = await hindsightService.retainMetrics(
    brandId,
    postId,
    { saves: 31, clicks: 82 },
    { measuredAt: secondMeasuredAt },
  );
  if (first.memoryId === second.memoryId) throw new Error("Distinct metric observations shared a document ID.");

  const explorer = await hindsightService.recallForExplorer(brandId);
  const storedDocumentIds = explorer.contentHistory
    .map((memory) => memory.metadata?.memoryId)
    .filter((id): id is string => typeof id === "string");
  if (!storedDocumentIds.includes(first.memoryId) || !storedDocumentIds.includes(second.memoryId)) {
    throw new Error("The Explorer did not return both retained metric snapshots.");
  }

  console.info("Metric history verified.", {
    brandId,
    postId,
    firstMemoryId: first.memoryId,
    secondMemoryId: second.memoryId,
  });
}

main().catch((cause: unknown) => {
  console.error("Metric history verification failed.", cause instanceof Error ? cause.message : "Unknown error");
  process.exitCode = 1;
});
