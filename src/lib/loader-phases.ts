export const LOADER_MIN_MS = 7_500;
export const LOADER_BOOT_MS = 2_500;

export const BOOT_LINES = [
  "Initializing ops terminal v0.4.0",
  "Loading sync modules...",
  "Establishing secure connections...",
] as const;

export const STATUS_MESSAGES = [
  "Connecting to Notion API...",
  "Syncing Horizon & Milestones...",
  "Pulling Tasks across all spaces...",
  "Syncing Projects & Ship Log...",
  "Rendering company snapshot...",
] as const;

export const SYNC_STEPS = [
  { label: "Notion — connecting to API", weight: 0.1 },
  { label: "Notion — syncing Horizon & Milestones", weight: 0.16 },
  { label: "Notion — syncing Tasks (5 spaces)", weight: 0.28 },
  { label: "Notion — syncing Projects", weight: 0.16 },
  { label: "Notion — syncing Ship Log", weight: 0.12 },
  { label: "Grouping by domain", weight: 0.1 },
  { label: "Rendering dashboard", weight: 0.08 },
] as const;

export type LoaderPhase = "boot" | "sync";

export function getLoaderPhase(elapsedMs: number): LoaderPhase {
  if (elapsedMs < LOADER_BOOT_MS) return "boot";
  return "sync";
}
