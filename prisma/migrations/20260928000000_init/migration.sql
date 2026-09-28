CREATE TABLE "brands" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "tone" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "thingsToAvoid" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "audience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "competitors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "synthetic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "result" TEXT NOT NULL,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_items" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "campaignId" TEXT,
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "contentType" TEXT,
  "publishedDate" DATE NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "metricsMeasuredAt" TIMESTAMP(3),
  "performance" TEXT NOT NULL DEFAULT 'Not measured',
  "synthetic" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audience_comments" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "themes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "date" DATE NOT NULL,
  "source" TEXT NOT NULL,
  CONSTRAINT "audience_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_snapshots" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "topThemes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "weakThemes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "gaps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weekly_plans" (
  "brandId" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("brandId")
);

CREATE INDEX "campaigns_brandId_startDate_idx" ON "campaigns"("brandId", "startDate");
CREATE INDEX "content_items_brandId_publishedDate_idx" ON "content_items"("brandId", "publishedDate");
CREATE INDEX "content_items_campaignId_idx" ON "content_items"("campaignId");
CREATE INDEX "audience_comments_brandId_date_idx" ON "audience_comments"("brandId", "date");
CREATE UNIQUE INDEX "analytics_snapshots_brandId_period_key" ON "analytics_snapshots"("brandId", "period");

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audience_comments" ADD CONSTRAINT "audience_comments_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
