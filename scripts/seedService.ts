import { randomUUID } from "node:crypto";
import brandJson from "../data/brand.json" with { type: "json" };
import campaignsJson from "../data/campaigns.json" with { type: "json" };
import postsJson from "../data/posts.json" with { type: "json" };
import commentsJson from "../data/audience-comments.json" with { type: "json" };
import decisionsJson from "../data/strategic-decisions.json" with { type: "json" };
import snapshotsJson from "../data/analytics-snapshots.json" with { type: "json" };
import { dbService, type DemoDataset } from "../src/services/dbService.js";
import { hindsightAdapter } from "../src/services/hindsightService.js";
import type { FeedbackMemory } from "../src/memory/schema/types.js";
import { retainDemoMemories } from "./memoryAdapter.js";
import { validateDataset } from "./validateDataset.js";

export const demoQuestion = "What should we post next week?";
export const practicalExamplesFeedback = "We need more practical examples.";
const configuredBrandId = process.env.DEMO_BRAND_ID?.trim();

export function loadDemoDataset(brandId = configuredBrandId || brandJson.brandId): DemoDataset {
  const brand = { ...brandJson, brandId };
  const campaigns = campaignsJson.map((record) => ({ ...record, brandId }));
  const posts = postsJson.map((record) => ({
    contentId: record.id, brandId, title: record.title, platform: record.platform, format: record.format,
    topic: record.topic, contentType: record.contentType, campaignId: record.campaignId, date: record.publishedDate,
    text: record.summary, metrics: record.metrics, metricsMeasuredAt: `${record.publishedDate}T20:00:00.000Z`,
  }));
  const comments = commentsJson.map((record) => ({ ...record, brandId }));
  const strategicDecisions = decisionsJson.map(({ id, ...record }) => ({ ...record, brandId, decisionId: id }));
  const analyticsSnapshots = snapshotsJson.map((record) => ({ ...record, brandId }));
  return { brand, campaigns, posts, comments, strategicDecisions, analyticsSnapshots };
}

export async function seedDemo(options: { reset?: boolean; brandId?: string } = {}) {
  const errors = validateDataset();
  if (errors.length) throw new Error(`Refusing to seed invalid data: ${errors.join("; ")}`);
  const dataset = loadDemoDataset(options.brandId);
  if (options.reset) await dbService.resetDemoDataset(dataset.brand.brandId);
  const counts = await dbService.seedDemoDataset(dataset);
  console.log(`[DB] Brand upserted: ${counts.brands}`);
  console.log(`[DB] Campaigns: ${counts.campaigns}`);
  console.log(`[DB] Posts: ${counts.posts}`);
  console.log(`[DB] Audience comments: ${counts.comments}`);
  console.log(`[DB] Analytics snapshots: ${counts.analyticsSnapshots}`);
  console.log("[Hindsight] Retaining brand, content, dated metrics, audience feedback, and strategic decisions through Member 3's retainBatch service...");
  const memories = await retainDemoMemories(dataset);
  console.log(`[Hindsight] Retained ${memories.retained} records; ${memories.failed} failed. Stable document IDs make reruns idempotent.`);
  return { brandId: dataset.brand.brandId, counts, memories: memories.retained };
}

export async function seedPracticalFeedback(brandId = configuredBrandId || brandJson.brandId) {
  const memory: Omit<FeedbackMemory, "brandId"> = {
    feedbackId: "demo-feedback-practical-examples-v1", source: "Synthetic demo audience feedback",
    text: practicalExamplesFeedback, themes: ["practical_examples", "implementation_details"], date: "2026-08-29T12:00:00.000Z",
  };
  return hindsightAdapter.retainDemoFeedback(brandId, memory);
}

export function freshDemoBrandId(): string { return `northstar-demo-${randomUUID()}`; }
