# Team integration contract

## Member 2 — API and application-data contract

The Express controllers call `dbService` for structured business/application data. The adapter uses PostgreSQL through Prisma when `DATABASE_URL` is present; otherwise it uses the existing atomic JSON development store. Neither path stores Hindsight recall output as application memory. API responses stay direct JSON, and `GET /health` returns the existing status/service object.

Core application records are a brand profile, campaigns, content items and their structured metrics, audience comments, monthly analytics snapshots, and weekly plan. Their brand foreign keys cascade. Content-to-campaign is optional and indexed.

## Member 3 — Hindsight contract

All persistent AI memory writes and recall continue through `src/memory/hindsightService.ts`. Member 5's thin adapter uses its `retainBatch(records, chunkSize)` for the demo dataset and `retainFeedback()` for Act 4. Dataset inputs map to `retainBrand()`, `retainPost()`, `retainMetrics()`, `retainFeedback()`, and `retainDecision()`. Stable item IDs and fixed event timestamps make repeated seed calls idempotent. The application database does not mirror Hindsight memories.

Hindsight bank isolation uses `brandId`. The public service currently has no delete-bank/clear-memories method; `seed:reset` therefore resets only application records and reuses deterministic Hindsight document IDs. Use a new brand ID for a clean bank.

## Member 4 — Agent contract

The shared API is:

```ts
agentService.askAgent(brandId: string, question: string): Promise<{
  recommendation: string;
  reasoning: string[];
  format: string;
  memoriesUsed: number;
}>;
```

The API route is `POST /agent/ask` with `{ brandId?, question }`. `memoriesUsed` counts distinct records actually returned by Hindsight for the question. Groq GPT-OSS 120B generates a strict JSON Schema response grounded in numbered Hindsight records; Zod and evidence-reference validation run before returning the exact four-field contract. `agentService` also exposes `generateContent(brandId, recommendation, format)` and `whatDidWeLearn(brandId)`. Configure `GROQ_API_KEY` and `GROQ_MODEL=openai/gpt-oss-120b` in the server environment. In development/test only, an absent Groq key uses the logged Hindsight-only deterministic fallback so the four-act demo remains runnable; production fails with a typed configuration error rather than silently falling back.

## Member 5 — seed and demo contract

- `npm run dataset:validate` checks dataset constraints and the three-month trend.
- `npm run seed` upserts deterministic application data and calls Member 3's actual batch-retain service.
- `npm run seed:feedback` retains the exact Act 4 feedback.
- `npm run seed:reset` resets application data for the default demo brand, then re-seeds. It does not erase remote Hindsight memory.
- `npm run demo` executes cold question → seed → same question → new feedback → same question against a unique Hindsight brand bank by default.

Use `DEMO_BRAND_ID` to choose a stable brand ID. A stable bank is convenient for repeatability but is only cold before it has retained memories.
