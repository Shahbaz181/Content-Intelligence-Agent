import brand from "../data/brand.json" with { type: "json" };
import posts from "../data/posts.json" with { type: "json" };
import campaigns from "../data/campaigns.json" with { type: "json" };
import comments from "../data/audience-comments.json" with { type: "json" };
import decisions from "../data/strategic-decisions.json" with { type: "json" };
import snapshots from "../data/analytics-snapshots.json" with { type: "json" };

type Metrics = { saves: number; comments: number; clicks: number };
type Post = { id: string; brandId: string; title: string; platform: string; format: string; topic: string; publishedDate: string; campaignId: string; contentType: string; metrics: Metrics };
type Campaign = { id: string; brandId: string; startDate: string; endDate: string };
const knownPlatforms = new Set(["LinkedIn", "X", "Blog"]);
const knownFormats = new Set(["carousel", "text", "case study", "tutorial", "infographic", "short post", "technical breakdown"]);
const validDate = (value: string) => !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}$/.test(value);
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const actionCount = (post: Post) => post.metrics.saves + post.metrics.comments + post.metrics.clicks;

export function validateDataset(): string[] {
  const errors: string[] = [];
  if (!brand.brandId || !brand.name) errors.push("brand.json requires brandId and name");
  if (posts.length < 20 || posts.length > 50) errors.push(`Expected 20–50 posts; found ${posts.length}`);
  if (campaigns.length < 10 || campaigns.length > 20) errors.push(`Expected 10–20 campaigns; found ${campaigns.length}`);
  if (comments.length < 50) errors.push(`Expected at least 50 comments; found ${comments.length}`);
  const checkIds = (name: string, rows: Array<{ id: string }>) => {
    const ids = rows.map((row) => row.id);
    if (ids.some((id) => !id)) errors.push(`${name} contains a missing id`);
    if (new Set(ids).size !== ids.length) errors.push(`${name} contains duplicate ids`);
  };
  checkIds("posts", posts); checkIds("campaigns", campaigns); checkIds("comments", comments); checkIds("strategic decisions", decisions); checkIds("analytics snapshots", snapshots);
  const postRows = posts as Post[]; const campaignRows = campaigns as Campaign[];
  const campaignIds = new Set(campaignRows.map((campaign) => campaign.id));
  for (const post of postRows) {
    if (post.brandId !== brand.brandId) errors.push(`Post ${post.id} has a missing or mismatched brandId`);
    if (!knownPlatforms.has(post.platform)) errors.push(`Post ${post.id} has invalid platform ${post.platform}`);
    if (!knownFormats.has(post.format)) errors.push(`Post ${post.id} has invalid format ${post.format}`);
    if (!post.title || !post.topic) errors.push(`Post ${post.id} is missing title/topic`);
    if (!post.metrics || [post.metrics.saves, post.metrics.comments, post.metrics.clicks].some((value) => !Number.isFinite(value) || value < 0)) errors.push(`Post ${post.id} has missing or invalid metrics`);
    if (!validDate(post.publishedDate)) errors.push(`Post ${post.id} has invalid publishedDate`);
    if (!campaignIds.has(post.campaignId)) errors.push(`Post ${post.id} references missing campaign ${post.campaignId}`);
  }
  for (const campaign of campaignRows) {
    if (campaign.brandId !== brand.brandId) errors.push(`Campaign ${campaign.id} has a missing or mismatched brandId`);
    if (!validDate(campaign.startDate) || !validDate(campaign.endDate) || campaign.startDate > campaign.endDate) errors.push(`Campaign ${campaign.id} has an invalid date range`);
    if (!postRows.some((post) => post.campaignId === campaign.id)) errors.push(`Campaign ${campaign.id} has no associated posts`);
  }
  for (const comment of comments) {
    if (!comment.id || comment.brandId !== brand.brandId || !comment.text || !Array.isArray(comment.themes) || !validDate(comment.date) || !comment.source) errors.push(`Comment ${comment.id || "(missing id)"} has an invalid required field`);
  }
  for (const decision of decisions) if (decision.brandId !== brand.brandId || !validDate(decision.date)) errors.push(`Strategic decision ${decision.id} has an invalid brandId/date`);
  for (const snapshot of snapshots) if (snapshot.brandId !== brand.brandId || !/^\d{4}-\d{2}$/.test(snapshot.period)) errors.push(`Analytics snapshot ${snapshot.id} has an invalid brandId/period`);

  const monthly = ["2026-06", "2026-07", "2026-08"].map((month) => {
    const rows = postRows.filter((post) => post.publishedDate.startsWith(month));
    const technical = rows.filter((post) => post.contentType === "technical_educational");
    const promotional = rows.filter((post) => post.contentType === "promotional");
    return { month, technical: average(technical.map(actionCount)), promotional: average(promotional.map(actionCount)), technicalSaves: average(technical.map((post) => post.metrics.saves)), promotionalSaves: average(promotional.map((post) => post.metrics.saves)) };
  });
  if (!(monthly[0].promotional > monthly[0].technical && monthly[1].technical > monthly[1].promotional && monthly[2].technical > monthly[2].promotional)) errors.push("Monthly trend does not show promotional strength early and technical strength later");
  if (!(monthly[0].technical < monthly[1].technical && monthly[1].technical < monthly[2].technical)) errors.push("Technical educational performance should improve each month");
  if (!(monthly[0].promotional > monthly[1].promotional && monthly[1].promotional > monthly[2].promotional)) errors.push("Promotional performance should decline each month");
  if (postRows.length !== 36 || campaignRows.length !== 12 || comments.length !== 60) errors.push("Demo dataset counts should be 36 posts, 12 campaigns, and 60 comments");
  return errors;
}

export function printDatasetReport(): void {
  const rows = posts as Post[];
  for (const category of ["technical_educational", "promotional"]) {
    const group = rows.filter((post) => post.contentType === category);
    console.log(`${category === "technical_educational" ? "Technical/educational" : "Promotional"} average — saves ${average(group.map((post) => post.metrics.saves)).toFixed(1)}, comments ${average(group.map((post) => post.metrics.comments)).toFixed(1)}, clicks ${average(group.map((post) => post.metrics.clicks)).toFixed(1)}`);
  }
  for (const month of ["2026-06", "2026-07", "2026-08"]) {
    const group = rows.filter((post) => post.publishedDate.startsWith(month));
    console.log(`${month} — technical ${average(group.filter((post) => post.contentType === "technical_educational").map(actionCount)).toFixed(1)} tracked actions/post; promotional ${average(group.filter((post) => post.contentType === "promotional").map(actionCount)).toFixed(1)} tracked actions/post`);
  }
}

const errors = validateDataset();
if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/validateDataset.ts")) {
  if (errors.length) { console.error("Dataset validation failed:\n- " + errors.join("\n- ")); process.exitCode = 1; }
  else { console.log("Dataset validation passed: 1 brand, 36 posts, 12 campaigns, 60 comments, 3 decisions, 3 snapshots."); printDatasetReport(); }
}
