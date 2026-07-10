export const NOTION_DATABASES = {
  horizon: "28415ddd-98ba-457c-ae8e-e89bdb082e16",
  milestones: "bdcdf3e3-e319-83a2-ad73-07bfb746a827",
  projects: "9ccdf3e3-e319-8394-bbb5-87d84f8e2fb5",
  shipLog: "29f3e759-1238-4e0b-afac-a32c26ed0d10",
} as const;

/** Local Tasks DB per teamspace — shared schema (data source / collection IDs). */
export const NOTION_TASK_DATABASES = {
  company: "457df3e3-e319-83e5-aba1-072729c80d16",
  studio: "45c4b046-9706-479f-b1d5-aca9d0f9cb2b",
  lab: "395df3e3-e319-8009-8795-000b18707036",
  play: "df1df3e3-e319-83ea-960f-8761a776db8b",
  workbench: "162df3e3-e319-83e3-a2e7-074f84c57827",
} as const;

/** Bump when snapshot shape or Notion sources change (invalidates Redis/file cache). */
export const CACHE_KEY = "ops:snapshot:v10";
export const CACHE_PATH = ".data/cache.json";

export const TERMINAL_USER = {
  name: "Hamza",
  role: "Founder",
  company: "The Interfaces Company",
} as const;

export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const TODAY_TASK_LIMIT = 12;
export const DOMAIN_TASK_SAMPLE = 3;
