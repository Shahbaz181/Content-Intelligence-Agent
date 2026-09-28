# Content Intelligence Agent API contract

Base URL: `http://127.0.0.1:8000`. Successful responses are JSON without a `data` wrapper. `brandId` is optional for compatibility with the current Member 1 client; it defaults to `HINDSIGHT_BRAND_ID` (`default`). Send it in the query for GET routes or in the request JSON body for write/agent routes. If both are sent, they must match.

Every validation failure returns HTTP 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "issues": [...] } }`. Other errors use `{ "error": { "code": "...", "message": "..." } }`. Internal service details and credentials are never returned.

## Agent response (contract-sensitive)

`POST /agent/ask` returns exactly these four top-level fields:

```json
{
  "recommendation": "Build on this relevant theme from your retained history: practical AI workflows.",
  "reasoning": ["Hindsight recalled 2 relevant memories for this question.", "Relevant memory: ..."],
  "format": "Carousel",
  "memoriesUsed": 2
}
```

The count is the number of distinct memory records actually returned by Hindsight across the question recall and a targeted audience-feedback recall. If Member 4's reasoning engine is not present, the explicitly logged development adapter uses only this recalled memory evidence; it does not fabricate an LLM response or memory count.

## Routes

### `GET /health`

No database or Hindsight dependency. Query is Zod validated.

```json
{ "status": "ok", "service": "content-intelligence-agent-api" }
```

### `POST /brand`

Body fields: `brandId?`, `name`, `industry`, `tone`, `audience`, `platforms`, `goals`, `competitors`, and `thingsToAvoid` (or legacy frontend field `avoid`). Lists may be arrays of strings or comma-separated strings. The database adapter persists the canonical profile; the Member 3 service retains a dated Hindsight brand snapshot. Returns the current Member 1 `Brand` shape (comma-separated string fields).

```json
{
  "brandId": "demo-brand", "name": "Example Brand", "industry": "Technology",
  "tone": ["professional", "friendly"], "audience": ["developers", "students"],
  "platforms": ["instagram", "linkedin"], "goals": ["increase engagement"],
  "competitors": ["Competitor A"], "thingsToAvoid": ["clickbait"]
}
```

### `GET /brand?brandId=demo-brand`

Returns the saved brand in the existing frontend shape. Returns 404 `BRAND_NOT_FOUND` if no profile is saved.

### `POST /content/ingest`

Accepts either JSON or CSV multipart field `file`. JSON fields: `brandId?`, `title`, `platform`, `format`, `publishedAt` (ISO date/time), `text?`, `metrics?` (`likes`, `comments`, `shares`, `saves`, `clicks`, `impressions`, each a non-negative number), and `measuredAt?` (ISO date/time). The database stores the content item; Hindsight retains the content and, when supplied, a dated metric snapshot. CSV requires a `title` column and accepts matching field names plus date/metrics aliases.

JSON success (201) returns an item compatible with the content library, with `contentId` and `retainedMemories`. CSV success (201) returns `{ "imported": number, "retainedMemories": number, "content": ContentItem[] }`.

```json
{
  "brandId": "demo-brand", "title": "Example post", "platform": "instagram", "format": "reel",
  "publishedAt": "2026-09-20T12:00:00.000Z", "text": "Example content",
  "metrics": { "likes": 100, "comments": 20, "shares": 10, "saves": 30, "clicks": 15 }
}
```

### `GET /content?brandId=demo-brand`

Returns `ContentItem[]` in the fields the Member 1 library renders (`title`, `platform`, `format`, `date`, `performance`, optional metric values, and `synthetic`). Synthetic development rows are marked `synthetic: true`.

### `POST /agent/ask`

Body: `{ "brandId?": "demo-brand", "question": "What type of content should we create next?" }`. Returns the exact four-field shape documented above. Empty/missing questions return 400.

### `GET /memory/explorer?brandId=demo-brand`

Returns `MemoryNode[]` for Brand Voice, Audience, Content History, Experiments, Preferences, Gaps, and Strategic Decisions. Nodes and counts come from Member 3 Hindsight reads; empty categories have zero children.

### `GET /memory/timeline?brandId=demo-brand`

Returns actual Hindsight learning events as chronological `{ "month": "YYYY-MM", "text": "..." }` entries. No events are fabricated.

### `GET /analytics?brandId=demo-brand`

Returns the Member 1 `Analytics` shape with performance over time, by format and platform, top/weak content, and Hindsight memory counts when available. `dataSource` is `live`, `synthetic`, or `mixed`; `synthetic` and `mixed` values are surfaced as such in the UI. Application analytics come from `dbService`; persistent memory remains in Hindsight.

## Existing frontend-support routes

`POST /feedback`, `GET/POST /content/plan`, and `POST /content/generate` remain available for Member 1. Feedback and content drafts use the existing Hindsight service. Draft generation returns 409 when there is no recalled evidence for the selected slot.

## Persistence and configuration

`src/services/dbService.ts` is a replaceable Member 5 adapter. Its current development implementation is an atomic local JSON file, not a production database. `.env.example` documents server-only settings. `FRONTEND_ORIGIN` or comma-separated `CORS_ORIGINS` controls CORS; wildcard origins are not enabled. Hindsight timeout/retry settings are reused from Member 3 (`HINDSIGHT_TIMEOUT_MS`, default 15 seconds; retries configured by `HINDSIGHT_RETRIES`).
