# Member 3: Hindsight memory service

The module keeps persistent brand memories in Hindsight Cloud. Backend and agent code should import only from `./hindsightService.js` (or `src/memory/hindsightService.js` in this repository). Each brand maps to its own bank (`HINDSIGHT_BANK_PREFIX` + normalized `brandId`) and every retained document also carries a `brandId` tag and metadata.

## Setup

1. Copy `.env.example` to `.env` and set `HINDSIGHT_API_KEY` to the private API key. The memory client loads `.env` automatically. Keep `.env` local; it is ignored by Git.
2. Set `HINDSIGHT_BASE_URL` to the Hindsight Cloud URL, or to your self-hosted endpoint.
3. Install dependencies with `npm install`.
4. Verify access with `npm run memory:smoke`. The check retains a short synthetic memory in the `hindsight-smoke` bank and recalls it. The smoke check does not delete that memory.
5. With Hindsight account credits available, verify live adaptation with `npm run memory:verify-adaptation`; this writes one synthetic feedback memory into a unique smoke bank, then checks recall and a fresh audience-preference reflection.
6. Verify that Hindsight retains separate snapshots with `npm run memory:verify-metrics-history`; this writes two synthetic metric measurements with distinct timestamps into a unique smoke bank and confirms both are returned by Explorer recall.

The current client API is `new HindsightClient({ apiKey, baseUrl })`; `retain(bankId, content, options?)`, `retainBatch(bankId, items, options?)`, `recall(bankId, query, options?)`, and `reflect(bankId, query, options?)` are positional async methods. Retain uses stable `documentId` values so retrying a timed-out request is idempotent. Toolchain pins are Node 24.21.0, npm 11.19.0, TypeScript 7.0.2, and Hindsight client 0.10.1.

## Public functions

| Function | Input | Output |
| --- | --- | --- |
| `retainBrand(brandId, brandData, { capturedAt? })` | Brand profile snapshot and optional source timestamp | `RetainResult` with success, versioned memory ID, brand ID and kind |
| `retainPost(brandId, postData)` | Post ID, title, platform, format, topic, date and optional metrics | `RetainResult` |
| `retainMetrics(brandId, postId, metrics, { measuredAt? })` | Post ID, metric values and optional source measurement timestamp | `RetainResult` with versioned memory ID |
| `retainExperiment(brandId, experimentData)` | Experiment ID, description, result, observation and optional date | `RetainResult` |
| `retainFeedback(brandId, feedbackData)` | Feedback ID, source, text, themes and date | `RetainResult` |
| `retainDecision(brandId, decisionData)` | Decision ID, decision, outcome, implication and date | `RetainResult` |
| `retainBatch(records, chunkSize?)` | Seed rows tagged by brand and memory kind; chunk defaults to 50 | `{ succeeded, failed }`, one item result per input row |
| `recallForExplorer(brandId)` | Brand ID | Categorized memory tree for the Explorer |
| `recallForTimeline(brandId)` | Brand ID | Chronological `{ month, date, eventText }` events |
| `recallForQuestion(brandId, question)` | Brand ID and agent question | Relevant memory subset and count |
| `reflectBrandVoice(brandId)` | Brand ID | Up to 8 concise strings describing current voice |
| `reflectTopTopics(brandId)` | Brand ID | Up to 8 evidence-based topic insights |
| `reflectAudiencePreferences(brandId)` | Brand ID | Up to 8 preference insights |
| `reflectFailedStrategies(brandId)` | Brand ID | Up to 8 failed-strategy insights |
| `reflectContentGaps(brandId)` | Brand ID | Up to 8 under-covered topic insights |

All reflect functions call Hindsight Reflect each time; they do not serve a stale in-process answer. They also ensure a persistent Hindsight Mental Model exists for that brand and question. Those models refresh after memory consolidation, with a 60-second floor to coalesce bursts of new memories. Outputs include `mentalModelId` and `source` so callers can link the persistent model and distinguish a Reflect synthesis from the recall fallback. `HindsightError` exposes `code`, `statusCode`, and (for retain failures) `memoryId` for HTTP error mapping. Calls have configurable timeouts and bounded retries (`HINDSIGHT_TIMEOUT_MS`, `HINDSIGHT_RETRIES`).

## Memory interfaces

The five schema interfaces are in `schema/types.ts`: `BrandMemory`, `ContentMemory`, `ExperimentMemory`, `FeedbackMemory`, and `StrategicMemory`. Every record carries a `brandId`. Metric snapshots use `metrics:<postId>:<measuredAt>` document IDs, so later measurements remain as history; pass the source's stable measurement timestamp to make an external retry idempotent. If omitted, the capture time is used. Brand profiles follow the same versioned pattern (`brand:profile:<capturedAt>`): the application database should own the current canonical profile, while Hindsight keeps timestamped snapshots and learns from changes. Replaying the same source timestamp safely replaces that same snapshot.

## Batch behavior

Seed imports use the SDK batch-retain endpoint and stable IDs. Records are grouped by brand because each brand has its own Hindsight bank; metric and brand-profile rows can provide `measuredAt` / `capturedAt` so replays preserve event identity. Failed chunks return per-row failures while successful chunks continue. The caller receives a complete success/failure report and can retry only the failed IDs.
