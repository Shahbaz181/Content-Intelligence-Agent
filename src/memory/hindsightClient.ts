import "dotenv/config";
import { HindsightClient } from "@vectorize-io/hindsight-client";
import { HindsightError } from "./internal/errors.js";

let singleton: HindsightClient | undefined;
const bankSetup = new Map<string, Promise<void>>();

export function getHindsightClient(): HindsightClient {
  if (singleton) return singleton;

  const apiKey = process.env.HINDSIGHT_API_KEY?.trim();  
  const baseUrl = process.env.HINDSIGHT_BASE_URL?.trim() || "https://api.hindsight.vectorize.io";
  if (!apiKey) {
    throw new HindsightError("HINDSIGHT_API_KEY is required", "CONFIGURATION", 500);
  }
  try {
    singleton = new HindsightClient({ apiKey, baseUrl });
    return singleton;
  } catch (cause) {
    throw new HindsightError("Could not initialize the Hindsight client", "CONFIGURATION", 500, { cause });
  }
}

export function getBankId(brandId: string): string {
  const prefix = (process.env.HINDSIGHT_BANK_PREFIX?.trim() || "content-intelligence")
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "content-intelligence";
  const originalBrandId = brandId.trim();
  const normalizedBrandId = originalBrandId.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalizedBrandId) throw new HindsightError("brandId must contain letters or numbers", "VALIDATION", 400);
  // Keep distinct raw identifiers isolated even if their readable slugs collide.
  let hash = 2166136261;
  for (const character of originalBrandId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${prefix}-${normalizedBrandId}-${(hash >>> 0).toString(36)}`;
}

export async function ensureBrandBank(brandId: string, signal?: AbortSignal): Promise<string> {
  const bankId = getBankId(brandId);
  const existing = bankSetup.get(bankId);
  if (existing) {
    await existing;
    return bankId;
  }
  const setup = getHindsightClient().createBank(bankId, { signal }).then(() => undefined);
  bankSetup.set(bankId, setup);
  try {
    await setup;
    return bankId;
  } catch (cause) {
    bankSetup.delete(bankId);
    throw cause;
  }
}
