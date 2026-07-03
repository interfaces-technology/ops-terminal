import { NOTION_DATABASES } from "@/lib/config";
import {
  getNumber,
  getRichText,
  getSelect,
  getStatus,
  getTitle,
  getUrl,
} from "@/lib/notion/parse";
import type {
  NotionNowSlot,
  NotionProject,
  NotionQueueItem,
  NotionResumeEntry,
} from "@/types/ops";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface NotionPage {
  id: string;
  properties: Record<string, Record<string, unknown>>;
}

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

const DATABASE_LABELS = Object.fromEntries(
  Object.entries(NOTION_DATABASES).map(([name, id]) => [id, name]),
) as Record<string, keyof typeof NOTION_DATABASES>;

async function notionQuery(databaseId: string): Promise<NotionPage[]> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not set");
  }

  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const body = await res.text();
      const label = DATABASE_LABELS[databaseId] ?? databaseId;
      if (res.status === 404) {
        throw new Error(
          `Notion database "${label}" not found or not shared with your integration — open it in Notion → ••• → Connections → add "ops-terminal"`,
        );
      }
      throw new Error(`Notion API error (${label}): ${res.status} ${body}`);
    }

    const json = (await res.json()) as QueryResponse;
    pages.push(...json.results);
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

function parseSlotFromTitle(title: string | null): 1 | 2 | 3 | null {
  if (!title) return null;
  const match = title.match(/(?:slot\s*)?([123])/i);
  if (match) {
    const n = Number(match[1]);
    if (n === 1 || n === 2 || n === 3) return n;
  }
  return null;
}

export async function fetchNotionData(): Promise<{
  now: NotionNowSlot[];
  workQueue: NotionQueueItem[];
  resume: NotionResumeEntry[];
  projects: NotionProject[];
}> {
  const [nowPages, queuePages, resumePages, projectPages] = await Promise.all([
    notionQuery(NOTION_DATABASES.now),
    notionQuery(NOTION_DATABASES.workQueue),
    notionQuery(NOTION_DATABASES.resume),
    notionQuery(NOTION_DATABASES.projects),
  ]);

  const now: NotionNowSlot[] = nowPages
    .map((page) => {
      const props = page.properties;
      const title =
        getTitle(props, "Name", "Task", "Item", "Title") ??
        getRichText(props, "Task", "Item");
      const slot =
        getNumber(props, "Slot") ??
        parseSlotFromTitle(title) ??
        parseSlotFromTitle(getSelect(props, "Slot"));

      if (slot !== 1 && slot !== 2 && slot !== 3) return null;

      return {
        slot: slot as 1 | 2 | 3,
        status: getStatus(props, "Status") ?? "Empty",
        task: title,
        product: getSelect(props, "Product"),
        source: getSelect(props, "Source"),
        linearUrl: getUrl(props, "Linear", "Linear URL"),
      };
    })
    .filter((s): s is NotionNowSlot => s !== null)
    .sort((a, b) => a.slot - b.slot);

  const workQueue: NotionQueueItem[] = queuePages
    .map((page) => {
      const props = page.properties;
      return {
        title: getTitle(props, "Item", "Name", "Task") ?? "(untitled)",
        product: getSelect(props, "Product"),
        source: getSelect(props, "Source"),
        status: getStatus(props, "Queue status", "Status"),
        priority: getNumber(props, "Priority"),
        linearUrl: getUrl(props, "Linear", "Linear URL"),
      };
    })
    .filter((item) => item.status !== "Done" && item.status !== "Skipped");

  const resume: NotionResumeEntry[] = resumePages.map((page) => {
    const props = page.properties;
    return {
      product: getSelect(props, "Product") ?? getTitle(props, "Name", "Product") ?? "Unknown",
      autoSummary: getRichText(props, "Auto summary", "Summary"),
      nextInQueue: getRichText(props, "Next in queue"),
      completedToday: getRichText(props, "Completed today"),
      lastShipped: getRichText(props, "Last shipped"),
    };
  });

  const projects: NotionProject[] = projectPages.map((page) => {
    const props = page.properties;
    return {
      name: getTitle(props, "Name", "Project") ?? "(untitled)",
      product: getSelect(props, "Product"),
      linearUrl: getUrl(props, "Linear project", "Linear"),
    };
  });

  return { now, workQueue, resume, projects };
}
