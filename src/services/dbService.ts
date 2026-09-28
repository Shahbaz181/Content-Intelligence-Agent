import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Analytics, Brand, ContentItem } from "../types/index.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/appError.js";
import { logger } from "./logger.js";
import { prismaDbService } from "./prismaDbService.js";

/** Replaceable persistence contract for Member 5's eventual database. */
export interface BrandRecord {
  brandId: string; name: string; industry: string; tone: string[]; audience: string[]; platforms: string[];
  goals: string[]; competitors: string[]; thingsToAvoid: string[]; updatedAt: string; synthetic?: boolean;
}
export interface ContentRecord {
  contentId: string; brandId: string; title: string; platform: string; format: string; date: string;
  text: string; topic?: string; contentType?: string; campaignId?: string; metrics: Record<string, number>; metricsMeasuredAt?: string; performance: string; synthetic: boolean;
}
export interface WeeklyPlanRecord { brandId: string; items: Array<{ day: string; format?: string; topic: string; platform?: string; reasoning: string }> }
export interface CampaignRecord { id: string; brandId: string; name: string; description: string; startDate: string; endDate: string; result: string }
export interface AudienceCommentRecord { id: string; brandId: string; text: string; themes: string[]; date: string; source: string }
export interface AnalyticsSnapshotRecord { id: string; brandId: string; period: string; topThemes: string[]; weakThemes: string[]; gaps: string[] }
export interface DemoDataset {
  brand: Omit<BrandRecord, "synthetic">;
  campaigns: CampaignRecord[];
  posts: Array<Omit<ContentRecord, "performance" | "synthetic"> & { topic: string; campaignId: string }>;
  comments: AudienceCommentRecord[];
  analyticsSnapshots: AnalyticsSnapshotRecord[];
  strategicDecisions: Array<{ decisionId: string; brandId: string; decision: string; outcome: string; futureImplication: string; date: string }>;
}

interface AppDatabase { version: 2; brands: Record<string, BrandRecord>; content: ContentRecord[]; plans: Record<string, WeeklyPlanRecord["items"]>; campaigns: CampaignRecord[]; comments: AudienceCommentRecord[]; analyticsSnapshots: AnalyticsSnapshotRecord[] }
const DB_PATH = resolve(env.APP_STATE_PATH || resolve(process.cwd(), "data", "app-state.json"));
let current: Promise<AppDatabase> | undefined;
let writes = Promise.resolve();

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value === "string") return value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);
  return [];
}
function initial(): AppDatabase {
  const state: AppDatabase = { version: 2, brands: {}, content: [], plans: {}, campaigns: [], comments: [], analyticsSnapshots: [] };
  if (env.NODE_ENV !== "development" || env.ENABLE_DEMO_DATA !== "true") return state;
  const brandId = "default";
  state.brands[brandId] = { brandId, name: "Northstar Studio", industry: "Creative technology", tone: ["clear", "curious", "practical"], audience: ["independent creators", "small marketing teams"], platforms: ["LinkedIn", "Instagram"], goals: ["Grow engaged audience", "Teach useful workflows"], competitors: ["Creator tools"], thingsToAvoid: ["Clickbait", "Unsupported claims"], updatedAt: new Date().toISOString(), synthetic: true };
  const samples = [
    ["A practical guide to AI workflows", "LinkedIn", "Carousel", "2026-01-18", 92, 28, 44],
    ["Behind the scenes: building with intention", "Instagram", "Reel", "2026-02-12", 68, 19, 31],
    ["Five prompts for clearer campaign briefs", "LinkedIn", "Text", "2026-03-08", 113, 42, 57],
    ["How we plan a week of useful content", "Instagram", "Carousel", "2026-04-17", 86, 35, 48],
    ["The small-team guide to content experiments", "LinkedIn", "Carousel", "2026-05-21", 147, 51, 73],
    ["What our community wants to learn next", "Instagram", "Story", "2026-06-14", 75, 64, 29],
  ] as const;
  state.content = samples.map(([title, platform, format, date, saves, comments, clicks], index) => {
    const metrics = { saves, comments, clicks };
    return { contentId: `demo-${index + 1}`, brandId, title, platform, format, date, text: "Synthetic sample used only to demonstrate the dashboard and analytics views.", metrics, performance: `${saves + comments + clicks} tracked actions`, synthetic: true };
  });
  return state;
}
function migrate(raw: unknown): AppDatabase {
  if (!raw || typeof raw !== "object") return initial();
  const data = raw as Record<string, unknown>;
  if ((data.version === 1 || data.version === 2) && data.brands && Array.isArray(data.content) && data.plans) {
    return { version: 2, brands: data.brands as AppDatabase["brands"], content: data.content as ContentRecord[], plans: data.plans as AppDatabase["plans"], campaigns: Array.isArray(data.campaigns) ? data.campaigns as CampaignRecord[] : [], comments: Array.isArray(data.comments) ? data.comments as AudienceCommentRecord[] : [], analyticsSnapshots: Array.isArray(data.analyticsSnapshots) ? data.analyticsSnapshots as AnalyticsSnapshotRecord[] : [] };
  }
  const migrated = initial();
  // Read the previous Member 1/3 development adapter's single-brand data without discarding it.
  if (data.brand && typeof data.brand === "object") {
    const brand = data.brand as Record<string, unknown>;
    migrated.brands.default = {
      brandId: "default", name: String(brand.name ?? "Demo Brand"), industry: String(brand.industry ?? "General"),
      tone: toStringList(brand.tone), audience: toStringList(brand.audience), platforms: toStringList(brand.platforms),
      goals: toStringList(brand.goals), competitors: toStringList(brand.competitors), thingsToAvoid: toStringList(brand.avoid), updatedAt: new Date().toISOString(), synthetic: false,
    };
  }
  if (Array.isArray(data.content)) migrated.content = data.content.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    return [{
      contentId: createHash("sha256").update(`${index}:${String(item.title)}:${String(item.date)}`).digest("hex").slice(0, 24), brandId: "default",
      title: String(item.title ?? "Untitled"), platform: String(item.platform ?? "Unspecified"), format: String(item.format ?? "Unspecified"),
      date: String(item.date ?? new Date().toISOString()).slice(0, 10), text: "", metrics: Object.fromEntries(["likes", "comments", "shares", "saves", "clicks"].flatMap((key) => typeof item[key] === "number" ? [[key, item[key]]] : [])),
      performance: String(item.performance ?? "Not measured"), synthetic: false,
    }];
  });
  if (Array.isArray(data.plan)) migrated.plans.default = data.plan as WeeklyPlanRecord["items"];
  return migrated;
}

async function database(): Promise<AppDatabase> {
  current ??= readFile(DB_PATH, "utf8").then((text) => migrate(JSON.parse(text) as unknown)).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return initial();
    throw error;
  });
  return current;
}
async function persist(data: AppDatabase): Promise<void> {
  const snapshot = JSON.stringify(data, null, 2);
  writes = writes.catch(() => undefined).then(async () => {
    await mkdir(dirname(DB_PATH), { recursive: true });
    const temp = `${DB_PATH}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temp, snapshot, "utf8");
    for (let attempt = 0; ; attempt++) {
      try { await rename(temp, DB_PATH); break; }
      catch (error) {
        const retryable = error && typeof error === "object" && "code" in error && ["EPERM", "EBUSY", "ENOTEMPTY"].includes(String(error.code));
        if (!retryable || attempt >= 4) { await rm(temp, { force: true }).catch(() => undefined); throw error; }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 20 * (attempt + 1)));
      }
    }
  });
  await writes;
}
async function operation<T>(name: string, work: () => Promise<T>): Promise<T> {
  logger.info("Database operation started", { operation: name });
  try { const result = await work(); logger.info("Database operation succeeded", { operation: name }); return result; }
  catch (error) { logger.error("Database operation failed", { operation: name, errorType: error instanceof Error ? error.name : "UnknownError", errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : undefined }); throw new AppError(503, "DATABASE_UNAVAILABLE", "Application data is temporarily unavailable."); }
}

export const dbService = {
  async seedDemoDataset(dataset: DemoDataset): Promise<{ brands: number; campaigns: number; posts: number; comments: number; analyticsSnapshots: number }> {
    if (env.DATABASE_URL) return operation("seedDemoDataset", () => prismaDbService.seedDemoDataset(dataset));
    return operation("seedDemoDataset", async () => {
      const db = await database();
      const { brand } = dataset;
      db.brands[brand.brandId] = { ...brand, updatedAt: brand.updatedAt, synthetic: true };
      const replaceForBrand = <T extends { brandId: string }>(rows: T[], incoming: T[]) => [...rows.filter((row) => row.brandId !== brand.brandId), ...incoming];
      db.campaigns = replaceForBrand(db.campaigns, dataset.campaigns);
      db.comments = replaceForBrand(db.comments, dataset.comments);
      db.analyticsSnapshots = replaceForBrand(db.analyticsSnapshots, dataset.analyticsSnapshots);
      const content = dataset.posts.map((post) => {
        const actionCount = (post.metrics.saves ?? 0) + (post.metrics.comments ?? 0) + (post.metrics.clicks ?? 0);
        return { ...post, performance: `${actionCount} tracked actions`, synthetic: true };
      });
      db.content = [...db.content.filter((row) => row.brandId !== brand.brandId), ...content];
      await persist(db);
      return { brands: 1, campaigns: dataset.campaigns.length, posts: dataset.posts.length, comments: dataset.comments.length, analyticsSnapshots: dataset.analyticsSnapshots.length };
    });
  },
  async resetDemoDataset(brandId: string): Promise<void> {
    if (env.DATABASE_URL) return operation("resetDemoDataset", () => prismaDbService.resetDemoDataset(brandId));
    await operation("resetDemoDataset", async () => {
      const db = await database();
      delete db.brands[brandId];
      db.content = db.content.filter((row) => row.brandId !== brandId);
      db.campaigns = db.campaigns.filter((row) => row.brandId !== brandId);
      db.comments = db.comments.filter((row) => row.brandId !== brandId);
      db.analyticsSnapshots = db.analyticsSnapshots.filter((row) => row.brandId !== brandId);
      delete db.plans[brandId];
      await persist(db);
    });
  },
  async getDemoCounts(brandId: string) {
    if (env.DATABASE_URL) return operation("getDemoCounts", () => prismaDbService.getDemoCounts(brandId));
    return operation("getDemoCounts", async () => { const db = await database(); return { brands: Number(Boolean(db.brands[brandId])), posts: db.content.filter((row) => row.brandId === brandId).length, campaigns: db.campaigns.filter((row) => row.brandId === brandId).length, comments: db.comments.filter((row) => row.brandId === brandId).length, analyticsSnapshots: db.analyticsSnapshots.filter((row) => row.brandId === brandId).length }; });
  },
  getBrand(brandId: string): Promise<BrandRecord | null> {
    if (env.DATABASE_URL) return operation("getBrand", () => prismaDbService.getBrand(brandId));
    return operation("getBrand", async () => (await database()).brands[brandId] ?? null);
  },
  saveBrand(brand: Omit<BrandRecord, "updatedAt">): Promise<BrandRecord> {
    if (env.DATABASE_URL) return operation("saveBrand", () => prismaDbService.saveBrand(brand));
    return operation("saveBrand", async () => {
      const db = await database(); const record = { ...brand, updatedAt: new Date().toISOString(), synthetic: false };
      db.brands[brand.brandId] = record; await persist(db); return record;
    });
  },
  listContent(brandId: string): Promise<ContentRecord[]> {
    if (env.DATABASE_URL) return operation("listContent", () => prismaDbService.listContent(brandId));
    return operation("listContent", async () => (await database()).content.filter((item) => item.brandId === brandId).sort((a, b) => b.date.localeCompare(a.date)));
  },
  ingestContent(input: Omit<ContentRecord, "contentId" | "performance" | "synthetic">): Promise<ContentRecord> {
    if (env.DATABASE_URL) return operation("ingestContent", () => prismaDbService.ingestContent(input));
    return operation("ingestContent", async () => {
      const db = await database();
      const contentId = createHash("sha256").update(`${input.brandId}\n${input.title}\n${input.platform}\n${input.date}`).digest("hex").slice(0, 24);
      const actionCount = (input.metrics.saves ?? 0) + (input.metrics.comments ?? 0) + (input.metrics.clicks ?? 0);
      const record: ContentRecord = { ...input, contentId, performance: actionCount ? `${actionCount} tracked actions` : "Not measured", synthetic: false };
      const index = db.content.findIndex((item) => item.contentId === contentId);
      if (index < 0) db.content.push(record); else db.content[index] = record;
      await persist(db); return record;
    });
  },
  getAnalytics(brandId: string): Promise<Analytics> {
    if (env.DATABASE_URL) return operation("getAnalytics", () => prismaDbService.getAnalytics(brandId));
    return operation("getAnalytics", async () => {
      const entries = (await database()).content.filter((item) => item.brandId === brandId && Object.keys(item.metrics).length > 0).map((item) => ({ item, value: (item.metrics.saves ?? 0) + (item.metrics.comments ?? 0) + (item.metrics.clicks ?? 0) }));
      const group = (key: "platform" | "format") => { const totals = new Map<string, number>(); for (const { item, value } of entries) totals.set(item[key], (totals.get(item[key]) ?? 0) + value); return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); };
      const monthly = new Map<string, number>();
      for (const { item, value } of entries) { const month = item.date.slice(0, 7); monthly.set(month, (monthly.get(month) ?? 0) + value); }
      const dataSource: NonNullable<Analytics["dataSource"]> = entries.every(({ item }) => item.synthetic) && entries.length ? "synthetic" : entries.some(({ item }) => item.synthetic) ? "mixed" : "live";
      return {
        health: null, status: dataSource === "synthetic" ? "Synthetic development sample; figures are not live account analytics." : "No health-score formula configured; figures summarize imported application metrics.", metricLabel: "Tracked actions (saves + comments + clicks)", dataSource,
        memory: { strategic: 0, audience: 0, gaps: 0 },
        performance: [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })),
        byType: group("format"), byPlatform: group("platform"), top: entries.slice().sort((a, b) => b.value - a.value).slice(0, 5).map(({ item }) => item.title),
        weak: entries.slice().sort((a, b) => a.value - b.value).slice(0, 5).map(({ item }) => item.title),
      };
    });
  },
  getPlan(brandId: string): Promise<WeeklyPlanRecord["items"]> { if (env.DATABASE_URL) return operation("getPlan", () => prismaDbService.getPlan(brandId)); return operation("getPlan", async () => (await database()).plans[brandId] ?? []); },
  savePlan(brandId: string, items: WeeklyPlanRecord["items"]): Promise<WeeklyPlanRecord["items"]> {
    if (env.DATABASE_URL) return operation("savePlan", () => prismaDbService.savePlan(brandId, items));
    return operation("savePlan", async () => { const db = await database(); db.plans[brandId] = items; await persist(db); return items; });
  },
};

export function toFrontendBrand(brand: BrandRecord): Brand {
  const join = (items: string[]) => items.join(", ");
  return { name: brand.name, industry: brand.industry, tone: join(brand.tone), audience: join(brand.audience), platforms: join(brand.platforms), goals: join(brand.goals), competitors: join(brand.competitors), avoid: join(brand.thingsToAvoid), ...(brand.synthetic ? { synthetic: true } : {}) };
}
