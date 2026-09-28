import { HindsightError, hindsightService as member3 } from "../memory/hindsightService.js";
import type { BrandMemory, ContentMemory, ContentMetrics, FeedbackMemory, StrategicMemory } from "../memory/schema/types.js";
import type { BrandRecord, ContentRecord } from "./dbService.js";
import { logger } from "./logger.js";

async function run<T>(operation: string, brandId: string, action: () => Promise<T>): Promise<T> {
  logger.info("Hindsight operation started", { operation, brandId });
  try { const result = await action(); logger.info("Hindsight operation succeeded", { operation, brandId }); return result; }
  catch (error) { logger.error("Hindsight operation failed", { operation, brandId, errorType: error instanceof HindsightError ? error.code : "UPSTREAM" }); throw error; }
}

export const hindsightAdapter = {
  retainDemoBrand(brandId: string, data: Omit<BrandMemory, "brandId">) {
    return run("retainBrand", brandId, () => member3.retainBrand(brandId, data, { capturedAt: data.capturedAt }));
  },
  retainDemoPost(brandId: string, data: Omit<ContentMemory, "brandId">) {
    return run("retainPost", brandId, () => member3.retainPost(brandId, data));
  },
  retainDemoMetrics(brandId: string, postId: string, metrics: ContentMetrics, measuredAt: string) {
    return run("retainMetrics", brandId, () => member3.retainMetrics(brandId, postId, metrics, { measuredAt }));
  },
  retainDemoFeedback(brandId: string, data: Omit<FeedbackMemory, "brandId">) {
    return run("retainFeedback", brandId, () => member3.retainFeedback(brandId, data));
  },
  retainDemoDecision(brandId: string, data: Omit<StrategicMemory, "brandId">) {
    return run("retainDecision", brandId, () => member3.retainDecision(brandId, data));
  },
  retainBrand(brand: BrandRecord) {
    return run("retainBrand", brand.brandId, () => member3.retainBrand(brand.brandId, { tone: brand.tone, audience: brand.audience, platforms: brand.platforms, goals: brand.goals, competitors: brand.competitors, avoid: brand.thingsToAvoid, summary: `${brand.name} is in ${brand.industry}.` }, { capturedAt: brand.updatedAt }));
  },
  retainContent(item: ContentRecord) {
    return run("retainContent", item.brandId, async () => {
      const content = await member3.retainPost(item.brandId, { postId: item.contentId, title: item.title, platform: item.platform, format: item.format, topic: item.topic ?? item.title, publishedDate: item.date, ...(item.text ? { bodySummary: item.text.slice(0, 3000) } : {}), ...(Object.keys(item.metrics).length ? { metrics: item.metrics } : {}) });
      let metrics: Awaited<ReturnType<typeof member3.retainMetrics>> | undefined;
      if (Object.keys(item.metrics).length) metrics = await member3.retainMetrics(item.brandId, item.contentId, item.metrics, { measuredAt: item.metricsMeasuredAt ?? item.date });
      return { content, metrics, retainedCount: 1 + Number(Boolean(metrics)) };
    });
  },
  retainFeedback(brandId: string, feedbackId: string, text: string) {
    return run("retainFeedback", brandId, () => member3.retainFeedback(brandId, { feedbackId, source: "AI Strategist user feedback", text, themes: [], date: new Date().toISOString() }));
  },
  recallForExplorer(brandId: string) { return run("recallForExplorer", brandId, () => member3.recallForExplorer(brandId)); },
  recallForTimeline(brandId: string) { return run("recallForTimeline", brandId, () => member3.recallForTimeline(brandId)); },
  recallForQuestion(brandId: string, question: string) { return run("recallForQuestion", brandId, () => member3.recallForQuestion(brandId, question)); },
  reflectForPrompt(brandId: string, prompt: string) { return run("reflectForPrompt", brandId, () => member3.reflectForPrompt(brandId, prompt)); },
  reflectTopTopics(brandId: string) { return run("reflectTopTopics", brandId, () => member3.reflectTopTopics(brandId)); },
  reflectAudiencePreferences(brandId: string) { return run("reflectAudiencePreferences", brandId, () => member3.reflectAudiencePreferences(brandId)); },
  reflectContentGaps(brandId: string) { return run("reflectContentGaps", brandId, () => member3.reflectContentGaps(brandId)); },
};
