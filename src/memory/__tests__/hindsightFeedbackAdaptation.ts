import "dotenv/config";
import { hindsightService } from "../hindsightService.js";

const brandId = `hindsight-adaptation-smoke-${Date.now()}`;
const marker = `MEMORY_ADAPTATION_${Date.now()}`;
const feedback = {
  feedbackId: marker,
  source: "synthetic integration check",
  text: `${marker}: audience prefers practical architecture diagrams and transparent implementation cost breakdowns before vendor comparisons.`,
  themes: ["architecture examples", "implementation cost"],
  date: new Date().toISOString(),
};

async function main(): Promise<void> {
  const before = await hindsightService.reflectAudiencePreferences(brandId);
  const retained = await hindsightService.retainFeedback(brandId, feedback);
  if (!retained.success) throw new Error(`Feedback retain failed: ${retained.memoryId}`);

  const recalled = await hindsightService.recallForQuestion(
    brandId,
    `What audience preferences were shared in feedback ${marker}?`,
  );
  const recalledText = recalled.memories.map((memory) => memory.text.toLowerCase()).join(" ");
  if (!recalledText.includes("architecture") || !recalledText.includes("cost")) {
    throw new Error("The new feedback themes were not returned by recall.");
  }

  const after = await hindsightService.reflectAudiencePreferences(brandId);
  const reflectedText = after.items.join(" ").toLowerCase();
  if (!reflectedText.includes("architecture") && !reflectedText.includes("cost")) {
    throw new Error("The fresh audience-preference reflection did not include the newly retained feedback themes.");
  }

  console.info("Feedback adaptation verified.", {
    brandId,
    memoryId: retained.memoryId,
    priorInsightCount: before.items.length,
    updatedInsightCount: after.items.length,
  });
}

main().catch((cause: unknown) => {
  console.error("Feedback adaptation verification failed.", cause instanceof Error ? cause.message : "Unknown error");
  process.exitCode = 1;
});
