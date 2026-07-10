import { readCache, writeCache } from "@/lib/cache/store";
import { REVIEW_QUEUE_TASK_LIMIT, TODAY_TASK_LIMIT } from "@/lib/config";
import {
  fetchNotionData,
  isInProgressTask,
  isReviewQueueTask,
  sortTasksForToday,
} from "@/lib/notion/client";
import type { OpsSnapshot } from "@/types/ops";

function emptySnapshot(): OpsSnapshot {
  return {
    syncedAt: new Date().toISOString(),
    today: [],
    reviewQueue: [],
    horizon: [],
    milestones: [],
    notionProjects: [],
    tasks: [],
    shipLog: [],
    errors: [],
  };
}

export async function syncOpsState(): Promise<OpsSnapshot> {
  const snapshot = emptySnapshot();

  try {
    const data = await fetchNotionData();
    snapshot.horizon = data.horizon;
    snapshot.milestones = data.milestones;
    snapshot.notionProjects = data.notionProjects;
    snapshot.tasks = data.tasks;
    snapshot.shipLog = data.shipLog;
    snapshot.today = sortTasksForToday(data.tasks.filter(isInProgressTask)).slice(
      0,
      TODAY_TASK_LIMIT,
    );
    snapshot.reviewQueue = sortTasksForToday(data.tasks.filter(isReviewQueueTask)).slice(
      0,
      REVIEW_QUEUE_TASK_LIMIT,
    );
    for (const message of data.errors) {
      snapshot.errors.push(`Notion: ${message}`);
    }
  } catch (err: unknown) {
    snapshot.errors.push(`Notion: ${err instanceof Error ? err.message : String(err)}`);
  }

  await writeCache(snapshot);
  return snapshot;
}

function isValidSnapshot(snapshot: OpsSnapshot): boolean {
  return (
    Array.isArray(snapshot.today) &&
    Array.isArray(snapshot.reviewQueue) &&
    Array.isArray(snapshot.horizon) &&
    Array.isArray(snapshot.milestones) &&
    Array.isArray(snapshot.notionProjects) &&
    Array.isArray(snapshot.tasks) &&
    Array.isArray(snapshot.shipLog) &&
    !("focus" in snapshot)
  );
}

export async function getOpsState(forceSync = false): Promise<OpsSnapshot> {
  if (forceSync) {
    return syncOpsState();
  }

  const cached = await readCache();
  if (cached && isValidSnapshot(cached)) {
    if (cached.errors.length > 0) return syncOpsState();
    return cached;
  }

  return syncOpsState();
}
