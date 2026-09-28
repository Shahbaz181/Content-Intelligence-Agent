# Four-act demo

Start the API and frontend with `npm run dev`, make sure the API health endpoint is healthy, and ensure valid server-side `HINDSIGHT_API_KEY` and `GROQ_API_KEY` values are configured. If using PostgreSQL, set `DATABASE_URL` and run `npm run db:migrate` first. The demo script exercises the actual `agentService.askAgent`, Groq when configured, application store, and Member 3 Hindsight service; it does not manufacture agent responses or memory counts.

Run `npm run demo`. By default it creates an isolated run-specific brand ID so Act 1 can ask against an actually empty Hindsight bank. To intentionally continue the same bank, set `DEMO_BRAND_ID`; that bank may already have memories, so it may no longer be a cold start. Data content and metrics stay deterministic either way.

## Act 1 — Cold agent

Ask exactly: **“What should we post next week?”** The response should show the real Hindsight recall count. A new run-specific bank should return zero relevant memories and an appropriately generic response.

## Act 2 — Teach the agent

`seedDemo` upserts the fictional brand, 12 campaigns, 36 posts with dated metrics, 60 comments, and three analytics snapshots into PostgreSQL (when configured) or the local JSON development store. It then sends brand, posts, metrics, comments, and decisions through Member 3's `retainBatch` implementation. Document IDs and timestamps are stable, so rerunning the seed does not duplicate Hindsight records.

## Act 3 — Memory-enabled response

Ask the exact same question. `memoriesUsed` comes from Hindsight recall, and the response includes recalled memory evidence. Review reasoning against the actual returned evidence rather than expecting fixed wording.

## Act 4 — Adaptation

The demo retains the exact feedback **“We need more practical examples.”** through Member 3's `retainFeedback` method, then asks the same question again. The recommendation should take the new request into account when Hindsight returns it. The demo prints whether the recommendation changed; it will not claim adaptation if the retrieved feedback did not affect the output.

## Reset and recovery

- `npm run seed:reset` clears/recreates this brand's application rows, then upserts its Hindsight memories under the same stable IDs. Hindsight data is not deleted because Member 3's public service has no bank-delete/reset operation.
- To get a genuinely empty Hindsight bank for Act 1, use a new `DEMO_BRAND_ID` or run `npm run demo` without one. Hindsight uses a per-brand bank, so this creates an isolated cold start without falsifying memory counts.
- If Hindsight is unavailable, stop and fix the API key, base URL, credits, or network first. Do not present a seeded-but-not-retained state as a memory demo. Keep a clearly labeled screen recording of a successful real run as a backup.
- If Groq is unavailable in development, the logged fallback still recalls real Hindsight memories and produces an evidence-based response. Treat that run as fallback mode rather than as a Groq integration run.
- If deployment fails, run locally using the commands above and use a screen recording captured from a successful run. Do not describe a local demo as a cloud deployment.
