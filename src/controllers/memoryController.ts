import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { validated } from "../middleware/validateRequest.js";
import { hindsightAdapter } from "../services/hindsightService.js";
import type { MemoryItem } from "../memory/schema/types.js";
import type { MemoryNode } from "../types/index.js";

type BrandQuery = { brandId?: string };
const getId = (res: Parameters<RequestHandler>[1]) => validated<BrandQuery>(res, "query").brandId ?? env.HINDSIGHT_BRAND_ID;
const node = (id: string, label: string, items: MemoryItem[] | string[]): MemoryNode => {
  const children = items.map((value, index) => {
    const item = typeof value === "string" ? { text: value } : value;
    const date = item.timestamp?.slice(0, 10);
    return { id: `${id}-${index + 1}`, label: `${date ? `${date} · ` : ""}${item.type ?? label}`, memoryCount: 1, detail: [item.text] };
  });
  return { id, label, memoryCount: children.length, children };
};

export const getMemoryExplorerController: RequestHandler = async (_req, res) => {
  const tree = await hindsightAdapter.recallForExplorer(getId(res));
  res.json([
    node("voice", "Brand Voice", tree.brandVoice), node("audience", "Audience", tree.audience), node("content", "Content History", tree.contentHistory),
    node("experiments", "Experiments", tree.experiments), node("preferences", "Preferences", tree.preferences), node("gaps", "Gaps", tree.gaps), node("decisions", "Strategic Decisions", tree.decisions),
  ] satisfies MemoryNode[]);
};

export const getMemoryTimelineController: RequestHandler = async (_req, res) => {
  const events = await hindsightAdapter.recallForTimeline(getId(res));
  res.json(events.map((event) => ({ month: event.month, text: event.eventText })));
};
