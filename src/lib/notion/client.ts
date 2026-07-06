import { NOTION_DATABASES } from "@/lib/config";
import { fetchFocusPage } from "@/lib/notion/focus";
import {
  getDate,
  getRichText,
  getSelect,
  getStatus,
  getTitle,
  getUrl,
} from "@/lib/notion/parse";
import type {
  NotionFocus,
  NotionHorizonItem,
  NotionProject,
  NotionShipLogEntry,
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

async function notionQuery(
  databaseId: string,
  body: Record<string, unknown> = {},
): Promise<NotionPage[]> {
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
        ...body,
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const responseBody = await res.text();
      const label = DATABASE_LABELS[databaseId] ?? databaseId;
      if (res.status === 404) {
        throw new Error(
          `Notion database "${label}" not found or not shared with your integration — open it in Notion → ••• → Connections → add "ops-terminal"`,
        );
      }
      throw new Error(`Notion API error (${label}): ${res.status} ${responseBody}`);
    }

    const json = (await res.json()) as QueryResponse;
    pages.push(...json.results);
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

function isNowStatus(status: string | null): boolean {
  return status?.toLowerCase() === "now";
}

function isActivePhase(phase: string | null, status: string | null): boolean {
  if (phase?.toLowerCase() === "active") return true;
  if (status?.toLowerCase() === "active" || status?.toLowerCase() === "in progress") return true;
  return false;
}

async function fetchHorizon(): Promise<NotionHorizonItem[]> {
  const pages = await notionQuery(NOTION_DATABASES.horizon, {
    filter: {
      or: [
        { property: "Status", status: { equals: "Now" } },
        { property: "Status", select: { equals: "Now" } },
      ],
    },
    sorts: [{ property: "Target", direction: "ascending" }],
  });

  return pages
    .map((page) => {
      const props = page.properties;
      const status = getStatus(props, "Status");
      if (!isNowStatus(status)) return null;

      return {
        aim: getTitle(props, "Item", "Name", "Title") ?? "(untitled)",
        area: getSelect(props, "Area", "Product"),
        target: getDate(props, "Target"),
        linearInitiativeUrl: getUrl(props, "Linear initiative", "Linear Initiative", "Linear"),
      };
    })
    .filter((item): item is NotionHorizonItem => item !== null);
}

async function fetchActiveProjects(): Promise<NotionProject[]> {
  const pages = await notionQuery(NOTION_DATABASES.projects);

  return pages
    .map((page) => {
      const props = page.properties;
      const phase = getSelect(props, "Phase");
      const status = getStatus(props, "Status");

      if (!isActivePhase(phase, status)) return null;

      return {
        name: getTitle(props, "Project name", "Name", "Project") ?? "(untitled)",
        product: getSelect(props, "Product", "Area"),
        phase: phase ?? status,
        outcome: getRichText(props, "Outcome"),
        linearUrl: getUrl(props, "Linear project", "Linear"),
      };
    })
    .filter((project): project is NotionProject => project !== null);
}

async function fetchShipLog(): Promise<NotionShipLogEntry[]> {
  const pages = await notionQuery(NOTION_DATABASES.shipLog, {
    sorts: [{ property: "Date", direction: "descending" }],
  });

  return pages.slice(0, 7).map((page) => {
    const props = page.properties;
    return {
      title: getTitle(props, "Ship", "Name", "Title") ?? "(untitled)",
      product: getSelect(props, "Product"),
      date: getDate(props, "Date"),
      summary: getRichText(props, "Summary"),
      linearUrl: getUrl(props, "Linear", "Linear URL"),
    };
  });
}

export async function fetchNotionData(): Promise<{
  focus: NotionFocus;
  horizon: NotionHorizonItem[];
  notionProjects: NotionProject[];
  shipLog: NotionShipLogEntry[];
}> {
  const [focus, horizon, notionProjects, shipLog] = await Promise.all([
    fetchFocusPage(),
    fetchHorizon(),
    fetchActiveProjects(),
    fetchShipLog(),
  ]);

  return { focus, horizon, notionProjects, shipLog };
}
