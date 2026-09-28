import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../middleware/appError.js";
import { validated } from "../middleware/validateRequest.js";
import type { IngestContentInput } from "../schemas/contentSchemas.js";
import type { Brand, ContentItem, GeneratedContent, PlanItem } from "../types/index.js";
import { dbService, type ContentRecord } from "../services/dbService.js";
import { hindsightAdapter } from "../services/hindsightService.js";
import { agentService } from "../services/agentService.js";

type BrandQuery = { brandId?: string };
type FeedbackInput = { brandId?: string; text: string };
type PlanInput = { items: PlanItem[] };
const brandFor = (bodyId?: string, queryId?: string) => {
  if (bodyId && queryId && bodyId !== queryId) throw new AppError(400, "BRAND_ID_MISMATCH", "brandId values in the request must match.");
  return bodyId ?? queryId ?? env.HINDSIGHT_BRAND_ID;
};
const contentItem = (record: ContentRecord): ContentItem => ({ title: record.title, platform: record.platform, format: record.format, date: record.date.slice(0, 10), performance: record.performance, synthetic: record.synthetic, ...Object.fromEntries(["saves", "comments", "clicks"].flatMap((key) => record.metrics[key] === undefined ? [] : [[key, record.metrics[key]]])) });

async function persistAndRetain(brandId: string, input: Omit<IngestContentInput, "brandId">): Promise<ContentRecord> {
  const date = new Date(input.publishedAt).toISOString();
  const metricsMeasuredAt = input.measuredAt ? new Date(input.measuredAt).toISOString() : new Date().toISOString();
  const record = await dbService.ingestContent({ brandId, title: input.title, platform: input.platform, format: input.format, date, text: input.text, metrics: input.metrics, metricsMeasuredAt });
  await hindsightAdapter.retainContent(record);
  return record;
}

export const listContentController: RequestHandler = async (_req, res) => {
  const query = validated<BrandQuery>(res, "query");
  res.json((await dbService.listContent(query.brandId ?? env.HINDSIGHT_BRAND_ID)).map(contentItem));
};

export const ingestContentController: RequestHandler = async (req: Request, res) => {
  const query = validated<BrandQuery>(res, "query");
  if (req.file) {
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    if (rows.length < 2) throw new AppError(400, "INVALID_CSV", "CSV must include a header row and at least one content row.");
    const headers = rows[0].map(normalizeHeader);
    const col = (...names: string[]) => names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
    const titleIndex = col("title", "post title", "name");
    if (titleIndex < 0) throw new AppError(400, "INVALID_CSV", "CSV must contain a title column.");
    const indices = { platform: col("platform", "channel"), format: col("format", "content type", "type"), topic: col("topic", "subject"), date: col("date", "published date", "published at"), measuredAt: col("measured at", "measurement date", "metrics date"), text: col("text", "body", "body summary", "summary"), metrics: Object.fromEntries(["likes", "comments", "shares", "saves", "clicks", "impressions"].map((key) => [key, col(key)])) as Record<string, number> };
    const brandId = query.brandId ?? env.HINDSIGHT_BRAND_ID;
    const inserted: ContentItem[] = [];
    let retainedMemories = 0;
    for (const row of rows.slice(1)) {
      const title = getCell(row, titleIndex).trim(); if (!title) continue;
      const rawDate = getCell(row, indices.date).trim(); const date = rawDate ? new Date(rawDate) : new Date();
      if (Number.isNaN(date.getTime())) throw new AppError(400, "INVALID_CSV_DATE", "Every content date must be a valid date.");
      const rawMetricsDate = getCell(row, indices.measuredAt).trim(); const metricsDate = rawMetricsDate ? new Date(rawMetricsDate) : new Date();
      if (Number.isNaN(metricsDate.getTime())) throw new AppError(400, "INVALID_CSV_DATE", "Every metrics date must be a valid date.");
      const metrics: Record<string, number> = {};
      for (const key of ["likes", "comments", "shares", "saves", "clicks", "impressions"] as const) {
        const value = getCell(row, indices.metrics[key]).trim(); if (!value) continue;
        const number = Number(value.replaceAll(",", ""));
        if (!Number.isFinite(number) || number < 0) throw new AppError(400, "INVALID_CSV_METRIC", `CSV ${key} values must be non-negative numbers.`);
        metrics[key] = number;
      }
      const record = await persistAndRetain(brandId, {
        title, platform: getCell(row, indices.platform).trim() || "Unspecified", format: getCell(row, indices.format).trim() || "Unspecified",
        publishedAt: date.toISOString(), measuredAt: metricsDate.toISOString(), text: getCell(row, indices.text).trim(), metrics,
      });
      inserted.push(contentItem(record));
      retainedMemories += 1 + Number(Object.keys(record.metrics).length > 0);
    }
    if (!inserted.length) throw new AppError(400, "INVALID_CSV", "No content rows with a title were found.");
    res.status(201).json({ imported: inserted.length, retainedMemories, content: inserted });
    return;
  }
  const input = validated<IngestContentInput>(res, "body");
  const brandId = brandFor(input.brandId, query.brandId);
  const record = await persistAndRetain(brandId, input);
  res.status(201).json({ ...contentItem(record), contentId: record.contentId, retainedMemories: 1 + Number(Boolean(Object.keys(record.metrics).length)) });
};

export const getPlanController: RequestHandler = async (_req, res) => {
  const query = validated<BrandQuery>(res, "query"); const brandId = query.brandId ?? env.HINDSIGHT_BRAND_ID;
  const saved = await dbService.getPlan(brandId); if (saved.length) { res.json(saved); return; }
  const tree = await hindsightAdapter.recallForExplorer(brandId);
  if (!tree.memoryCount) { res.json([]); return; }
  const [topics, preferences, gaps] = await Promise.all([hindsightAdapter.reflectTopTopics(brandId), hindsightAdapter.reflectAudiencePreferences(brandId), hindsightAdapter.reflectContentGaps(brandId)]);
  const ideas = [...new Set([...gaps.items, ...topics.items, ...preferences.items])].filter(Boolean);
  if (!ideas.length) { res.json([]); return; }
  const brand = await dbService.getBrand(brandId);
  const content = await dbService.listContent(brandId);
  const plan: PlanItem[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => ({
    day, topic: ideas[index % ideas.length], ...(content[0]?.format ? { format: content[0].format } : {}), ...(brand?.platforms.length ? { platform: brand.platforms[index % brand.platforms.length] } : {}),
    reasoning: gaps.items.length ? `Hindsight content-gap reflection: ${gaps.items[index % gaps.items.length]}` : topics.items.length ? `Hindsight top-topics reflection: ${topics.items[index % topics.items.length]}` : `Hindsight audience-preferences reflection: ${preferences.items[index % preferences.items.length]}`,
  }));
  res.json(plan);
};

export const savePlanController: RequestHandler = async (_req, res) => { const { items } = validated<PlanInput>(res, "body"); const query = validated<BrandQuery>(res, "query"); res.json(await dbService.savePlan(query.brandId ?? env.HINDSIGHT_BRAND_ID, items)); };

export const generateContentController: RequestHandler = async (_req, res) => {
  const slot = validated<PlanItem>(res, "body"); const query = validated<BrandQuery>(res, "query"); const brandId = query.brandId ?? env.HINDSIGHT_BRAND_ID;
  const recall = await hindsightAdapter.recallForQuestion(brandId, `Brand voice, audience needs, and content evidence for ${slot.format ?? "a social post"} on ${slot.platform ?? "the brand's platform"} about ${slot.topic}`);
  if (!recall.memoryCount) throw new AppError(409, "INSUFFICIENT_MEMORY", "Hindsight found no supporting memories for this slot. Retain brand or content history before generating.");
  const content = await agentService.generateContent(brandId, `Write about ${slot.topic} for ${slot.platform ?? "the brand's platform"}. ${slot.reasoning}`, slot.format ?? "social post");
  const generated: GeneratedContent = { content, source: env.GROQ_API_KEY?.trim() ? "groq" : "hindsight-reflect", memoriesUsed: recall.memoryCount, relevantMemories: recall.memories.slice(0, 6).map((memory) => memory.text) };
  res.json(generated);
};

export const saveFeedbackController: RequestHandler = async (_req, res) => { const input = validated<FeedbackInput>(res, "body"); const query = validated<BrandQuery>(res, "query"); const brandId = brandFor(input.brandId, query?.brandId); const feedbackId = `feedback-${randomUUID()}`; const result = await hindsightAdapter.retainFeedback(brandId, feedbackId, input.text); res.status(201).json({ success: true, feedbackId, memoryId: result.memoryId }); };

function normalizeHeader(value: string): string { return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function getCell(row: string[], index: number): string { return index >= 0 ? row[index] ?? "" : ""; }
function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < input.length; index++) { const char = input[index];
    if (quoted) { if (char === '"' && input[index + 1] === '"') { field += '"'; index++; } else if (char === '"') quoted = false; else field += char; }
    else if (char === '"' && !field.length) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") { if (char === "\r" && input[index + 1] === "\n") index++; row.push(field); field = ""; if (row.some((cell) => cell.trim())) rows.push(row); row = []; }
    else field += char;
  }
  if (quoted) throw new AppError(400, "INVALID_CSV", "CSV contains an unclosed quoted field.");
  row.push(field); if (row.some((cell) => cell.trim())) rows.push(row); return rows;
}
