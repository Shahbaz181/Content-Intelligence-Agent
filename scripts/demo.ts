import { askAgent } from "../src/services/agentService.js";
import { hindsightAdapter } from "../src/services/hindsightService.js";
import { demoQuestion, freshDemoBrandId, practicalExamplesFeedback, seedDemo } from "./seedService.js";

const brandId = process.env.DEMO_BRAND_ID?.trim() || freshDemoBrandId();
const divider = "==============================================";
function printResponse(response: Awaited<ReturnType<typeof askAgent>>) {
  console.log(`Recommendation: ${response.recommendation}`);
  console.log("Why:");
  response.reasoning.forEach((line, index) => console.log(`${index + 1}. ${line}`));
  console.log(`memoriesUsed: ${response.memoriesUsed}`);
}

try {
  console.log("[Demo] Use DEMO_BRAND_ID to repeat an existing run. Without it, each run gets an isolated, genuinely cold Hindsight bank.");
  console.log(`brandId: ${brandId}`);
  console.log(`\n${divider}\nACT 1 — COLD AGENT\n${divider}\nQuestion: ${demoQuestion}`);
  const cold = await askAgent(brandId, demoQuestion);
  printResponse(cold);

  console.log(`\n${divider}\nACT 2 — TEACH THE AGENT\n${divider}\nLoading the deterministic synthetic dataset...`);
  const seeded = await seedDemo({ brandId });
  console.log(`Loaded ${seeded.counts.posts} posts, ${seeded.counts.comments} audience comments, and ${seeded.memories} Hindsight memories.`);

  console.log(`\n${divider}\nACT 3 — MEMORY-ENABLED AGENT\n${divider}\nQuestion: ${demoQuestion}`);
  const taught = await askAgent(brandId, demoQuestion);
  printResponse(taught);

  console.log(`\n${divider}\nACT 4 — ADAPTATION\n${divider}\nNew feedback: "${practicalExamplesFeedback}"`);
  const feedback = await hindsightAdapter.retainDemoFeedback(brandId, {
    feedbackId: "demo-feedback-practical-examples-v1", source: "Synthetic demo audience feedback",
    text: practicalExamplesFeedback, themes: ["practical_examples", "implementation_details"], date: "2026-08-29T12:00:00.000Z",
  });
  console.log(`[Hindsight] Retained actual feedback memory: ${feedback.memoryId}`);
  const adapted = await askAgent(brandId, demoQuestion);
  printResponse(adapted);
  console.log(`Recommendation changed after feedback: ${adapted.recommendation !== taught.recommendation ? "yes" : "no — inspect the retrieved memory evidence and adjust the Member 4 reasoning adapter if it is not surfaced"}`);
} catch (error) {
  console.error(`[Demo] Stopped because a real dependency failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
}
