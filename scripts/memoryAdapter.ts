import { hindsightService } from "../src/memory/hindsightService.js";
import type { SeedMemory } from "../src/memory/retain/retainers.js";
import type { DemoDataset } from "../src/services/dbService.js";

/** Thin Member 5 adapter: all memory operations remain implemented by Member 3's service. */
export function toSeedMemories(dataset: DemoDataset): SeedMemory[] {
  const { brand } = dataset;
  const records: SeedMemory[] = [{
    kind: "brand", brandId: brand.brandId,
    data: { capturedAt: brand.updatedAt, tone: brand.tone, avoid: brand.thingsToAvoid, audience: brand.audience, platforms: brand.platforms, goals: brand.goals, competitors: brand.competitors, summary: `${brand.name} is a synthetic ${brand.industry} brand.` },
  }];
  for (const post of dataset.posts) {
    records.push({
      kind: "content", brandId: brand.brandId,
      data: { postId: post.contentId, title: post.title, platform: post.platform, format: post.format, topic: post.topic ?? post.title, publishedDate: post.date, metrics: post.metrics, bodySummary: `${post.text.slice(0, 2600)} Content type: ${post.contentType ?? "not classified"}.` },
    });
    if (Object.keys(post.metrics).length) records.push({ kind: "metrics", brandId: brand.brandId, postId: post.contentId, data: post.metrics, measuredAt: post.metricsMeasuredAt ?? post.date });
  }
  for (const comment of dataset.comments) records.push({ kind: "feedback", brandId: brand.brandId, data: { feedbackId: comment.id, source: comment.source, text: comment.text, themes: comment.themes, date: comment.date } });
  for (const decision of dataset.strategicDecisions) records.push({ kind: "decision", brandId: brand.brandId, data: decision });
  return records;
}

export async function retainDemoMemories(dataset: DemoDataset): Promise<{ retained: number; failed: number }> {
  const records = toSeedMemories(dataset);
  // Smaller chunks avoid the Cloud 502 observed when a 40-item feedback batch was submitted.
  // Document IDs are stable, so retrying the interrupted seed is safe and fills only missing records.
  const result = await hindsightService.retainBatch(records, 20);
  if (result.failed.length) {
    const kinds = [...new Set(result.failed.map((item) => `${item.kind}:${item.code}`))].join(", ");
    throw new Error(`Hindsight retained ${result.succeeded.length}/${records.length} demo memories; failed kinds: ${kinds}`);
  }
  return { retained: result.succeeded.length, failed: result.failed.length };
}
