import { seedDemo } from "./seedService.js";

const reset = process.argv.includes("--reset");
try {
  console.log(`[Seed] Starting${reset ? " (resetting this brand's application rows first)" : ""}...`);
  const result = await seedDemo({ reset });
  console.log(`[Seed] Complete for brandId=${result.brandId}. ${result.memories} real Hindsight memories are available.`);
} catch (error) {
  console.error(`[Seed] Failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
}
