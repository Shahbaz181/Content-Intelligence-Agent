import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { Analytics } from "../types/index.js";
import type { AnalyticsSnapshotRecord, AudienceCommentRecord, BrandRecord, CampaignRecord, ContentRecord, DemoDataset, WeeklyPlanRecord } from "./dbService.js";

const globalPrisma = globalThis as typeof globalThis & { contentIntelligencePrisma?: PrismaClient };
const getClient = () => {
  if (!globalPrisma.contentIntelligencePrisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for PostgreSQL persistence.");
    globalPrisma.contentIntelligencePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return globalPrisma.contentIntelligencePrisma;
};

const brandRecord = (brand: { id: string; name: string; industry: string; tone: string[]; audience: string[]; platforms: string[]; goals: string[]; competitors: string[]; thingsToAvoid: string[]; updatedAt: Date; synthetic: boolean }): BrandRecord => ({ brandId: brand.id, name: brand.name, industry: brand.industry, tone: brand.tone, audience: brand.audience, platforms: brand.platforms, goals: brand.goals, competitors: brand.competitors, thingsToAvoid: brand.thingsToAvoid, updatedAt: brand.updatedAt.toISOString(), synthetic: brand.synthetic });
const metricsRecord = (metrics: Prisma.JsonValue): Record<string, number> => metrics && typeof metrics === "object" && !Array.isArray(metrics)
  ? Object.fromEntries(Object.entries(metrics).filter((entry): entry is [string, number] => typeof entry[1] === "number"))
  : {};
const contentRecord = (row: { id: string; brandId: string; title: string; platform: string; format: string; topic: string; contentType: string | null; campaignId: string | null; publishedDate: Date; text: string; metrics: Prisma.JsonValue; metricsMeasuredAt: Date | null; performance: string; synthetic: boolean }): ContentRecord => ({ contentId: row.id, brandId: row.brandId, title: row.title, platform: row.platform, format: row.format, topic: row.topic, contentType: row.contentType ?? undefined, campaignId: row.campaignId ?? undefined, date: row.publishedDate.toISOString(), text: row.text, metrics: metricsRecord(row.metrics), metricsMeasuredAt: row.metricsMeasuredAt?.toISOString(), performance: row.performance, synthetic: row.synthetic });
const serializeDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

export const prismaDbService = {
  async getBrand(brandId: string) { const row = await getClient().brand.findUnique({ where: { id: brandId } }); return row ? brandRecord(row) : null; },
  async saveBrand(brand: Omit<BrandRecord, "updatedAt">) {
    const data = { name: brand.name, industry: brand.industry, tone: brand.tone, audience: brand.audience, platforms: brand.platforms, goals: brand.goals, competitors: brand.competitors, thingsToAvoid: brand.thingsToAvoid, synthetic: false };
    const row = await getClient().brand.upsert({ where: { id: brand.brandId }, create: { id: brand.brandId, ...data }, update: data });
    return brandRecord(row);
  },
  async listContent(brandId: string) {
    const rows = await getClient().contentItem.findMany({ where: { brandId }, orderBy: { publishedDate: "desc" } });
    return rows.map(contentRecord);
  },
  async ingestContent(input: Omit<ContentRecord, "contentId" | "performance" | "synthetic">) {
    const contentId = (await import("node:crypto")).createHash("sha256").update(`${input.brandId}\n${input.title}\n${input.platform}\n${input.date}`).digest("hex").slice(0, 24);
    const actionCount = (input.metrics.saves ?? 0) + (input.metrics.comments ?? 0) + (input.metrics.clicks ?? 0);
    const data = { brandId: input.brandId, title: input.title, platform: input.platform, format: input.format, topic: input.topic ?? input.title, contentType: input.contentType ?? null, campaignId: input.campaignId ?? null, publishedDate: new Date(input.date), text: input.text, metrics: input.metrics as Prisma.InputJsonValue, metricsMeasuredAt: input.metricsMeasuredAt ? new Date(input.metricsMeasuredAt) : null, performance: actionCount ? `${actionCount} tracked actions` : "Not measured", synthetic: false };
    const row = await getClient().contentItem.upsert({ where: { id: contentId }, create: { id: contentId, ...data }, update: data });
    return contentRecord(row);
  },
  async getAnalytics(brandId: string): Promise<Analytics> {
    const all = (await getClient().contentItem.findMany({ where: { brandId }, orderBy: { publishedDate: "asc" } })).map(contentRecord);
    const entries = all.filter((item) => Object.keys(item.metrics).length).map((item) => ({ item, value: (item.metrics.saves ?? 0) + (item.metrics.comments ?? 0) + (item.metrics.clicks ?? 0) }));
    const group = (key: "platform" | "format") => { const totals = new Map<string, number>(); for (const { item, value } of entries) totals.set(item[key], (totals.get(item[key]) ?? 0) + value); return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); };
    const monthly = new Map<string, number>();
    for (const { item, value } of entries) { const month = item.date.slice(0, 7); monthly.set(month, (monthly.get(month) ?? 0) + value); }
    const dataSource: NonNullable<Analytics["dataSource"]> = entries.every(({ item }) => item.synthetic) && entries.length ? "synthetic" : entries.some(({ item }) => item.synthetic) ? "mixed" : "live";
    return { health: null, status: dataSource === "synthetic" ? "Synthetic development sample; figures are not live account analytics." : "No health-score formula configured; figures summarize imported application metrics.", metricLabel: "Tracked actions (saves + comments + clicks)", dataSource, memory: { strategic: 0, audience: 0, gaps: 0 }, performance: [...monthly].map(([date, value]) => ({ date, value })), byType: group("format"), byPlatform: group("platform"), top: entries.slice().sort((a, b) => b.value - a.value).slice(0, 5).map(({ item }) => item.title), weak: entries.slice().sort((a, b) => a.value - b.value).slice(0, 5).map(({ item }) => item.title) };
  },
  async getPlan(brandId: string) {
    const row = await getClient().weeklyPlan.findUnique({ where: { brandId } });
    return (row?.items as WeeklyPlanRecord["items"] | undefined) ?? [];
  },
  async savePlan(brandId: string, items: WeeklyPlanRecord["items"]) {
    const row = await getClient().weeklyPlan.upsert({ where: { brandId }, create: { brandId, items: items as Prisma.InputJsonValue }, update: { items: items as Prisma.InputJsonValue } });
    return row.items as WeeklyPlanRecord["items"];
  },
  async seedDemoDataset(dataset: DemoDataset) {
    const prisma = getClient();
    await prisma.$transaction(async (tx) => {
      await tx.brand.upsert({ where: { id: dataset.brand.brandId }, create: { id: dataset.brand.brandId, name: dataset.brand.name, industry: dataset.brand.industry, tone: dataset.brand.tone, thingsToAvoid: dataset.brand.thingsToAvoid, audience: dataset.brand.audience, platforms: dataset.brand.platforms, goals: dataset.brand.goals, competitors: dataset.brand.competitors, synthetic: true, updatedAt: new Date(dataset.brand.updatedAt) }, update: { name: dataset.brand.name, industry: dataset.brand.industry, tone: dataset.brand.tone, thingsToAvoid: dataset.brand.thingsToAvoid, audience: dataset.brand.audience, platforms: dataset.brand.platforms, goals: dataset.brand.goals, competitors: dataset.brand.competitors, synthetic: true } });
      for (const campaign of dataset.campaigns) await tx.campaign.upsert({ where: { id: campaign.id }, create: { ...campaign, startDate: serializeDate(campaign.startDate), endDate: serializeDate(campaign.endDate) }, update: { name: campaign.name, description: campaign.description, startDate: serializeDate(campaign.startDate), endDate: serializeDate(campaign.endDate), result: campaign.result } });
      for (const post of dataset.posts) await tx.contentItem.upsert({ where: { id: post.contentId }, create: { id: post.contentId, brandId: post.brandId, title: post.title, platform: post.platform, format: post.format, topic: post.topic ?? post.title, contentType: post.contentType ?? null, campaignId: post.campaignId ?? null, publishedDate: serializeDate(post.date), text: post.text, metrics: post.metrics as Prisma.InputJsonValue, metricsMeasuredAt: post.metricsMeasuredAt ? new Date(post.metricsMeasuredAt) : null, performance: `${(post.metrics.saves ?? 0) + (post.metrics.comments ?? 0) + (post.metrics.clicks ?? 0)} tracked actions`, synthetic: true }, update: { title: post.title, platform: post.platform, format: post.format, topic: post.topic ?? post.title, contentType: post.contentType ?? null, campaignId: post.campaignId ?? null, publishedDate: serializeDate(post.date), text: post.text, metrics: post.metrics as Prisma.InputJsonValue, metricsMeasuredAt: post.metricsMeasuredAt ? new Date(post.metricsMeasuredAt) : null, synthetic: true } });
      for (const comment of dataset.comments) await tx.audienceComment.upsert({ where: { id: comment.id }, create: { ...comment, date: serializeDate(comment.date) }, update: { text: comment.text, themes: comment.themes, date: serializeDate(comment.date), source: comment.source } });
      for (const snapshot of dataset.analyticsSnapshots) await tx.analyticsSnapshot.upsert({ where: { id: snapshot.id }, create: snapshot, update: { topThemes: snapshot.topThemes, weakThemes: snapshot.weakThemes, gaps: snapshot.gaps } });
    });
    return { brands: 1, campaigns: dataset.campaigns.length, posts: dataset.posts.length, comments: dataset.comments.length, analyticsSnapshots: dataset.analyticsSnapshots.length };
  },
  async resetDemoDataset(brandId: string) {
    const prisma = getClient();
    await prisma.$transaction(async (tx) => {
      await tx.weeklyPlan.deleteMany({ where: { brandId } });
      await tx.contentItem.deleteMany({ where: { brandId } });
      await tx.campaign.deleteMany({ where: { brandId } });
      await tx.audienceComment.deleteMany({ where: { brandId } });
      await tx.analyticsSnapshot.deleteMany({ where: { brandId } });
      await tx.brand.deleteMany({ where: { id: brandId } });
    });
  },
  async getDemoCounts(brandId: string) {
    const prisma = getClient();
    const [brands, posts, campaigns, comments, analyticsSnapshots] = await Promise.all([
      prisma.brand.count({ where: { id: brandId } }), prisma.contentItem.count({ where: { brandId } }), prisma.campaign.count({ where: { brandId } }), prisma.audienceComment.count({ where: { brandId } }), prisma.analyticsSnapshot.count({ where: { brandId } }),
    ]);
    return { brands, posts, campaigns, comments, analyticsSnapshots };
  },
};
