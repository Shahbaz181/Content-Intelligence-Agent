import type { AgentResponse } from "../types/index.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { AgentError } from "./agentErrors.js";
import { askAgentDevelopmentFallback } from "./developmentAgent.js";
import { createGroqAgentService } from "./groqAgent.js";
import { hindsightAdapter } from "./hindsightService.js";

const groqAgent = createGroqAgentService();

async function generateContent(brandId: string, recommendation: string, format: string): Promise<string> {
  if (!env.GROQ_API_KEY?.trim() && (env.NODE_ENV === "development" || env.NODE_ENV === "test")) {
    logger.warn("Groq is not configured; using Hindsight Reflect for development content generation", { brandId });
    const [voice, audience] = await Promise.all([hindsightAdapter.reflectForPrompt(brandId, "Summarize the brand voice, tone, and content rules from its memories."), hindsightAdapter.reflectForPrompt(brandId, "Summarize audience preferences and requests from retained feedback memories.")]);
    const result = await hindsightAdapter.reflectForPrompt(brandId, [
      "Write one publishable piece of content. Return only the draft itself.",
      "Use only remembered facts. Do not invent metrics, dates, outcomes, customer quotes, or unsupported audience preferences.",
      `Format: ${format}. Topic/strategy request: ${recommendation}`,
      `Brand voice and rules: ${voice.answer}`,
      `Audience preferences: ${audience.answer}`,
    ].join("\n\n"));
    return result.answer.trim();
  }
  return groqAgent.generateContent(brandId, recommendation, format);
}

async function askAgent(brandId: string, question: string): Promise<AgentResponse> {
  if (!env.GROQ_API_KEY?.trim()) {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      logger.warn("Groq is not configured; using the documented development Hindsight-only agent", { brandId });
      return askAgentDevelopmentFallback(brandId, question);
    }
    throw new AgentError("GROQ_API_KEY is not configured.", "CONFIGURATION", 503);
  }
  logger.info("Agent request started", { brandId, model: env.GROQ_MODEL });
  const started = Date.now();
  try {
    const result = await groqAgent.askAgent(brandId, question);
    logger.info("Agent request succeeded", { brandId, memoriesUsed: result.memoriesUsed, durationMs: Date.now() - started });
    return result;
  } catch (error) {
    logger.error("Agent request failed", { brandId, durationMs: Date.now() - started, code: error instanceof AgentError ? error.code : "UPSTREAM" });
    throw error;
  }
}

export const agentService = {
  askAgent,
  generateContent,
  whatDidWeLearn: groqAgent.whatDidWeLearn,
};

// Kept as a named alias for existing Member 2 controllers and the Member 5 demo script.
export { askAgent };
