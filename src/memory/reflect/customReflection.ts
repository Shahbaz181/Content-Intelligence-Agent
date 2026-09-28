import { ensureBrandBank, getHindsightClient } from "../hindsightClient.js";
import { HindsightError } from "../internal/errors.js";
import { withHindsightRetry } from "../internal/runtime.js";
import type { PromptReflection } from "../schema/types.js";

/** Run a backend-owned prompt through Hindsight Reflect without exposing the SDK to UI code. */
export async function reflectForPrompt(brandId: string, prompt: string): Promise<PromptReflection> {
  if (!brandId.trim()) throw new HindsightError("brandId is required", "VALIDATION", 400);
  if (!prompt.trim()) throw new HindsightError("prompt is required", "VALIDATION", 400);
  const bankId = await withHindsightRetry("ensure brand memory bank", (signal) => ensureBrandBank(brandId, signal));
  const result = await withHindsightRetry("reflect custom prompt", (signal) =>
    getHindsightClient().reflect(bankId, prompt, { budget: "mid", signal }),
  );
  const answer = result.text.trim();
  if (!answer) throw new HindsightError("Hindsight returned an empty reflection", "UPSTREAM", 502);
  return { brandId, answer, source: "reflect" };
}
