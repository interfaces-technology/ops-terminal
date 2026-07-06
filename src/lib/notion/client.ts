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

import { NOTION_API, notionHeaders } from "@/lib/notion/auth";

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
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(`${NOTION_API}/data_sources/${databaseId}/query`, {
      method: "POST",
      headers: {
        ...notionHeaders(),
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
          `Notion database "${label}" not found — check the ID in config.ts or confirm your account can open it in Notion`,
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
      property: "Status",
      select: { equals: "Now" },
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
  errors: string[];
}> {
  const emptyFocus: NotionFocus = {
    slots: [],
    lastSession: null,
    notes: null,
    thisWeek: null,
  };

  const [focusResult, horizonResult, projectsResult, shipLogResult] = await Promise.allSettled([
    fetchFocusPage(),
    fetchHorizon(),
    fetchActiveProjects(),
    fetchShipLog(),
  ]);

  const errors: string[] = [];
  const label = (result: PromiseSettledResult<unknown>, name: string) => {
    if (result.status === "rejected") {
      errors.push(`${name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  };

  label(focusResult, "Focus");
  label(horizonResult, "Horizon");
  label(projectsResult, "Projects");
  label(shipLogResult, "Ship Log");

  return {
    focus: focusResult.status === "fulfilled" ? focusResult.value : emptyFocus,
    horizon: horizonResult.status === "fulfilled" ? horizonResult.value : [],
    notionProjects: projectsResult.status === "fulfilled" ? projectsResult.value : [],
    shipLog: shipLogResult.status === "fulfilled" ? shipLogResult.value : [],
    errors,
  };
}
