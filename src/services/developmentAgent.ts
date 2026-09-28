import type { AgentResponse } from "../types/index.js";
import type { MemoryItem } from "../memory/schema/types.js";
import { logger } from "./logger.js";
import { hindsightAdapter } from "./hindsightService.js";

type RecallRecord = Record<string, unknown>;
type PostEvidence = { title: string; topic: string; format: string; contentType?: "technical" | "promotional"; saves: number; comments: number; clicks: number; evidence: string };
const metric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function parseJsonMemory(text: string): RecallRecord | undefined {
  const start = text.indexOf(": ");
  if (start < 0) return undefined;
  try {
    const value: unknown = JSON.parse(text.slice(start + 2));
    return value && typeof value === "object" && !Array.isArray(value) ? value as RecallRecord : undefined;
  } catch { return undefined; }
}

function memoryPost(memory: MemoryItem): PostEvidence | undefined {
  const record = parseJsonMemory(memory.text);
  if (record && typeof record.title === "string") {
    const metrics = record.metrics && typeof record.metrics === "object" ? record.metrics as Record<string, unknown> : {};
    const body = typeof record.bodySummary === "string" ? record.bodySummary : "";
    return {
      title: record.title, topic: typeof record.topic === "string" ? record.topic : record.title,
      format: typeof record.format === "string" ? record.format : "content",
      ...( /technical_educational/i.test(body) ? { contentType: "technical" as const } : /promotional/i.test(body) ? { contentType: "promotional" as const } : {}),
      saves: metric(metrics.saves), comments: metric(metrics.comments), clicks: metric(metrics.clicks), evidence: memory.text,
    };
  }
  const natural = memory.text.match(/(?:published|posted) a (technical(?:\/educational)?|educational|promotional) ([\w -]+?) post titled ['"](.+?)['"].*?(\d+) saves, (\d+) comments, and (\d+) clicks/i);
  if (!natural) return undefined;
  const formatSignal = natural[2].toLowerCase();
  const formats = ["technical breakdown", "case study", "carousel", "tutorial", "infographic", "short post", "text", "blog"];
  const format = formats.find((candidate) => formatSignal.includes(candidate)) ?? natural[2].trim();
  return {
    contentType: /promotional/i.test(natural[1]) ? "promotional" : "technical",
    format, title: natural[3], topic: natural[3],
    saves: Number(natural[4]), comments: Number(natural[5]), clicks: Number(natural[6]), evidence: memory.text,
  };
}

function memoryDate(text: string): string {
  return text.match(/(?:When:\s*)?(\d{4}-\d{2}-\d{2})/)?.[1] ?? "0000-00-00";
}

function recentAudienceEvidence(memories: MemoryItem[]): MemoryItem | undefined {
  return memories.filter(({ text }) => {
    const isRequest = /(?:asked|requested|wants|needs|prefers|commented|feedback|audience comments)/i.test(text);
    const isStrategySummary = /decided to|strategic decision|future implication/i.test(text);
    const isAudienceSignal = /(?:audience|user|reader|community|customer|example|tutorial|implementation|architecture|integration|cost)/i.test(text);
    return isRequest && !isStrategySummary && isAudienceSignal;
  }).sort((a, b) => memoryDate(b.text).localeCompare(memoryDate(a.text)))[0];
}

function uniqueMemories(memories: MemoryItem[]): MemoryItem[] {
  const seen = new Set<string>();
  return memories.filter((memory) => {
    const key = memory.text.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Member 4 can replace this logged development adapter without changing the service contract. */
export async function askAgentDevelopmentFallback(brandId: string, question: string): Promise<AgentResponse> {
  logger.info("Agent service started", { brandId, adapter: "development-hindsight-fallback" });
  try {
    const [questionRecall, audienceRecall] = await Promise.all([
      hindsightAdapter.recallForQuestion(brandId, question),
      hindsightAdapter.recallForQuestion(brandId, `Recent audience feedback, preferences, and requests that can improve the answer to: ${question}`),
    ]);
    const memories = uniqueMemories([...questionRecall.memories, ...audienceRecall.memories]);
    const memoryCount = memories.length;
    const posts = memories.map(memoryPost).filter((post): post is PostEvidence => Boolean(post));
    const technical = posts.filter((post) => post.contentType === "technical");
    const promotional = posts.filter((post) => post.contentType === "promotional");
    const average = (rows: PostEvidence[], select: (row: PostEvidence) => number) => rows.length ? rows.reduce((sum, row) => sum + select(row), 0) / rows.length : 0;
    const improvingTechnical = technical.length > 0 && (promotional.length === 0 || average(technical, (post) => post.saves) >= average(promotional, (post) => post.saves));
    const candidatePosts = improvingTechnical ? technical : posts;
    const strongestPost = candidatePosts.slice().sort((a, b) => (b.saves + b.comments) - (a.saves + a.comments))[0];
    const latestFeedback = recentAudienceEvidence(memories);
    const practicalFeedback = latestFeedback && /practical|example|implementation|hands-on|tutorial/i.test(latestFeedback.text);
    const format = strongestPost?.format ?? "a useful short post";
    const topic = strongestPost?.topic ?? strongestPost?.title;

    const recommendation = memoryCount === 0
      ? "There is not enough retained brand history to recommend a content direction yet. Add brand or content memories first."
      : latestFeedback && practicalFeedback && topic
        ? `Address the latest audience request (${latestFeedback.text.slice(0, 150).replace(/\s*\|.*$/, "")}) with a ${format} about ${topic}, including a concrete implementation example.`
        : topic && improvingTechnical
          ? `Prioritize technical education: build on ${topic} in a ${format} format, using the stronger saves in the technical posts recalled for this brand.`
          : topic
            ? `Build on the recalled theme ${topic} in a ${format} format, guided by actual audience and performance memories.`
            : `Use this relevant retained experience to guide the next content decision: ${memories[0].text.slice(0, 220)}`;

    const evidence = [
      ...(latestFeedback ? [`Recent audience evidence: ${latestFeedback.text.slice(0, 280)}`] : []),
      ...(strongestPost ? [`Relevant content evidence: ${strongestPost.evidence.slice(0, 280)}`] : []),
      ...memories.filter((memory) => memory !== latestFeedback && (!strongestPost || memory.text !== strongestPost.evidence)).slice(0, 3).map((memory) => `Relevant memory: ${memory.text.slice(0, 280)}`),
    ];
    const reasoning = [`Hindsight returned ${memoryCount} distinct memories relevant to the question and audience feedback.`, ...evidence];
    if (memoryCount === 0) reasoning.push("This development fallback has no evidence to personalize a recommendation yet.");
    const response: AgentResponse = { recommendation, reasoning, format, memoriesUsed: memoryCount };
    logger.info("Agent service succeeded", { brandId, adapter: "development-hindsight-fallback", memoriesUsed: memoryCount });
    return response;
  } catch (error) {
    logger.error("Agent service failed", { brandId, adapter: "development-hindsight-fallback", errorType: error instanceof Error ? error.name : "UnknownError" });
    throw error;
  }
}
