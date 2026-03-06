export { KfdaClient, mapCategory } from "./client";
export type { KfdaParsedProduct, KfdaFetchResult, KfdaFetchError } from "./client";

export { runSyncJob } from "./sync-job";
export type {
  SyncJobOptions, SyncJobResult, SyncProgress,
  QualityIssue, UnmappedIngredient,
} from "./sync-job";
