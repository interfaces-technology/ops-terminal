export const LOADER_MIN_MS = 7_500;
export const LOADER_BOOT_MS = 2_500;

export const BOOT_LINES = [
  "Initializing ops terminal v0.1.0",
  "Loading sync modules...",
  "Establishing secure connections...",
] as const;

export const STATUS_MESSAGES = [
  "Connecting to Linear API...",
  "Fetching open issues...",
  "Syncing Notion workspace...",
  "Aggregating ops state...",
  "Rendering dashboard...",
] as const;

export const SYNC_STEPS = [
  { label: "Linear — connecting to API", weight: 0.08 },
  { label: "Linear — fetching issues (LAB, PLAY)", weight: 0.22 },
  { label: "Linear — fetching cycles & projects", weight: 0.15 },
  { label: "Notion — connecting to workspace", weight: 0.08 },
  { label: "Notion — syncing work queue", weight: 0.14 },
  { label: "Notion — syncing now & resume", weight: 0.14 },
  { label: "Notion — syncing projects & sprints", weight: 0.12 },
  { label: "Aggregating ops snapshot", weight: 0.07 },
] as const;

export type LoaderPhase = "boot" | "sync";

export function getLoaderPhase(elapsedMs: number): LoaderPhase {
  if (elapsedMs < LOADER_BOOT_MS) return "boot";
  return "sync";
}
