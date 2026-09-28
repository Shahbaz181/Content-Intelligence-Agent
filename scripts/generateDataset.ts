import { mkdir, writeFile } from "node:fs/promises";

const brandId = "northstar-labs-demo";
const months = ["2026-06", "2026-07", "2026-08"];
const campaignNames = [
  "AI Agent Foundations", "Developer Workflow Notes", "Product Education Sprint", "Founder Lessons",
  "Implementation Month", "API Architecture Series", "Automation in Practice", "Community Learning Lab",
  "Technical Deep Dives", "Product Update Cycle", "Practical AI Playbook", "Build in Public Review",
];
const ideas = [
  ["AI agent evaluation loops", "A small-team automation launch", "Developer time saved by workflow design", "Product workflow announcement", "Tracing an agent request", "A founder lesson from an early launch", "API tool calling basics", "New workflow feature overview", "A practical prompt test", "Product capability roundup", "Debugging a task handoff", "A limited product offer"],
  ["A step-by-step retrieval tutorial", "Automation onboarding campaign", "Designing reliable agent memory", "Product education: memory controls", "API integration guide", "A customer-education offer", "Tool selection architecture", "A product update for builders", "Tracing an agent failure", "Startup launch promotion", "An evaluation checklist", "Feature announcement and demo"],
  ["A complete agent implementation guide", "Product launch: workflow templates", "An API integration case study", "A practical automation campaign", "How to measure retrieval quality", "Product announcement: audit view", "A memory architecture breakdown", "A product education carousel", "A real-world task orchestration tutorial", "A seasonal product promotion", "Cost trade-offs in agent systems", "A founder note on useful content"],
];
const platforms = ["LinkedIn", "X", "Blog"] as const;
const formats = ["carousel", "text", "case study", "tutorial", "infographic", "short post", "technical breakdown"] as const;
const technicalSaves = [[19, 24, 17, 28, 21, 25, 16, 30], [42, 56, 37, 62, 48, 53, 32, 67], [58, 76, 49, 89, 65, 71, 43, 94]];
const technicalComments = [[7, 9, 5, 11, 8, 6, 4, 12], [13, 18, 10, 21, 15, 17, 8, 23], [19, 25, 14, 31, 22, 24, 11, 34]];
const technicalClicks = [[31, 38, 26, 44, 34, 29, 22, 49], [37, 45, 32, 51, 40, 43, 27, 57], [42, 54, 36, 68, 47, 50, 31, 73]];
const promoSaves = [[21, 18, 26, 15], [16, 14, 20, 12], [9, 12, 7, 15]];
const promoComments = [[8, 6, 10, 5], [5, 4, 7, 3], [3, 5, 2, 6]];
const promoClicks = [[91, 76, 108, 69], [63, 55, 82, 48], [34, 43, 28, 51]];
const posts: Record<string, unknown>[] = [];
const campaigns: Record<string, unknown>[] = [];
let techCursor = 0;
let promoCursor = 0;
for (let monthIndex = 0; monthIndex < 3; monthIndex++) {
  for (let campaignIndex = 0; campaignIndex < 4; campaignIndex++) {
    const absoluteCampaign = monthIndex * 4 + campaignIndex;
    const campaignId = `campaign-${String(absoluteCampaign + 1).padStart(2, "0")}`;
    const campaignPosts = [] as Record<string, unknown>[];
    const startDay = 2 + campaignIndex * 7;
    for (let postIndex = 0; postIndex < 3; postIndex++) {
      const globalIndex = absoluteCampaign * 3 + postIndex;
      const isTechnical = postIndex !== 2;
      const measureIndex = isTechnical ? techCursor++ % 8 : promoCursor++ % 4;
      const metricArrays = isTechnical
        ? [technicalSaves[monthIndex], technicalComments[monthIndex], technicalClicks[monthIndex]]
        : [promoSaves[monthIndex], promoComments[monthIndex], promoClicks[monthIndex]];
      const date = `${months[monthIndex]}-${String(startDay + postIndex).padStart(2, "0")}`;
      const title = ideas[monthIndex][campaignIndex * 3 + postIndex];
      const topic = title.split(/[:—]/)[0].trim();
      const post = {
        id: `post-${String(globalIndex + 1).padStart(2, "0")}`, brandId, title,
        platform: platforms[(globalIndex + postIndex) % platforms.length],
        format: formats[(globalIndex + monthIndex) % formats.length], topic,
        publishedDate: date, campaignId,
        contentType: isTechnical ? "technical_educational" : "promotional",
        summary: isTechnical
          ? `Synthetic practical explanation of ${topic.toLowerCase()}, including a concrete workflow, implementation trade-offs, and a useful takeaway for developers.`
          : `Synthetic product communication about ${topic.toLowerCase()}, with a clear offer and restrained claims.`,
        goal: isTechnical ? "educate and earn qualified saves" : "introduce the product and attract relevant clicks",
        metrics: { saves: metricArrays[0][measureIndex], comments: metricArrays[1][measureIndex], clicks: metricArrays[2][measureIndex] },
      };
      posts.push(post); campaignPosts.push(post);
    }
    const totals = campaignPosts.reduce<{ saves: number; comments: number; clicks: number }>((sum, post) => {
      const metrics = post.metrics as { saves: number; comments: number; clicks: number };
      return { saves: sum.saves + metrics.saves, comments: sum.comments + metrics.comments, clicks: sum.clicks + metrics.clicks };
    }, { saves: 0, comments: 0, clicks: 0 });
    campaigns.push({
      id: campaignId, brandId, name: campaignNames[absoluteCampaign],
      description: `Synthetic ${months[monthIndex]} campaign exploring ${campaignNames[absoluteCampaign].toLowerCase()} across educational and product content.`,
      startDate: campaignPosts[0].publishedDate, endDate: campaignPosts[campaignPosts.length - 1].publishedDate,
      result: `3 posts recorded ${totals.saves} saves, ${totals.comments} comments, and ${totals.clicks} clicks.`,
    });
  }
}

const commentTemplates = [
  ["Can you show how this works in a real project?", ["practical_examples", "implementation_details"]],
  ["Would you share the architecture behind this flow?", ["architecture_explanations"]],
  ["Is there a small implementation example we can try?", ["practical_examples", "implementation_details"]],
  ["How should we think about the cost at low volume?", ["cost_questions"]],
  ["Could you explain how this connects to an existing API?", ["integration_questions"]],
  ["A short tutorial with the setup steps would help.", ["tutorial_requests", "implementation_details"]],
  ["We need more practical examples for engineering teams.", ["practical_examples"]],
  ["Can you break the implementation into a few steps?", ["implementation_details", "tutorial_requests"]],
  ["What changes when this runs in a production system?", ["architecture_explanations", "practical_examples"]],
  ["Does this integrate with tools we already use?", ["integration_questions"]],
  ["Could you compare the trade-offs with a simpler approach?", ["architecture_explanations"]],
  ["A worked example would make the idea easier to apply.", ["practical_examples", "tutorial_requests"]],
  ["How much setup is needed before the first useful result?", ["integration_questions", "implementation_details"]],
  ["Please include a realistic cost breakdown next time.", ["cost_questions", "practical_examples"]],
  ["The concept is useful; a runnable tutorial would be even better.", ["tutorial_requests", "implementation_details"]],
];
const sources = ["LinkedIn", "X", "Blog", "Community", "Website"];
const comments = Array.from({ length: 60 }, (_, index) => {
  const [text, themes] = commentTemplates[(index * 7 + Math.floor(index / 5)) % commentTemplates.length];
  const monthIndex = Math.floor(index / 20);
  const day = 3 + (index * 3) % 25;
  return {
    id: `comment-${String(index + 1).padStart(2, "0")}`, brandId,
    text: index % 9 === 0 ? `${text} A concrete example would help our team decide what to try.` : text,
    themes, date: `${months[monthIndex]}-${String(day).padStart(2, "0")}`,
    source: sources[(index * 3 + monthIndex) % sources.length],
  };
});

const dataset = {
  brand: {
    brandId, name: "Northstar Labs", industry: "Synthetic developer tools and AI education",
    tone: ["technical", "clear", "practical", "confident", "conversational"],
    thingsToAvoid: ["clickbait", "excessive hype", "vague claims", "unnecessary jargon", "unsupported metrics"],
    audience: ["software developers", "technical founders", "engineering teams", "AI practitioners"],
    platforms: ["LinkedIn", "X", "Blog"],
    goals: ["teach useful implementation patterns", "build trust", "increase qualified saves", "earn thoughtful engagement"],
    competitors: ["Synthetic workflow platforms", "Synthetic developer education tools"],
    updatedAt: "2026-06-01T09:00:00.000Z", synthetic: true,
  },
  posts, campaigns, comments,
  strategicDecisions: [
    { id: "decision-01", brandId, decision: "Shift the editorial mix toward implementation-focused technical education.", outcome: "Across the synthetic three-month sample, technical posts gained saves and comments while promotional engagement cooled.", futureImplication: "Keep testing practical walkthroughs and compare their performance by platform.", date: "2026-08-26" },
    { id: "decision-02", brandId, decision: "Pair product announcements with a clear technical use case.", outcome: "Promotional posts attracted some clicks but fewer sustained saves than educational posts.", futureImplication: "Explain the problem solved and show a concrete workflow alongside product news.", date: "2026-08-27" },
    { id: "decision-03", brandId, decision: "Use recurring audience requests to shape tutorial topics.", outcome: "Comments repeatedly asked for implementation details, architecture, integrations, and practical examples.", futureImplication: "Prioritize a tutorial series with runnable examples and explicit trade-offs.", date: "2026-08-28" },
  ],
  analyticsSnapshots: months.map((period, index) => ({
    id: `analytics-${period}`, brandId, period,
    topThemes: index === 0 ? ["product launch", "AI agents"] : ["implementation guides", "AI agents", "architecture"],
    weakThemes: index === 2 ? ["broad product promotion", "feature-only announcements"] : ["feature-only announcements"],
    gaps: ["hands-on implementation examples", "API integration walkthroughs", "architecture diagrams with trade-offs"],
  })),
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
for (const [file, value] of Object.entries({
  "brand.json": dataset.brand,
  "posts.json": dataset.posts,
  "campaigns.json": dataset.campaigns,
  "audience-comments.json": dataset.comments,
  "strategic-decisions.json": dataset.strategicDecisions,
  "analytics-snapshots.json": dataset.analyticsSnapshots,
})) {
  await writeFile(new URL(`../data/${file}`, import.meta.url), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
console.log(`[Dataset] Wrote 1 synthetic brand, ${posts.length} posts, ${campaigns.length} campaigns, ${comments.length} comments, and ${dataset.analyticsSnapshots.length} analytics snapshots.`);
