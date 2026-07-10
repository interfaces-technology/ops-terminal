import { NOTION_DATABASES, NOTION_TASK_DATABASES } from "@/lib/config";
import {
  getDate,
  getFormulaNumber,
  getNumber,
  getRelationUrls,
  getRichText,
  getRollupNumber,
  getSelect,
  getStatus,
  getTitle,
  getUrl,
} from "@/lib/notion/parse";
import type {
  NotionHorizonItem,
  NotionMilestone,
  NotionProject,
  NotionShipLogEntry,
  NotionTask,
  TaskSpace,
} from "@/types/ops";

import { NOTION_API, notionHeaders } from "@/lib/notion/auth";

interface NotionPage {
  id: string;
  url?: string;
  properties: Record<string, Record<string, unknown>>;
}

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

const DATABASE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(NOTION_DATABASES).map(([name, id]) => [id, name]),
  ),
  ...Object.fromEntries(
    Object.entries(NOTION_TASK_DATABASES).map(([name, id]) => [id, `tasks:${name}`]),
  ),
};

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

function pageUrl(page: NotionPage): string {
  return page.url ?? `https://notion.so/${page.id.replace(/-/g, "")}`;
}

function isNowStatus(status: string | null): boolean {
  return status?.toLowerCase() === "now";
}

function isActivePhase(phase: string | null, status: string | null): boolean {
  if (phase?.toLowerCase() === "active") return true;
  if (status?.toLowerCase() === "active" || status?.toLowerCase() === "in progress") return true;
  return false;
}

export function isActiveNotionProject(project: NotionProject): boolean {
  return isActivePhase(project.phase, project.status);
}

function normalizeProgressPercent(value: number | null): number | null {
  if (value == null) return null;
  if (value <= 1) return Math.round(value * 100);
  return Math.round(value);
}

function mapTaskPage(page: NotionPage, space: TaskSpace): NotionTask {
  const props = page.properties;
  return {
    name: getTitle(props, "Task name", "Name", "Title") ?? "(untitled)",
    status: getStatus(props, "Status") ?? "Not started",
    type: getSelect(props, "Type"),
    product: getSelect(props, "Product"),
    url: pageUrl(page),
    priority: getSelect(props, "Priority"),
    repo: getUrl(props, "Repo"),
    pr: getUrl(props, "PR"),
    prStatus: getSelect(props, "PR status"),
    branch: getRichText(props, "Branch"),
    implementationSummary: getRichText(props, "Implementation summary"),
    testResults: getRichText(props, "Test results"),
    nextAction: getRichText(props, "Next action"),
    lastSyncedAt: getDate(props, "Last synced at"),
    agentPrompt: getRichText(props, "Agent prompt"),
    space,
  };
}

const PRIORITY_RANK: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function sortTasksForToday(tasks: NotionTask[]): NotionTask[] {
  return [...tasks].sort((a, b) => {
    const rankA = PRIORITY_RANK[a.priority ?? ""] ?? 9;
    const rankB = PRIORITY_RANK[b.priority ?? ""] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}

export function isOpenTask(task: NotionTask): boolean {
  const status = task.status.toLowerCase();
  return status !== "done" && status !== "archived";
}

export function isInProgressTask(task: NotionTask): boolean {
  const status = task.status.toLowerCase();
  return status === "in progress" || status === "review";
}

const REVIEW_PR_STATUSES = new Set(["open", "draft", "ready"]);

/** Notion-only review queue: PR set, Status Review, or active PR status. */
export function isReviewQueueTask(task: NotionTask): boolean {
  if (task.pr) return true;
  const status = task.status.toLowerCase();
  if (status === "review" || status === "in review") return true;
  const prStatus = task.prStatus?.toLowerCase();
  return prStatus != null && REVIEW_PR_STATUSES.has(prStatus);
}

async function fetchProjects(): Promise<NotionProject[]> {
  const pages = await notionQuery(NOTION_DATABASES.projects);

  return pages
    .map((page) => {
      const props = page.properties;
      const phase = getSelect(props, "Phase");
      const status = getStatus(props, "Status");

      return {
        name: getTitle(props, "Project name", "Name", "Project") ?? "(untitled)",
        product: getSelect(props, "Product", "Area"),
        area: getSelect(props, "Area"),
        phase,
        status,
        outcome: getRichText(props, "Outcome"),
        url: pageUrl(page),
        linkUrl: getUrl(props, "Linear project", "Linear", "URL", "Link"),
        priority: getSelect(props, "Priority"),
        target: getDate(props, "End date", "Target", "Due", "Start date"),
        progress: normalizeProgressPercent(
          getFormulaNumber(props, "Progress %", "Progress") ??
            getRollupNumber(props, "Progress %", "Progress") ??
            getNumber(props, "Progress %", "Progress"),
        ),
      };
    })
    .filter((project) => project.name !== "(untitled)");
}

async function fetchHorizon(): Promise<NotionHorizonItem[]> {
  const pages = await notionQuery(NOTION_DATABASES.horizon, {
    filter: {
      property: "Status",
      select: { equals: "Now" },
    },
    sorts: [{ property: "Target", direction: "ascending" }],
  });

  const items: NotionHorizonItem[] = [];

  for (const page of pages) {
    const props = page.properties;
    const status = getStatus(props, "Status");
    if (!isNowStatus(status)) continue;

    items.push({
      aim: getTitle(props, "Item", "Name", "Title") ?? "(untitled)",
      area: getSelect(props, "Area", "Product"),
      target: getDate(props, "Target"),
      url: pageUrl(page),
      linkUrl: getUrl(props, "Linear initiative", "Linear Initiative", "Linear", "URL", "Link"),
    });
  }

  return items;
}

async function fetchMilestones(): Promise<NotionMilestone[]> {
  const pages = await notionQuery(NOTION_DATABASES.milestones, {
    sorts: [{ property: "Target date", direction: "ascending" }],
  });

  const milestones: NotionMilestone[] = [];

  for (const page of pages) {
    const props = page.properties;
    const name = getTitle(props, "Milestone", "Name", "Title") ?? "(untitled)";
    if (name === "(untitled)") continue;

    const horizonUrls = getRelationUrls(props, "Horizon");

    milestones.push({
      name,
      status: getStatus(props, "Status") ?? "—",
      product: getSelect(props, "Product"),
      url: pageUrl(page),
      targetDate: getDate(props, "Target date", "Target", "Due"),
      horizonUrl: horizonUrls[0] ?? null,
    });
  }

  return milestones;
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
      linkUrl: getUrl(props, "Linear", "Linear URL", "URL", "Link"),
    };
  });
}

async function fetchTasksForSpace(space: TaskSpace, databaseId: string): Promise<NotionTask[]> {
  const pages = await notionQuery(databaseId);
  return pages.map((page) => mapTaskPage(page, space));
}

async function fetchAllTasks(): Promise<{ tasks: NotionTask[]; errors: string[] }> {
  const entries = Object.entries(NOTION_TASK_DATABASES) as [TaskSpace, string][];
  const results = await Promise.allSettled(
    entries.map(([space, id]) => fetchTasksForSpace(space, id)),
  );

  const tasks: NotionTask[] = [];
  const errors: string[] = [];

  for (const [index, result] of results.entries()) {
    const space = entries[index]?.[0] ?? "company";
    if (result.status === "fulfilled") {
      tasks.push(...result.value);
      continue;
    }
    errors.push(
      `tasks:${space}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
    );
  }

  return { tasks, errors };
}

export async function fetchNotionData(): Promise<{
  horizon: NotionHorizonItem[];
  milestones: NotionMilestone[];
  notionProjects: NotionProject[];
  tasks: NotionTask[];
  shipLog: NotionShipLogEntry[];
  errors: string[];
}> {
  const [
    horizonResult,
    milestonesResult,
    projectsResult,
    tasksResult,
    shipLogResult,
  ] = await Promise.allSettled([
    fetchHorizon(),
    fetchMilestones(),
    fetchProjects(),
    fetchAllTasks(),
    fetchShipLog(),
  ]);

  const errors: string[] = [];
  const label = (result: PromiseSettledResult<unknown>, name: string) => {
    if (result.status === "rejected") {
      errors.push(`${name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  };

  label(horizonResult, "Horizon");
  label(milestonesResult, "Milestones");
  label(projectsResult, "Projects");
  label(tasksResult, "Tasks");
  label(shipLogResult, "Ship Log");

  const tasks =
    tasksResult.status === "fulfilled"
      ? tasksResult.value.tasks
      : [];

  if (tasksResult.status === "fulfilled") {
    for (const message of tasksResult.value.errors) {
      errors.push(message);
    }
  }

  return {
    horizon: horizonResult.status === "fulfilled" ? horizonResult.value : [],
    milestones: milestonesResult.status === "fulfilled" ? milestonesResult.value : [],
    notionProjects: projectsResult.status === "fulfilled" ? projectsResult.value : [],
    tasks,
    shipLog: shipLogResult.status === "fulfilled" ? shipLogResult.value : [],
    errors,
  };
}
