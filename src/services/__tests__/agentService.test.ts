import assert from "node:assert/strict";
import test from "node:test";
import type { MemoryItem, QuestionRecall } from "../../memory/schema/types.js";
import { AgentError } from "../agentErrors.js";
import { createGroqAgentService } from "../groqAgent.js";
import { completeWithGroq, type GroqCompletionClient, type GroqCompletionParams } from "../groqClient.js";

const recalled: MemoryItem = { memoryId: "feedback-1", text: "Audience asked for more practical implementation examples." };
const modelResult = (items: string[]) => ({ brandId: "brand-test", mentalModelId: "model-test", items, source: "reflect" as const });
function mockMemory(items = [recalled]): NonNullable<NonNullable<Parameters<typeof createGroqAgentService>[0]>["memory"]> {
  const recall: QuestionRecall = { brandId: "brand-test", question: "Question", memoryCount: items.length, memories: items };
  return {
    recallForQuestion: async () => recall,
    reflectBrandVoice: async () => modelResult(["Clear, direct voice."]),
    reflectTopTopics: async () => modelResult(["Implementation examples."]),
    reflectAudiencePreferences: async () => modelResult(["Audience requests practical examples."]),
    reflectFailedStrategies: async () => modelResult([]),
    reflectContentGaps: async () => modelResult([]),
  };
}
function completion(content: string) {
  return { choices: [{ message: { content } }] } as unknown as Awaited<ReturnType<GroqCompletionClient["chat"]["completions"]["create"]>>;
}
const valid = (memoriesUsed = 1) => JSON.stringify({
  recommendation: "Publish a practical implementation example based on retrieved feedback.",
  reasoning: ["[Memory #1] The audience explicitly requested implementation examples."],
  format: "step-by-step tutorial", memoriesUsed,
});

test("askAgent uses retrieved memories and returns only the four contract keys", async () => {
  const service = createGroqAgentService({ memory: mockMemory(), complete: async () => completion(valid(999)) });
  const result = await service.askAgent("brand-test", "What should we publish?");
  assert.deepEqual(Object.keys(result), ["recommendation", "reasoning", "format", "memoriesUsed"]);
  assert.equal(result.memoriesUsed, 1, "model output cannot override Hindsight's actual memory count");
  assert.match(result.reasoning[0], /\[Memory #1\]/);
});

test("askAgent accepts valid cited memory labels when the model omits citation brackets", async () => {
  const service = createGroqAgentService({ memory: mockMemory(), complete: async () => completion(JSON.stringify({
    recommendation: "Publish a practical implementation example.",
    reasoning: ["Memory #1 shows an explicit audience request for examples."], format: "tutorial", memoriesUsed: 1,
  })) });
  const result = await service.askAgent("brand-test", "What next?");
  assert.equal(result.memoriesUsed, 1);
});

test("zero-memory output must clearly state its evidence limitation", async () => {
  const service = createGroqAgentService({ memory: mockMemory([]), complete: async () => completion(JSON.stringify({
    recommendation: "This is a generic suggestion because there is no retained brand history.",
    reasoning: ["No Hindsight memories were retrieved, so personalization is unsupported."], format: "short post", memoriesUsed: 0,
  })) });
  assert.equal((await service.askAgent("brand-test", "What next?")).memoriesUsed, 0);
});

test("targeted audience recall adds actual feedback records to memoriesUsed", async () => {
  const practical: MemoryItem = { memoryId: "feedback-new", text: "We need more practical examples." };
  const memory = mockMemory();
  memory.recallForQuestion = async (_brandId, question) => ({
    brandId: "brand-test", question, memoryCount: 1,
    memories: question.startsWith("Recent audience feedback") ? [practical] : [recalled],
  });
  const service = createGroqAgentService({ memory, complete: async () => completion(valid(2)) });
  const result = await service.askAgent("brand-test", "What next?");
  assert.equal(result.memoriesUsed, 2);
});

test("targeted feedback is prioritized into the capped evidence prompt", async () => {
  const questionMemories = Array.from({ length: 12 }, (_, index): MemoryItem => ({ memoryId: `content-${index}`, text: `Older content evidence ${index}.` }));
  const freshFeedback: MemoryItem = { memoryId: "feedback-new", text: "We need more practical examples." };
  const memory = mockMemory();
  memory.recallForQuestion = async (_brandId, question) => ({
    brandId: "brand-test", question, memoryCount: 1,
    memories: question.startsWith("Recent audience feedback") ? [freshFeedback] : questionMemories,
  });
  let params: GroqCompletionParams | undefined;
  const service = createGroqAgentService({ memory, complete: async (input) => {
    params = input;
    return completion(JSON.stringify({
      recommendation: "Add practical examples in response to the audience feedback.",
      reasoning: ["[Memory #1] Audience feedback asks for practical examples."], format: "tutorial", memoriesUsed: 13,
    }));
  } });
  const result = await service.askAgent("brand-test", "What next?");
  assert.equal(result.memoriesUsed, 13);
  assert.match(JSON.stringify(params?.messages), /We need more practical examples/);
  assert.doesNotMatch(JSON.stringify(params?.messages), /Older content evidence 11/);
});

test("invalid schema is corrected once and then rejected with AgentError", async () => {
  let calls = 0;
  const service = createGroqAgentService({ memory: mockMemory(), complete: async () => {
    calls += 1;
    return completion(calls === 1 ? "not-json" : JSON.stringify({ recommendation: "Try a practical post.", reasoning: ["It should work."], format: "post", memoriesUsed: 1 }));
  } });
  await assert.rejects(service.askAgent("brand-test", "What next?"), (error: unknown) => error instanceof AgentError && error.code === "INVALID_RESPONSE");
  assert.equal(calls, 2);
});

test("invalid first response is retried once and a corrected response is accepted", async () => {
  let calls = 0;
  const service = createGroqAgentService({ memory: mockMemory(), complete: async () => {
    calls += 1;
    return completion(calls === 1 ? "not-json" : valid());
  } });
  const result = await service.askAgent("brand-test", "What next?");
  assert.equal(calls, 2);
  assert.equal(result.memoriesUsed, 1);
});

test("question input validation fails before making an upstream call", async () => {
  let calls = 0;
  const service = createGroqAgentService({ memory: mockMemory(), complete: async () => { calls += 1; return completion(valid()); } });
  await assert.rejects(service.askAgent(" ", "Question"), (error: unknown) => error instanceof AgentError && error.code === "VALIDATION");
  assert.equal(calls, 0);
});

test("content generation uses the requested format and returns content only", async () => {
  let request: GroqCompletionParams | undefined;
  const service = createGroqAgentService({ memory: mockMemory(), complete: async (params) => {
    request = params;
    return completion(JSON.stringify({ content: "A concise tutorial draft." }));
  } });
  assert.equal(await service.generateContent("brand-test", "Show an implementation example", "carousel"), "A concise tutorial draft.");
  assert.match(JSON.stringify(request), /carousel/);
});

test("whatDidWeLearn combines existing Hindsight mental models only", async () => {
  const service = createGroqAgentService({ memory: mockMemory() });
  const learned = await service.whatDidWeLearn("brand-test");
  assert.deepEqual(learned, ["Clear, direct voice.", "Implementation examples.", "Audience requests practical examples."]);
});

test("Groq retries a 429 once and returns a typed error if it stays rate-limited", async () => {
  let calls = 0;
  const secret = "test-only-secret-value";
  const client = { chat: { completions: { create: async () => { calls += 1; throw Object.assign(new Error(`rate limited ${secret}`), { status: 429 }); } } } } as unknown as GroqCompletionClient;
  await assert.rejects(completeWithGroq({ model: "openai/gpt-oss-120b", messages: [{ role: "user", content: "x" }] }, client), (error: unknown) => error instanceof AgentError && error.code === "RATE_LIMIT" && !error.message.includes(secret));
  assert.equal(calls, 2);
});

test("Groq timeout is bounded and reported as AgentError", async () => {
  const client = { chat: { completions: { create: async () => { throw Object.assign(new Error("timeout"), { name: "APIConnectionTimeoutError" }); } } } } as unknown as GroqCompletionClient;
  await assert.rejects(completeWithGroq({ model: "openai/gpt-oss-120b", messages: [{ role: "user", content: "x" }] }, client), (error: unknown) => error instanceof AgentError && error.code === "TIMEOUT");
});
