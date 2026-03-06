// ============================================================
// COSFIT Analysis Engine - Public API
// ============================================================

export { IngredientNormalizer, sanitize, sanitizeKo, similarity, levenshteinDistance } from "./normalizer";
export { generateUserStandard } from "./standard-generator";
export { calculateFitScore } from "./fit-score";
export {
  formatFailureLogsForDb,
  summarizeFailureLogs,
  aggregateProductFitStats,
  generatePartnerSnapshot,
} from "./stats";
export type * from "./types";
