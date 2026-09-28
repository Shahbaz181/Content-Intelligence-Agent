export interface BrandMemory {
  brandId: string;
  capturedAt?: string;
  tone: string[];
  avoid: string[];
  audience: string[];
  platforms: string[];
  goals: string[];
  competitors: string[];
  summary?: string;
}

export interface ContentMetrics {
  saves?: number;
  comments?: number;
  clicks?: number;
  impressions?: number;
  likes?: number;
  shares?: number;
  [metric: string]: number | undefined;
}

export interface ContentMemory {
  brandId: string;
  postId: string;
  title: string;
  platform: string;
  format: string;
  topic: string;
  publishedDate: string;
  metrics?: ContentMetrics;
  bodySummary?: string;
}

export interface ExperimentMemory {
  brandId: string;
  experimentId: string;
  description: string;
  result: string;
  observation: string;
  date?: string;
}

export interface FeedbackMemory {
  brandId: string;
  feedbackId: string;
  source: string;
  text: string;
  themes: string[];
  date: string;
}

export interface StrategicMemory {
  brandId: string;
  decisionId: string;
  decision: string;
  outcome: string;
  futureImplication: string;
  date: string;
}

export type MemoryRecord =
  | BrandMemory
  | ContentMemory
  | ExperimentMemory
  | FeedbackMemory
  | StrategicMemory;

export type RetainKind = "brand" | "content" | "metrics" | "experiment" | "feedback" | "decision";

export interface RetainResult {
  success: true;
  memoryId: string;
  brandId: string;
  kind: RetainKind;
}

export interface RetainFailure {
  success: false;
  memoryId: string;
  brandId: string;
  kind: RetainKind;
  error: string;
  code: string;
  statusCode: number;
}

export interface BatchRetainResult {
  succeeded: RetainResult[];
  failed: RetainFailure[];
}

export interface MemoryItem {
  memoryId?: string;
  text: string;
  type?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ExplorerMemoryTree {
  brandId: string;
  memoryCount: number;
  brandVoice: string[];
  audience: string[];
  contentHistory: MemoryItem[];
  experiments: MemoryItem[];
  preferences: string[];
  gaps: string[];
  decisions: MemoryItem[];
}

export interface TimelineEvent {
  month: string;
  date: string;
  eventText: string;
  type?: string;
}

export interface QuestionRecall {
  brandId: string;
  question: string;
  memoryCount: number;
  memories: MemoryItem[];
}

export interface MentalModelResult {
  brandId: string;
  mentalModelId: string;
  items: string[];
  source: "reflect" | "recall-fallback";
}

export interface PromptReflection {
  brandId: string;
  answer: string;
  source: "reflect";
}
