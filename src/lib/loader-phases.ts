export const LOADER_MIN_MS = 7_500;
export const LOADER_BOOT_MS = 2_500;

export const BOOT_LINES = [
  "Initializing ops terminal v0.3.0",
  "Loading sync modules...",
  "Establishing secure connections...",
] as const;

export const STATUS_MESSAGES = [
  "Connecting to Notion API...",
  "Reading Focus notes...",
  "Syncing Projects, Milestones & Sprints...",
  "Pulling Ship Log...",
  "Rendering dashboard...",
] as const;

export const SYNC_STEPS = [
  { label: "Notion — connecting to API", weight: 0.1 },
  { label: "Notion — reading Focus notes", weight: 0.14 },
  { label: "Notion — syncing Projects, Milestones & Sprints", weight: 0.32 },
  { label: "Notion — syncing Horizon", weight: 0.12 },
  { label: "Notion — syncing Ship Log", weight: 0.14 },
  { label: "Grouping projects by domain", weight: 0.1 },
  { label: "Rendering dashboard", weight: 0.08 },
] as const;

export type LoaderPhase = "boot" | "sync";

export function getLoaderPhase(elapsedMs: number): LoaderPhase {
  if (elapsedMs < LOADER_BOOT_MS) return "boot";
  return "sync";
}
