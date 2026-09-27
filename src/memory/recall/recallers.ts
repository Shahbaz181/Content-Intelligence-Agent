import { ensureBrandBank, getHindsightClient } from "../hindsightClient.js";
import { HindsightError } from "../internal/errors.js";
import { listAllMemoryRows, recallRows, rowToMemoryItem, withHindsightRetry } from "../internal/runtime.js";
import type { ExplorerMemoryTree, MemoryItem, QuestionRecall, TimelineEvent } from "../schema/types.js";

const read = (brandId: string, query: string) => withHindsightRetry("recall", async (signal) => {
  const bankId = await ensureBrandBank(brandId, signal);
  return getHindsightClient().recall(bankId, query, { budget: "mid", maxTokens: 2048, signal });
});

function memoryItems(value: unknown): MemoryItem[] {
  return recallRows(value).map(rowToMemoryItem).filter((row) => row.text.trim());
}

function unique(items: MemoryItem[]): MemoryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function recallForExplorer(brandId: string): Promise<ExplorerMemoryTree> {
  if (!brandId.trim()) throw new HindsightError("brandId is required", "VALIDATION", 400);
  const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
  const [listed, gaps] = await Promise.all([
    listAllMemoryRows(bankId),
    read(brandId, "Content gaps and topics currently under-covered compared with audience needs"),
  ]);
  const records = listed.map((row) => ({ row, item: rowToMemoryItem(row) }));
  const hasKind = (kind: string) => (row: Record<string, unknown>) => {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
    const tags = Array.isArray(row.tags) ? row.tags : [];
    return metadata.kind === kind || tags.includes(`memory:${kind}`);
  };
  const select = (kind: string) => records.filter(({ row }) => hasKind(kind)(row)).map(({ item }) => item);
  const brand = select("brand");
  const feedback = select("feedback");
  const audience = unique([...brand, ...feedback]);
  const content = unique([...select("content"), ...select("metrics")]);
  const knownKinds = ["brand", "content", "metrics", "experiment", "feedback", "decision"];
  const uncategorized = records.filter(({ row }) => !knownKinds.some((kind) => hasKind(kind)(row))).map(({ item }) => item);
  content.push(...uncategorized);
  const experiments = select("experiment");
  const decisions = select("decision");
  return {
    brandId,
    memoryCount: listed.length,
    brandVoice: brand.map((item) => item.text).slice(0, 12),
    audience: audience.map((item) => item.text).slice(0, 12),
    contentHistory: content,
    experiments,
    preferences: feedback.map((item) => item.text).slice(0, 12),
    gaps: memoryItems(gaps).map((item) => item.text).slice(0, 12),
    decisions,
  };
}

export async function recallForTimeline(brandId: string): Promise<TimelineEvent[]> {
  if (!brandId.trim()) throw new HindsightError("brandId is required", "VALIDATION", 400);
  const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
  const rows = await listAllMemoryRows(bankId);
  return rows.map(rowToMemoryItem).filter((memory) => memory.text.trim()).map((memory) => {
    const date = memory.timestamp || findDate(memory.text) || "";
    return {
      month: date ? date.slice(0, 7) : "Unknown",
      date,
      eventText: memory.text,
      ...(memory.type ? { type: memory.type } : {}),
    };
  }).sort((left, right) => (left.date || "9999").localeCompare(right.date || "9999"));
}

export async function recallForQuestion(brandId: string, question: string): Promise<QuestionRecall> {
  if (!brandId.trim()) throw new HindsightError("brandId is required", "VALIDATION", 400);
  if (!question.trim()) throw new HindsightError("question is required", "VALIDATION", 400);
  const memories = unique(memoryItems(await read(brandId, question)));
  return { brandId, question, memoryCount: memories.length, memories };
}

function findDate(text: string): string | undefined {
  return text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
}
