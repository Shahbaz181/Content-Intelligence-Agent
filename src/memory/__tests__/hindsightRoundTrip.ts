import "dotenv/config";
import { getHindsightClient, ensureBrandBank } from "../hindsightClient.js";
import { withHindsightRetry } from "../internal/runtime.js";

const brandId = process.env.HINDSIGHT_SMOKE_BRAND_ID || "hindsight-smoke";
const memoryId = `smoke:${Date.now()}`;

async function main(): Promise<void> {
  const client = getHindsightClient();
  const bankId = await withHindsightRetry("ensure smoke bank", (signal) => ensureBrandBank(brandId, signal));
  const sentence = `Smoke-check ${memoryId}: Acme brand voice is technical, clear, and confident.`;
  console.info("Retaining a temporary Hindsight connection-check memory...");
  await withHindsightRetry("smoke retain", (signal) => client.retain(bankId, sentence, {
    documentId: memoryId,
    metadata: { brandId, kind: "smoke", memoryId },
    tags: [`brand:${brandId}`, "memory:smoke"],
    signal,
  }));
  console.info("Recalling the connection-check memory...");
  const result = await withHindsightRetry("smoke recall", (signal) => client.recall(bankId, sentence, { budget: "low", maxTokens: 512, signal }));
  const text = JSON.stringify(result).toLowerCase();
  if (!text.includes("technical") || !text.includes("confident")) {
    throw new Error("Hindsight retain succeeded but the recall response did not contain the smoke memory");
  }
  console.info("Hindsight retain → recall round-trip succeeded.", { bankId, memoryId });
}

main().catch((cause: unknown) => {
  console.error("Hindsight round-trip failed.", cause instanceof Error ? cause.message : "Unknown error");
  process.exitCode = 1;
});
