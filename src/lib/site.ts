export const SITE_NAME = "Ops Terminal";
export const SITE_SHORT_NAME = "Ops";
export const SITE_DESCRIPTION =
  "ASCII ops dashboard for The Interfaces Company. One snapshot of Notion Focus, Horizon, Projects, and Ship Log.";
export const SITE_TAGLINE =
  "Notion · unified snapshot · The Interfaces Company";
export const SITE_CREATOR = "The Interfaces Company";
export const SITE_CREATOR_URL = "https://github.com/interfaces-technology";
export const SITE_THEME_COLOR = "#000000";
export const SITE_BRAND_GREEN = "#4ade80";
export const SITE_BRAND_GREEN_LIGHT = "#86efac";
export const SITE_KEYWORDS = [
  "ops terminal",
  "Notion",
  "Focus",
  "Horizon",
  "dashboard",
  "ASCII",
  "Interfaces Company",
] as const;

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
