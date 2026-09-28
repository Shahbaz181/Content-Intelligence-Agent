# Synthetic marketing dataset

**Synthetic data for demo purposes — not real brand data**

The deterministic Northstar Labs dataset is a fictional developer-tools brand with 36 posts, 12 campaigns, 60 audience comments, three strategic decisions, and three monthly analytics snapshots from June through August 2026. Metrics are fixed in the JSON files; regenerating them produces the same records and values.

Posts are evenly split between technical/educational and promotional content. Technical performance improves across the three months while promotional results trend down, with natural variation among posts. Campaign result summaries are calculated from their associated post metrics. Recurring feedback themes include practical examples, implementation details, architecture, tutorials, integration, and cost.

Files: `brand.json`, `posts.json`, `campaigns.json`, `audience-comments.json`, `strategic-decisions.json`, and `analytics-snapshots.json`. Regenerate the checked-in files with `npm run dataset:generate`; validate constraints and view aggregate metrics with `npm run dataset:validate`.
