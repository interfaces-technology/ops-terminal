#!/usr/bin/env node
/**
 * Sync GitHub PR state → linked Notion task(s).
 * Runs in GitHub Actions only (NOTION_API_KEY secret). Not part of the Next.js app runtime.
 *
 * Task data-source IDs must stay aligned with src/lib/config.ts → NOTION_TASK_DATABASES.
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

/** @type {Record<string, string>} */
const NOTION_TASK_DATABASES = {
  company: "457df3e3-e319-83e5-aba1-072729c80d16",
  studio: "45c4b046-9706-479f-b1d5-aca9d0f9cb2b",
  lab: "395df3e3-e319-8009-8795-000b18707036",
  play: "df1df3e3-e319-83ea-960f-8761a776db8b",
  workbench: "162df3e3-e319-83e3-a2e7-074f84c57827",
};

const NOTION_URL_RE =
  /https?:\/\/(?:www\.)?(?:notion\.so|notion\.site|app\.notion\.com)\/[^\s)>\]"']+/gi;

const PAGE_ID_RE =
  /(?:(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|(?:[0-9a-f]{32}))/i;

/**
 * @param {string} raw
 * @returns {string | null}
 */
function normalizePageId(raw) {
  const hex = raw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
function extractNotionPageIds(text) {
  if (!text) return [];
  const ids = new Set();
  const urls = text.match(NOTION_URL_RE) ?? [];
  for (const url of urls) {
    const match = url.match(PAGE_ID_RE);
    if (!match) continue;
    const id = normalizePageId(match[0]);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * @param {{ draft?: boolean; state?: string; merged?: boolean; merged_at?: string | null }} pr
 * @param {string} action
 * @returns {"Open" | "Draft" | "Ready" | "Merged" | "Closed"}
 */
function mapPrStatus(pr, action) {
  if (pr.merged || pr.merged_at) return "Merged";
  if (pr.state === "closed") return "Closed";
  if (pr.draft) return "Draft";
  if (action === "ready_for_review") return "Ready";
  return "Open";
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max = 1900) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/**
 * @param {string} content
 */
function richText(content) {
  return {
    rich_text: content
      ? [{ type: "text", text: { content: truncate(content) } }]
      : [],
  };
}

function getApiKey() {
  const key = process.env.NOTION_API_KEY ?? process.env.NOTION_API_TOKEN;
  if (!key) {
    throw new Error("NOTION_API_KEY is not set (configure as a GitHub Actions secret)");
  }
  return key;
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function notionFetch(path, init = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const bodyText = await res.text();
  /** @type {unknown} */
  let json = null;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    json = bodyText;
  }
  if (!res.ok) {
    throw new Error(`Notion API ${init.method ?? "GET"} ${path}: ${res.status} ${bodyText}`);
  }
  return json;
}

/**
 * @param {string} dataSourceId
 * @param {Record<string, unknown>} filter
 */
async function queryDataSource(dataSourceId, filter) {
  /** @type {Array<{ id: string; properties?: Record<string, unknown> }>} */
  const pages = [];
  /** @type {string | undefined} */
  let cursor;
  do {
    /** @type {Record<string, unknown>} */
    const payload = {
      page_size: 100,
      filter,
    };
    if (cursor) payload.start_cursor = cursor;
    const json = /** @type {{ results: typeof pages; has_more: boolean; next_cursor: string | null }} */ (
      await notionFetch(`/data_sources/${dataSourceId}/query`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    pages.push(...json.results);
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

/**
 * @param {string} prUrl
 * @param {string} repoUrl
 */
async function findTasksByPrOrRepo(prUrl, repoUrl) {
  /** @type {Map<string, { id: string }>} */
  const found = new Map();

  const prFilter = {
    property: "PR",
    url: { equals: prUrl },
  };

  for (const [space, dataSourceId] of Object.entries(NOTION_TASK_DATABASES)) {
    try {
      const byPr = await queryDataSource(dataSourceId, prFilter);
      for (const page of byPr) {
        found.set(page.id, page);
      }
    } catch (err) {
      console.warn(`[warn] PR filter query failed for ${space}:`, err instanceof Error ? err.message : err);
    }
  }

  if (found.size > 0) return [...found.values()];

  // Secondary fallback: exact Repo URL + empty PR (only if a single candidate across spaces)
  const repoFilter = {
    and: [
      { property: "Repo", url: { equals: repoUrl } },
      { property: "PR", url: { is_empty: true } },
    ],
  };

  /** @type {Array<{ id: string }>} */
  const repoCandidates = [];
  for (const [space, dataSourceId] of Object.entries(NOTION_TASK_DATABASES)) {
    try {
      const byRepo = await queryDataSource(dataSourceId, repoFilter);
      repoCandidates.push(...byRepo);
    } catch (err) {
      console.warn(`[warn] Repo filter query failed for ${space}:`, err instanceof Error ? err.message : err);
    }
  }

  if (repoCandidates.length === 1) {
    console.log(`Repo fallback matched single task ${repoCandidates[0].id}`);
    return repoCandidates;
  }

  if (repoCandidates.length > 1) {
    console.warn(
      `[warn] Repo fallback found ${repoCandidates.length} tasks with empty PR — skipping ambiguous match`,
    );
  }

  return [];
}

/**
 * @param {string} pageId
 * @param {Record<string, unknown>} properties
 */
async function patchPage(pageId, properties) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

/**
 * @returns {Promise<{
 *   action: string;
 *   pull_request: {
 *     html_url: string;
 *     number: number;
 *     title: string;
 *     body: string | null;
 *     draft: boolean;
 *     merged: boolean;
 *     merged_at: string | null;
 *     state: string;
 *     head: { ref: string };
 *   };
 *   repository: { html_url: string; full_name: string };
 * }>}
 */
async function loadEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(eventPath, "utf8"));
  }

  // Local / manual: SYNC_PR_EVENT_JSON or individual env vars
  if (process.env.SYNC_PR_EVENT_JSON) {
    return JSON.parse(process.env.SYNC_PR_EVENT_JSON);
  }

  const prUrl = process.env.PR_URL;
  const repoUrl = process.env.REPO_URL;
  const branch = process.env.PR_BRANCH ?? "unknown";
  const title = process.env.PR_TITLE ?? "Manual sync";
  const body = process.env.PR_BODY ?? "";
  const action = process.env.PR_ACTION ?? "edited";
  const draft = process.env.PR_DRAFT === "true";
  const merged = process.env.PR_MERGED === "true";
  const state = process.env.PR_STATE ?? (merged ? "closed" : "open");

  if (!prUrl || !repoUrl) {
    throw new Error(
      "No GITHUB_EVENT_PATH / SYNC_PR_EVENT_JSON; set PR_URL and REPO_URL for manual runs",
    );
  }

  const numberMatch = prUrl.match(/\/pull\/(\d+)/);
  return {
    action,
    pull_request: {
      html_url: prUrl,
      number: numberMatch ? Number(numberMatch[1]) : 0,
      title,
      body,
      draft,
      merged,
      merged_at: merged ? new Date().toISOString() : null,
      state,
      head: { ref: branch },
    },
    repository: {
      html_url: repoUrl,
      full_name: repoUrl.replace(/^https?:\/\/github\.com\//, ""),
    },
  };
}

async function main() {
  const event = await loadEvent();
  const pr = event.pull_request;
  if (!pr) {
    console.log("No pull_request on event — skipping");
    return;
  }

  const action = event.action ?? "edited";
  const repoUrl = event.repository?.html_url ?? pr.html_url.split("/pull/")[0];
  const prStatus = mapPrStatus(pr, action);
  const syncedAt = new Date().toISOString();
  const summary = truncate(
    [
      `PR #${pr.number} · ${prStatus}`,
      pr.title,
      `Action: ${action}`,
      `Branch: ${pr.head?.ref ?? "?"}`,
      `Synced: ${syncedAt}`,
    ].join(" · "),
  );

  /** @type {string[]} */
  let pageIds = extractNotionPageIds(pr.body);

  if (pageIds.length === 0) {
    console.log("No Notion URL in PR body — falling back to PR/Repo property match");
    const matches = await findTasksByPrOrRepo(pr.html_url, repoUrl);
    pageIds = matches.map((p) => p.id);
  }

  if (pageIds.length === 0) {
    console.log("No linked Notion task found — nothing to sync");
    return;
  }

  /** @type {Record<string, unknown>} */
  const properties = {
    PR: { url: pr.html_url },
    Repo: { url: repoUrl },
    Branch: richText(pr.head?.ref ?? ""),
    "PR status": { select: { name: prStatus } },
    "Implementation summary": richText(summary),
    "Last synced at": { date: { start: syncedAt } },
  };

  if (prStatus === "Merged") {
    properties.Status = { status: { name: "Done" } };
    properties["Next action"] = richText("");
  } else if (prStatus !== "Closed") {
    properties.Status = { status: { name: "Review" } };
  }

  console.log(`Syncing ${pageIds.length} Notion page(s) for ${pr.html_url} (${prStatus})`);

  for (const pageId of pageIds) {
    await patchPage(pageId, properties);
    console.log(`Updated ${pageId}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
