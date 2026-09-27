import assert from "node:assert/strict";
import { createSnapshotMemoryId } from "../retain/retainers.js";

const earlier = "2026-09-20T12:00:00.000Z";
const later = "2026-09-27T12:00:00.000Z";

assert.equal(
  createSnapshotMemoryId("metrics", "post-123", earlier),
  createSnapshotMemoryId("metrics", "post-123", earlier),
  "replaying one metric timestamp must keep the same document ID",
);
assert.notEqual(
  createSnapshotMemoryId("metrics", "post-123", earlier),
  createSnapshotMemoryId("metrics", "post-123", later),
  "new metric observations must receive different document IDs",
);
assert.notEqual(
  createSnapshotMemoryId("brand", "profile", earlier),
  createSnapshotMemoryId("brand", "profile", later),
  "brand profile snapshots must preserve history",
);

console.info("Metric and brand profile versioning checks passed.");
