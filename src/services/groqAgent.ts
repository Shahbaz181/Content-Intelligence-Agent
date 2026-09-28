import { z } from "zod";
import type { AgentResponse } from "../types/index.js";
import { hindsightService } from "../memory/hindsightService.js";
import type { MemoryItem, QuestionRecall } from "../memory/schema/types.js";
import { env } from "../config/env.js";
import { AgentError } from "./agentErrors.js";
import { completeWithGroq, type GroqCompletionClient } from "./groqClient.js";

const askResponseSchema = z.object({
  recommendation: z.string().trim().min(1).max(2400),
  reasoning: z.array(z.string().trim().min(1).max(700)).min(1).max(6),
  format: z.string().trim().min(1).max(120),
  memoriesUsed: z.number().int().nonnegative(),
}).strict();

const contentResponseSchema = z.object({ content: z.string().trim().min(1).max(12000) }).strict();
const outputJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    recommendation: { type: "string" },
    reasoning: { type: "array", items: { type: "string", description: "Each item starts with a valid evidence citation like [Memory #1]." } },
    format: { type: "string" },
    memoriesUsed: { type: "integer", minimum: 0 },
  },
  required: ["recommendation", "reasoning", "format", "memoriesUsed"],
};
const contentJsonSchema = {
  type: "object", additionalProperties: false,
  properties: { content: { type: "string" } }, required: ["content"],
};

type MemoryService = Pick<typeof hindsightService,
  "recallForQuestion" | "reflectBrandVoice" | "reflectTopTopics" | "reflectAudiencePreferences" | "reflectFailedStrategies" | "reflectContentGaps">;
type Completion = typeof completeWithGroq;

export function createGroqAgentService(deps: { memory?: MemoryService; complete?: Completion; groq?: GroqCompletionClient } = {}) {
  const memory = deps.memory ?? hindsightService;
  const call = (params: Parameters<Completion>[0]) => deps.complete
    ? deps.complete(params, deps.groq)
    : completeWithGroq(params, deps.groq);

  return {
    async askAgent(brandId: string, question: string): Promise<AgentResponse> {
      const input = validateInput(brandId, question);
      let questionRecall: QuestionRecall;
      let feedbackRecall: QuestionRecall;
      try {
        [questionRecall, feedbackRecall] = await Promise.all([
          memory.recallForQuestion(input.brandId, input.question),
          memory.recallForQuestion(input.brandId, `Recent audience feedback, preferences, and requests relevant to: ${input.question}`),
        ]);
      }
      catch (cause) { throw new AgentError("Hindsight could not retrieve memories for this question.", "UPSTREAM", 502, { cause }); }
      // Put targeted audience feedback first so fresh feedback is not crowded out when the prompt is capped.
      const memories = uniqueMemories([...feedbackRecall.memories, ...questionRecall.memories]);
      const evidenceMemories = memories.slice(0, 8);
      const [voice, topics, audience] = await Promise.allSettled([
        memory.reflectBrandVoice(input.brandId), memory.reflectTopTopics(input.brandId), memory.reflectAudiencePreferences(input.brandId),
      ]);
      const reflections = uniqueStrings([voice, topics, audience].flatMap((result) => result.status === "fulfilled" ? result.value.items : [])).slice(0, 6).map((item) => item.slice(0, 400));
      const evidence = evidenceMemories.map((item, index) => `Memory #${index + 1}${item.memoryId ? ` (id: ${item.memoryId})` : ""}: ${item.text.slice(0, 650)}`);
      const context = [
        `Hindsight returned ${memories.length} distinct records; the following ${evidence.length} most relevant records are supplied as evidence.`,
        evidence.length ? `Hindsight evidence:\n${evidence.join("\n")}` : "Hindsight evidence: NONE. No memory was retrieved for this brand and question.",
        reflections.length ? `Hindsight mental-model summaries (context only; cite retrieved memories in reasoning):\n${uniqueStrings(reflections).slice(0, 12).map((item) => `- ${item}`).join("\n")}` : "Hindsight mental-model summaries: none available.",
      ].join("\n\n");

      const baseMessages = [
        { role: "system" as const, content: [
          "You are a careful content strategy assistant. Use only facts in the supplied Hindsight evidence and mental-model summaries.",
          "Never invent statistics, dates, outcomes, audience preferences, brand details, or performance claims.",
          "If evidence is insufficient, state that clearly and make any suggestion explicitly generic and evidence-limited.",
          "When evidence exists, every reasoning bullet MUST start with an exact citation such as [Memory #1], using only a label that appears in Hindsight evidence. Example: [Memory #2] Audience feedback explicitly requests practical examples. Never return an uncited reasoning bullet or imply evidence not retrieved.",
          "Return concise reasoning only; do not expose private chain-of-thought. Do not use tools.",
          `The server will set memoriesUsed from Hindsight's actual returned records (${memories.length}); echo that number in JSON.`,
          "Return only the requested JSON object matching the schema.",
        ].join(" ") },
        { role: "user" as const, content: `Question: ${input.question}\n\n${context}` },
      ];
      let lastFailure: AgentError | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const messages = attempt === 0 ? baseMessages : [
          ...baseMessages,
          { role: "user" as const, content: `Your previous output failed validation: ${lastFailure?.message}. Correct it. Return valid JSON only. Each reasoning item must cite a valid supplied memory label${evidence.length ? ` from [Memory #1] through [Memory #${evidence.length}]` : "; because there are no memories, explicitly say no retrieved evidence supports personalization"}. memoriesUsed must be ${memories.length}.` },
        ];
        const completion = await call({
          model: env.GROQ_MODEL,
          reasoning_effort: "low",
          max_completion_tokens: 1000,
          messages,
          response_format: { type: "json_schema", json_schema: { name: "content_strategy_recommendation", strict: true, schema: outputJsonSchema } },
        });
        const content = completion.choices[0]?.message?.content;
        try {
          if (!content) throw new Error("Groq returned an empty response.");
          const parsed = askResponseSchema.parse(JSON.parse(content));
          validateGrounding(parsed, memories.length, evidence.length);
          return { recommendation: parsed.recommendation, reasoning: parsed.reasoning, format: parsed.format, memoriesUsed: memories.length };
        } catch (cause) {
          lastFailure = new AgentError("Groq returned a response that failed structured-output validation or evidence checks.", "INVALID_RESPONSE", 502, { cause });
        }
      }
      throw lastFailure ?? new AgentError("Groq returned an invalid response.", "INVALID_RESPONSE", 502);
    },

    async generateContent(brandId: string, recommendation: string, format: string): Promise<string> {
      validateInput(brandId, recommendation);
      const chosenFormat = format.trim();
      if (!chosenFormat) throw new AgentError("format is required.", "VALIDATION", 400);
      const [voice, audience] = await Promise.all([memory.reflectBrandVoice(brandId), memory.reflectAudiencePreferences(brandId)]);
      const instructions = [
        "Create the publishable content requested below. Return only the content itself, with no explanation or strategy notes.",
        "Use only facts in the supplied Hindsight mental models and instruction. Do not invent statistics, dates, outcomes, quotes, or factual claims.",
        `Format: ${chosenFormat}. Respect its normal structure and conventions.`,
        `Recommendation/topic: ${recommendation}`,
        `Hindsight brand voice: ${voice.items.length ? voice.items.slice(0, 6).map((item) => item.slice(0, 500)).join("; ") : "No retained voice guidance; use a clear neutral tone."}`,
        `Hindsight audience preferences: ${audience.items.length ? audience.items.slice(0, 6).map((item) => item.slice(0, 500)).join("; ") : "No retained audience preferences; keep it broadly useful and avoid claiming preferences."}`,
      ].join("\n\n");
      const completion = await call({ model: env.GROQ_MODEL, reasoning_effort: "low", messages: [
        { role: "system", content: "You write accurate brand content grounded in the provided Hindsight context. Never fabricate claims." },
        { role: "user", content: instructions },
      ], max_completion_tokens: 1400, response_format: { type: "json_schema", json_schema: { name: "generated_content", strict: true, schema: contentJsonSchema } } });
      const raw = completion.choices[0]?.message?.content;
      try { return contentResponseSchema.parse(JSON.parse(raw ?? "")).content; }
      catch (cause) { throw new AgentError("Groq returned invalid generated content.", "INVALID_RESPONSE", 502, { cause }); }
    },

    async whatDidWeLearn(brandId: string): Promise<string[]> {
      if (!brandId.trim()) throw new AgentError("brandId is required.", "VALIDATION", 400);
      const models = await Promise.all([
        memory.reflectBrandVoice(brandId), memory.reflectTopTopics(brandId), memory.reflectAudiencePreferences(brandId),
        memory.reflectFailedStrategies(brandId), memory.reflectContentGaps(brandId),
      ]);
      const insights = uniqueStrings(models.flatMap((result) => result.items.map((item) => item.trim())).filter(Boolean));
      return insights.slice(0, 6);
    },
  };
}

function validateInput(brandId: string, question: string): { brandId: string; question: string } {
  if (!brandId.trim()) throw new AgentError("brandId is required.", "VALIDATION", 400);
  if (!question.trim() || question.length > 4000) throw new AgentError("question/recommendation must be 1–4000 characters.", "VALIDATION", 400);
  return { brandId: brandId.trim(), question: question.trim() };
}

function uniqueMemories(memories: MemoryItem[]): MemoryItem[] {
  const seen = new Set<string>();
  return memories.filter((item) => {
    const key = item.memoryId?.trim() || item.text.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => { const key = item.trim().toLocaleLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}

function validateGrounding(response: z.infer<typeof askResponseSchema>, memoryCount: number, evidenceCount: number): void {
  if (memoryCount === 0) {
    if (!/(?:no|without|insufficient|limited|lack).{0,40}(?:evidence|memory|history)|generic|not enough/i.test(response.recommendation)) {
      throw new Error("The zero-memory recommendation does not identify itself as generic/evidence-limited.");
    }
    return;
  }
  const validRefs = new Set(Array.from({ length: evidenceCount }, (_, index) => `memory #${index + 1}`));
  for (const item of response.reasoning) {
    const refs = [...item.toLocaleLowerCase().matchAll(/\bmemory\s*#\s*(\d+)\b/g)].map((match) => `memory #${match[1]}`);
    if (!refs.length || refs.some((reference) => !validRefs.has(reference))) throw new Error("Every reasoning item must cite a valid retrieved memory label.");
  }
}
