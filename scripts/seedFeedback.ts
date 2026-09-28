import { seedPracticalFeedback } from "./seedService.js";

try {
  const result = await seedPracticalFeedback();
  console.log(`[Seed] Added the exact practical-examples feedback to Hindsight (memoryId=${result.memoryId}).`);
} catch (error) {
  console.error(`[Seed] Feedback retain failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
}
