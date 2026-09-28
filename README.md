# Content Intelligence Agent

An AI marketing and content assistant that makes a brand's experience visible. It recalls content history, audience feedback, measured outcomes, and decisions to ground recommendations and show how new evidence affects future answers.

> **Synthetic data for demo purposes — not real brand data**

## Key feature

Persistent marketing memory is provided by Hindsight. A new audience request or performance observation can be retained and later recalled as evidence for the agent.

## Architecture

```text
React + TypeScript frontend
             ↓ REST
Node.js + Express API
       ↙             ↘
Prisma + PostgreSQL    Agent adapter
application records         ↓
                       Hindsight Cloud
                    persistent AI memory
```

The application database stores structured business records: brands, campaigns, posts and metrics, comments, analytics snapshots, and plans. Hindsight stores AI experiences and synthesized memory. The application database does not duplicate Hindsight memories. In local development only, the current API can use its atomic JSON adapter when `DATABASE_URL` is not set; production mode requires PostgreSQL and Hindsight credentials.

## Features

- Brand profile onboarding and editing
- Content library and JSON/CSV ingestion
- Performance analytics with clear synthetic-data labels
- Persistent Hindsight memory explorer and timeline
- Evidence-backed strategist responses with memory counts
- Audience feedback ingestion and adaptive demo workflow
- Weekly content planning and grounded draft generation

## Repository structure

```text
src/pages/                 React product screens
src/api/                   Frontend REST client
src/routes/                Express route groups
src/controllers/           Request handlers
src/services/               Application DB, agent, and Hindsight adapters
src/memory/                 Member 3 Hindsight SDK service
prisma/schema.prisma        PostgreSQL application schema
prisma/migrations/          Versioned PostgreSQL migration
data/*.json                 Deterministic synthetic marketing dataset
scripts/                    Dataset validation, seed, and demo workflows
docs/                       API, demo, and team integration contracts
```

## Technology stack

- Node.js `24.21.0`, npm `11.19.0`
- React `19`, TypeScript `7`, Vite `8`, Tailwind CSS `3`
- Express `5`
- PostgreSQL with Prisma ORM `6.12.0` and the `pg` driver adapter
- Hindsight TypeScript client `0.10.1`
- React Router, Zustand, Axios, Recharts, and Lucide

## Environment variables

Copy `.env.example` to `.env` for local use. Keep credentials on the server; never use a `VITE_` prefix for secrets.

| Variable | Purpose |
| --- | --- |
| `HINDSIGHT_API_KEY` | Server-only Hindsight credential |
| `HINDSIGHT_BASE_URL` | Hindsight Cloud API origin |
| `HINDSIGHT_BANK_PREFIX` | Prefix for per-brand memory banks |
| `DATABASE_URL` | PostgreSQL connection URL; omit locally to use the JSON development adapter |
| `VITE_API_URL` | Public API origin used by the frontend |
| `HOST`, `PORT` | Express bind address and port |
| `FRONTEND_ORIGIN` / `CORS_ORIGINS` | Allowed browser origin(s) |
| `APP_STATE_PATH` | Optional local JSON adapter path |
| `ENABLE_DEMO_DATA` | Load the small local development sample when using JSON mode |

There is no LLM API key in the current agent adapter. Member 4's production agent may add its own server-side variable when integrated.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
# Add HINDSIGHT_API_KEY to .env. Do not paste it into source code or chat.
npm run dev
```

Vite serves the frontend at `http://localhost:5173`; Express listens at `http://127.0.0.1:8000`. `GET /health` returns the API health status without contacting Hindsight.

## Database setup

The production application database is PostgreSQL. Provision a PostgreSQL database, set `DATABASE_URL`, then apply the committed migration:

```powershell
npm run db:generate
npm run db:validate
npm run db:migrate
```

For local development without PostgreSQL, the atomic JSON adapter persists at ignored `data/app-state.json`. This adapter is for local development and demos; it is not a production database. The Prisma schema has foreign-key relations from brands to content, campaigns, audience comments, analytics snapshots, and weekly plans. Content can optionally reference a campaign.

## Synthetic seed dataset

The checked-in JSON dataset contains one fictional brand, 36 posts, 12 campaigns, 60 audience comments, three strategic decisions, and three monthly analytics snapshots. It spans June–August 2026. Fixed values deliberately show improving technical/educational results and declining promotional results, with variation across records.

```powershell
npm run dataset:validate
npm run seed
npm run seed:feedback
npm run seed:reset
npm run test:seed-idempotency
```

`npm run seed` upserts application records and passes brand, post, dated metrics, feedback, and strategic-decision records to Member 3's real `retainBatch` Hindsight service. Stable Hindsight IDs and timestamps make re-seeding idempotent. `seed:reset` clears and recreates only the selected brand's application rows; Hindsight has no delete-bank method in the current public service, so reset reuses those stable Hindsight IDs. Use a new `DEMO_BRAND_ID` for a genuinely empty Hindsight bank.

Regenerate the exact same dataset with `npm run dataset:generate`. Validate the aggregate technical-versus-promotional trend with `npm run dataset:validate` before demo day.

## Four-act demo

Run `npm run demo`. It uses an isolated run-specific `brandId` by default so the first question starts with an empty Hindsight bank. Set `DEMO_BRAND_ID` to repeat a known run (which may no longer be cold).

1. **Cold agent:** ask “What should we post next week?” and observe the actual zero-memory response.
2. **Teach:** seed brand, campaigns, posts, dated metrics, audience comments, and strategic decisions into the app and Hindsight.
3. **Memory-enabled:** ask the same question and inspect the real recalled evidence and `memoriesUsed` count.
4. **Adapt:** retain “We need more practical examples.” through Member 3's service and ask the same question again. The script reports whether the recommendation changed; it does not fabricate an adaptation claim.

See [docs/demo-script.md](docs/demo-script.md) for recovery guidance and [docs/integration-contract.md](docs/integration-contract.md) for member responsibilities. The current `askAgent` implementation is a clearly logged development fallback that uses actual Hindsight recall; replace it behind `src/services/agentService.ts` when Member 4's reasoning engine is ready.

## API

See [docs/api-contract.md](docs/api-contract.md). Main routes include `GET /health`, `GET/POST /brand`, `GET /content`, `POST /content/ingest`, `GET /analytics`, `POST /agent/ask`, `GET /memory/explorer`, `GET /memory/timeline`, and the planner/feedback routes used by the UI.

## Deployment

Starter configuration is provided for a Render API service (`render.yaml`) and Vercel static frontend (`vercel.json`). Configure `DATABASE_URL`, `HINDSIGHT_API_KEY`, and allowed CORS origins as provider-managed secrets/environment values; configure `VITE_API_URL` in the frontend build environment. Apply migrations during deploy. No cloud deployment has been performed, and provider credentials/URLs must be supplied by the team. The hosted API requires PostgreSQL and Hindsight at startup. The committed schema/migration and build/start commands are ready for deployment.

## Verification

```powershell
npm run typecheck
npm run build
npm run dataset:validate
npm run test:seed-idempotency
npm run api:smoke # API must be running; uses real Hindsight credentials
npm run demo       # real Hindsight connection required
```

Hindsight tests also available: `npm run memory:smoke`, `npm run memory:verify-metrics-history`, and `npm run memory:verify-adaptation`.

## Known limitations

- All checked-in marketing records and metrics are synthetic, not customer data or live platform analytics.
- The JSON application store is a local development fallback. Hosted use requires a configured PostgreSQL `DATABASE_URL` and the Prisma migration.
- Hindsight Cloud network access and valid server-side credentials are required for memory seeding and the real-memory demo.
- Member 4's production LLM reasoning service is not present in this checkout; `askAgent` is an explicitly logged deterministic adapter over actual recalled Hindsight evidence.
- No cloud deployment has been run from this workspace; service provisioning and environment values remain team actions.
