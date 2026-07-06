export const LOADER_MIN_MS = 7_500;
export const LOADER_BOOT_MS = 2_500;

export const BOOT_LINES = [
  "Initializing ops terminal v0.2.0",
  "Loading sync modules...",
  "Establishing secure connections...",
] as const;

export const STATUS_MESSAGES = [
  "Connecting to Linear API...",
  "Fetching LAB · PLAY · WOR issues...",
  "Syncing Notion Focus & Horizon...",
  "Aggregating unified ops snapshot...",
  "Rendering dashboard...",
] as const;

export const SYNC_STEPS = [
  { label: "Linear — connecting to API", weight: 0.08 },
  { label: "Linear — fetching issues (LAB, PLAY, WOR)", weight: 0.22 },
  { label: "Linear — fetching projects", weight: 0.12 },
  { label: "Notion — reading Focus page", weight: 0.12 },
  { label: "Notion — syncing Horizon & Projects", weight: 0.16 },
  { label: "Notion — syncing Ship Log", weight: 0.1 },
  { label: "Merging Notion + Linear snapshot", weight: 0.12 },
  { label: "Rendering dashboard", weight: 0.08 },
] as const;

export type LoaderPhase = "boot" | "sync";

export function getLoaderPhase(elapsedMs: number): LoaderPhase {
  if (elapsedMs < LOADER_BOOT_MS) return "boot";
  return "sync";
}
