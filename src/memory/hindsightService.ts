export { HindsightError } from "./internal/errors.js";
export type * from "./schema/types.js";
export {
  retainBrand,
  retainPost,
  retainMetrics,
  retainExperiment,
  retainFeedback,
  retainDecision,
  retainBatch,
} from "./retain/retainers.js";
export { recallForExplorer, recallForTimeline, recallForQuestion } from "./recall/recallers.js";
export {
  reflectBrandVoice,
  reflectTopTopics,
  reflectAudiencePreferences,
  reflectFailedStrategies,
  reflectContentGaps,
} from "./reflect/mentalModels.js";

import {
  retainBrand, retainPost, retainMetrics, retainExperiment, retainFeedback, retainDecision, retainBatch,
} from "./retain/retainers.js";
import { recallForExplorer, recallForTimeline, recallForQuestion } from "./recall/recallers.js";
import {
  reflectBrandVoice, reflectTopTopics, reflectAudiencePreferences, reflectFailedStrategies, reflectContentGaps,
} from "./reflect/mentalModels.js";

/** The only module backend and agent code should import from. */
export const hindsightService = {
  retainBrand,
  retainPost,
  retainMetrics,
  retainExperiment,
  retainFeedback,
  retainDecision,
  retainBatch,
  recallForExplorer,
  recallForTimeline,
  recallForQuestion,
  reflectBrandVoice,
  reflectTopTopics,
  reflectAudiencePreferences,
  reflectFailedStrategies,
  reflectContentGaps,
};
