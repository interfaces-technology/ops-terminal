export const NOTION_DATABASES = {
  horizon: "28415ddd-98ba-457c-ae8e-e89bdb082e16",
  milestones: "bdcdf3e3-e319-83a2-ad73-07bfb746a827",
  projects: "9ccdf3e3-e319-8394-bbb5-87d84f8e2fb5",
  shipLog: "29f3e759-1238-4e0b-afac-a32c26ed0d10",
  sprints: "395df3e3-e319-80c6-b0e6-000b875c4f64",
} as const;

/** Company → Focus daily page (solo mode — blocks, not a database). */
export const NOTION_FOCUS_PAGE_ID = "395df3e3-e319-81db-8965-ccf0a2b0d7f6";

/** Bump when snapshot shape or Notion sources change (invalidates Redis/file cache). */
export const CACHE_KEY = "ops:snapshot:v9";
export const CACHE_PATH = ".data/cache.json";

export const TERMINAL_USER = {
  name: "Hamza",
  role: "Founder",
  company: "The Interfaces Company",
} as const;

export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
