import { ensureBrandBank, getHindsightClient } from "../hindsightClient.js";
import { recallRows, rowToMemoryItem, toShortStrings, withHindsightRetry } from "../internal/runtime.js";
import type { MentalModelResult } from "../schema/types.js";

type Model = { id: string; name: string; question: string; fallbackQuery: string };
const models = {
  brandVoice: {
    id: "brand-voice",
    name: "Brand Voice Model",
    question: "What is this brand's voice and communication style?",
    fallbackQuery: "brand voice tone communication style and words to avoid",
  },
  topTopics: {
    id: "top-topics",
    name: "Top Topics Model",
    question: "What content topics consistently perform well for this brand?",
    fallbackQuery: "content topics that perform well, supported by post metrics",
  },
  audiencePreferences: {
    id: "audience-preferences",
    name: "Audience Preferences Model",
    question: "What audience preferences have emerged over time?",
    fallbackQuery: "audience feedback preferences questions and recurring themes",
  },
  failedStrategies: {
    id: "failed-strategies",
    name: "Failed Strategies Model",
    question: "What content strategies have failed, and what evidence supports that?",
    fallbackQuery: "failed content strategies and experiment results",
  },
  contentGaps: {
    id: "content-gaps",
    name: "Content Gaps Model",
    question: "What topics are currently under-covered compared with audience needs?",
    fallbackQuery: "content gaps and topics under-covered compared with audience questions",
  },
} satisfies Record<string, Model>;

const persistentModelIds = new Map<string, Promise<string>>();

async function ensurePersistentModel(brandId: string, bankId: string, model: Model): Promise<string> {
  const cacheKey = `${bankId}:${model.id}`;
  const existing = persistentModelIds.get(cacheKey);
  if (existing) return existing;

  const promise = withHindsightRetry(`find ${model.name}`, (signal) => getHindsightClient().listMentalModels(
    bankId,
    { tags: [`mental-model:${model.id}`], tagsMatch: "all", detail: "metadata", limit: 10, signal },
  )).then(async (listed) => {
    const found = listed.items.find((item) => item.id === `ci-${model.id}`);
    if (found) return found.id;
    const created = await withHindsightRetry(`create ${model.name}`, (signal) => getHindsightClient().createMentalModel(
      bankId,
      model.name,
      `${model.question} Return concise evidence-based insights as a short structured list.`,
      {
        id: `ci-${model.id}`,
        tags: [`brand:${brandId}`, `mental-model:${model.id}`],
        maxTokens: 500,
        trigger: {
          mode: "full",
          refreshAfterConsolidation: true,
          minRefreshIntervalSeconds: 60,
          tagsMatch: "any",
        },
        signal,
      },
    ));
    return created.mental_model_id || `ci-${model.id}`;
  });
  persistentModelIds.set(cacheKey, promise);
  try {
    return await promise;
  } catch (cause) {
    persistentModelIds.delete(cacheKey);
    throw cause;
  }
}

async function reflectModel(brandId: string, model: Model): Promise<MentalModelResult> {
  const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
  const mentalModelId = await ensurePersistentModel(brandId, bankId, model);
  const prompt = `Synthesize the current ${model.name} for brand ${brandId}. ${model.question} Use only evidence in memory. Return a JSON array of at most 8 concise strings, each a factual insight. If evidence is missing, return an empty array.`;
  const response = await withHindsightRetry(`reflect ${model.name}`, (signal) =>
    getHindsightClient().reflect(bankId, prompt, { budget: "mid", signal }),
  );
  const items = toShortStrings(parseStructured(response.text));
  if (items.length) return { brandId, mentalModelId, items, source: "reflect" };

  const recalled = await withHindsightRetry(`recall ${model.name}`, (signal) =>
    getHindsightClient().recall(bankId, model.fallbackQuery, { budget: "mid", maxTokens: 1024, signal }),
  );
  const fallbackItems = recallRows(recalled).map(rowToMemoryItem).map((memory) => memory.text).filter(Boolean).slice(0, 8);
  return { brandId, mentalModelId, items: fallbackItems, source: "recall-fallback" };
}

function parseStructured(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed) as unknown; } catch { return text; }
}

export const reflectBrandVoice = (brandId: string) => reflectModel(brandId, models.brandVoice);
export const reflectTopTopics = (brandId: string) => reflectModel(brandId, models.topTopics);
export const reflectAudiencePreferences = (brandId: string) => reflectModel(brandId, models.audiencePreferences);
export const reflectFailedStrategies = (brandId: string) => reflectModel(brandId, models.failedStrategies);
export const reflectContentGaps = (brandId: string) => reflectModel(brandId, models.contentGaps);
