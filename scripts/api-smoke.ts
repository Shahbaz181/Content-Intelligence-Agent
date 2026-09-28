import assert from "node:assert/strict";

const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
const brandId = `api-smoke-${Date.now()}`;
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(90_000), ...init });
  const payload = await response.json().catch(() => undefined) as any;
  return { response, payload };
}
function json(body: unknown): RequestInit { return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }; }
function passed(name: string) { console.log(`PASS ${name}`); }

const health = await request("/health", { headers: { origin: "http://localhost:5173" } });
assert.equal(health.response.status, 200);
assert.deepEqual(health.payload, { status: "ok", service: "content-intelligence-agent-api" });
assert.equal(health.response.headers.get("access-control-allow-origin"), "http://localhost:5173");
passed("GET /health and configured frontend CORS");

const brand = { brandId, name: "API Smoke Example", industry: "Technology", tone: ["practical", "clear"], audience: ["developers"], platforms: ["LinkedIn"], goals: ["Teach workflows"], competitors: [], thingsToAvoid: ["Unsupported claims"] };
const savedBrand = await request("/brand", json(brand));
assert.equal(savedBrand.response.status, 200);
assert.equal(savedBrand.payload.name, brand.name);
passed("POST /brand persists profile and retains it in Hindsight");

const getBrand = await request(`/brand?brandId=${brandId}`);
assert.equal(getBrand.response.status, 200); assert.equal(getBrand.payload.name, brand.name);
passed("GET /brand");

const content = { brandId, title: "Practical workflow carousel", platform: "LinkedIn", format: "Carousel", publishedAt: "2026-09-20T12:00:00.000Z", measuredAt: "2026-09-21T12:00:00.000Z", text: "A practical, step-by-step guide to a repeatable AI workflow.", metrics: { likes: 120, comments: 18, shares: 11, saves: 47, clicks: 24 } };
const ingested = await request("/content/ingest", json(content));
assert.equal(ingested.response.status, 201); assert.equal(ingested.payload.title, content.title); assert.ok(ingested.payload.retainedMemories >= 2);
passed("POST /content/ingest JSON persists and retains content plus dated metrics");

const csv = new FormData();
csv.append("file", new Blob(["title,platform,format,date,saves,comments,clicks\nSmoke CSV post,Instagram,Reel,2026-09-22,20,8,14\n"], { type: "text/csv" }), "api-smoke.csv");
const csvResult = await request(`/content/ingest?brandId=${brandId}`, { method: "POST", body: csv });
assert.equal(csvResult.response.status, 201); assert.equal(csvResult.payload.imported, 1);
passed("POST /content/ingest preserves Member 1 CSV upload");

const contentList = await request(`/content?brandId=${brandId}`);
assert.equal(contentList.response.status, 200); assert.ok(contentList.payload.some((item: { title: string }) => item.title === content.title));
passed("GET /content returns the frontend-compatible library contract");

const asked = await request("/agent/ask", json({ brandId, question: "What format and topic should our next post use?" }));
assert.equal(asked.response.status, 200);
assert.deepEqual(Object.keys(asked.payload).sort(), ["format", "memoriesUsed", "reasoning", "recommendation"]);
assert.ok(asked.payload.memoriesUsed > 0, "memory count must reflect actual Hindsight recall");
passed("POST /agent/ask exact response shape and non-zero live recall count");

const explorer = await request(`/memory/explorer?brandId=${brandId}`);
assert.equal(explorer.response.status, 200);
assert.deepEqual(explorer.payload.map((node: { label: string }) => node.label), ["Brand Voice", "Audience", "Content History", "Experiments", "Preferences", "Gaps", "Strategic Decisions"]);
assert.ok(explorer.payload[2].children.some((child: { detail?: string[] }) => child.detail?.some((text) => text.includes(content.title))), "retained content should appear in actual Hindsight explorer results");
passed("GET /memory/explorer reflects the ingested Hindsight memory");

const timeline = await request(`/memory/timeline?brandId=${brandId}`);
assert.equal(timeline.response.status, 200); assert.ok(Array.isArray(timeline.payload));
assert.deepEqual(timeline.payload, timeline.payload.slice().sort((a: { month: string }, b: { month: string }) => a.month.localeCompare(b.month)));
passed("GET /memory/timeline returns chronological Hindsight events");

const analytics = await request(`/analytics?brandId=${brandId}`);
assert.equal(analytics.response.status, 200); assert.ok(analytics.payload.byPlatform.some((item: { name: string }) => item.name === "LinkedIn"));
passed("GET /analytics combines application metrics and available Hindsight counts");

const invalid = await request("/agent/ask", json({ brandId }));
assert.equal(invalid.response.status, 400); assert.equal(invalid.payload.error.code, "VALIDATION_ERROR");
assert.equal("stack" in invalid.payload.error, false);
passed("Malformed requests return sanitized Zod validation errors");

const notFound = await request("/not-a-real-endpoint");
assert.equal(notFound.response.status, 404); assert.equal(notFound.payload.error.code, "NOT_FOUND");
assert.equal("stack" in notFound.payload.error, false);
passed("Central error responses use the safe error contract");

console.log(`API smoke checks passed for isolated brand ${brandId}.`);
