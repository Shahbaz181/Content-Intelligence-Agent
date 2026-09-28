import assert from "node:assert/strict";
import { dbService } from "../src/services/dbService.js";
import { loadDemoDataset, freshDemoBrandId } from "./seedService.js";

const brandId = freshDemoBrandId();
const dataset = loadDemoDataset(brandId);
try {
  await dbService.seedDemoDataset(dataset);
  const first = await dbService.getDemoCounts(brandId);
  await dbService.seedDemoDataset(dataset);
  const second = await dbService.getDemoCounts(brandId);
  assert.deepEqual(first, { brands: 1, posts: 36, campaigns: 12, comments: 60, analyticsSnapshots: 3 });
  assert.deepEqual(second, first, "re-seeding must upsert instead of duplicating application rows");
  console.log("PASS deterministic application seed is idempotent (1 brand, 36 posts, 12 campaigns, 60 comments, 3 snapshots)");
} finally {
  await dbService.resetDemoDataset(brandId);
}
