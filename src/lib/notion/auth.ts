export const NOTION_API = "https://api.notion.com/v1";
export const NOTION_VERSION = "2025-09-03";

export function getNotionApiKey(): string {
  const key = process.env.NOTION_API_KEY ?? process.env.NOTION_API_TOKEN;
  if (!key) {
    throw new Error("NOTION_API_KEY is not set");
  }
  return key;
}

export function notionHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getNotionApiKey()}`,
    "Notion-Version": NOTION_VERSION,
  };
}
